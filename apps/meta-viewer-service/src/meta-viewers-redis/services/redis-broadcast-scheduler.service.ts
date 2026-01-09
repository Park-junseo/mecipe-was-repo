import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Server } from 'socket.io';
import { RedisQueueService } from './redis-queue.service';
import { RedisRoomService } from './redis-room.service';
import { BroadcastData } from '../interface/broadcast-data-type';
import { ServerToClientListenerType } from '../interface/socket-event-type';
import { createClient, RedisClientType } from 'redis';

/**
 * Redis 기반 브로드캐스트 스케줄러 서비스
 * 12ms 간격으로 활성 룸의 메시지를 브로드캐스트
 * 분산 락을 사용하여 하나의 레플리카만 스케줄러 실행 (Redis 부하 감소)
 */
@Injectable()
export class RedisBroadcastSchedulerService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisBroadcastSchedulerService.name);
  private broadcastInterval: NodeJS.Timeout | null = null;
  private server: Server | null = null;
  private isRunning = false;
  private readonly broadcastIntervalMs = 12; // 12ms = ~83fps
  private readonly redis: RedisClientType;
  private readonly lockKey = 'meta-viewer-service:broadcast-scheduler:lock';
  private readonly lockTtl = 30; // 30초 (스케줄러가 죽으면 자동 해제)
  private readonly instanceId: string;
  private isLeader = false;

  // 브로드캐스트 통계
  private stats = {
    totalBroadcasts: 0,
    totalDataSent: 0,
    totalRoomsProcessed: 0,
    startTime: Date.now(),
    lastBroadcastTime: Date.now(),
  };

  constructor(
    private readonly queueService: RedisQueueService,
    private readonly roomService: RedisRoomService,
  ) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 30000, // 30초 연결 타임아웃 (초기 연결 시 더 긴 대기)
        reconnectStrategy: (retries) => {
          // 초기 연결 실패 시 더 많은 재시도 허용
          const maxRetries = 30; // 30번까지 재시도
          if (retries > maxRetries) {
            this.logger.error(`Redis reconnection failed after ${maxRetries} retries`);
            return new Error('Redis reconnection limit exceeded');
          }
          // 지수 백오프: 100ms, 200ms, 400ms, ... 최대 5초
          return Math.min(Math.pow(2, retries) * 100, 5000);
        },
      },
    });

    this.instanceId = `instance-${process.env.INSTANCE_ID || process.pid}`;

    this.redis.on('error', (err: any) => {
      // AggregateError 처리 (내부 errors 배열 확인)
      let isReconnectableError = false;
      
      if (err.name === 'AggregateError' && Array.isArray(err.errors)) {
        // AggregateError 내부의 errors 배열 확인
        isReconnectableError = err.errors.some((error: any) => {
          const errorCode = error.code || error.errno || '';
          const errorMessage = error.message || String(error);
          return (
            errorCode === 'ECONNRESET' ||
            errorCode === 'ECONNREFUSED' ||
            errorCode === -4078 ||
            errorMessage.includes('ECONNRESET') ||
            errorMessage.includes('ECONNREFUSED') ||
            errorMessage.includes('Connection')
          );
        });
      } else {
        // 일반 오류 처리
        const errorCode = err.code || err.errno || '';
        const errorMessage = err.message || String(err);
        isReconnectableError = 
          errorCode === 'ECONNRESET' ||
          errorCode === 'ECONNREFUSED' ||
          errorCode === -4078 ||
          errorMessage.includes('ECONNRESET') ||
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('Connection');
      }
      
      if (isReconnectableError) {
        // 재연결 가능한 오류는 조용히 처리 (자동 재연결 전략이 처리)
        // 로그는 최소화
      } else {
        this.logger.error(`[Broadcast Scheduler] Redis Error: ${err.message || String(err)}`, err.stack);
      }
    });

    this.redis.on('connect', () => {
      this.logger.log(`[Broadcast Scheduler] Redis connected (${this.instanceId})`);
    });

    this.redis.on('reconnecting', () => {
      this.logger.warn(`[Broadcast Scheduler] Redis(${redisUrl}) reconnecting...`);
    });
    
    this.redis.on('ready', () => {
      this.logger.log(`[Broadcast Scheduler] Redis ready (${this.instanceId})`);
    });

    // Redis 연결 (비동기, 에러는 로그만)
    this.redis.connect().catch((err) => {
      this.logger.error(`[Broadcast Scheduler] Failed to connect to Redis: ${err.message}`, err.stack);
      this.logger.warn('[Broadcast Scheduler] Will retry connection automatically...');
    });
  }

  /**
   * 분산 락 획득 시도 (SET NX EX)
   * @returns 락 획득 성공 여부
   */
  private async acquireLock(): Promise<boolean> {
    try {
      // Redis 연결 상태 확인 및 재연결 시도
      if (!this.redis.isOpen) {
        try {
          await this.redis.connect();
        } catch (connectError: any) {
          // 재연결 실패는 조용히 처리 (자동 재연결 전략이 처리)
          return false;
        }
      }

      const result = await this.redis.set(
        this.lockKey,
        this.instanceId,
        {
          NX: true, // 키가 없을 때만 설정
          EX: this.lockTtl, // TTL 설정
        },
      );
      return result === 'OK';
    } catch (error: any) {
      // AggregateError 처리 (내부 errors 배열 확인)
      let isReconnectableError = false;
      let errorCode = error.code || error.errno || '';
      let errorMessage = error.message || String(error);
      
      // AggregateError인 경우 내부 errors 확인
      if (error.name === 'AggregateError' && Array.isArray(error.errors)) {
        const hasReconnectableError = error.errors.some((err: any) => {
          const errCode = err.code || err.errno || '';
          const errMsg = err.message || String(err);
          return (
            errCode === 'ECONNRESET' ||
            errCode === 'ECONNREFUSED' ||
            errCode === -4078 ||
            errMsg.includes('ECONNRESET') ||
            errMsg.includes('ECONNREFUSED') ||
            errMsg.includes('Connection')
          );
        });
        
        if (hasReconnectableError) {
          isReconnectableError = true;
          // AggregateError의 첫 번째 오류 정보 사용
          if (error.errors.length > 0) {
            const firstError = error.errors[0];
            errorCode = firstError.code || firstError.errno || '';
            errorMessage = firstError.message || String(firstError);
          }
        }
      } else {
        // 일반 오류 처리
        isReconnectableError = 
          errorCode === 'ECONNRESET' ||
          errorCode === 'ECONNREFUSED' ||
          errorCode === -4078 || // Windows ECONNRESET/ECONNREFUSED errno
          errorMessage.includes('ECONNRESET') ||
          errorMessage.includes('read ECONNRESET') ||
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('Connection') ||
          errorMessage.includes('closed') ||
          errorMessage.includes('socket hang up');
      }
      
      if (isReconnectableError) {
        // 재연결 가능한 오류는 조용히 처리 (자동 재연결 전략이 처리)
        // 연결이 끊어진 경우 재연결 시도
        if (!this.redis.isOpen) {
          try {
            await this.redis.connect().catch(() => {
              // 재연결 실패는 조용히 처리
            });
          } catch {
            // 무시
          }
        }
        // WARN 로그는 최소화 (너무 많은 로그 방지)
        return false;
      } else {
        // 예상치 못한 오류만 ERROR로 로깅
        this.logger.error(`[Broadcast Scheduler] Failed to acquire lock: ${errorMessage}`, error.stack);
      }
      return false;
    }
  }

  /**
   * 분산 락 갱신 (TTL 연장)
   */
  private async renewLock(): Promise<boolean> {
    try {
      // 현재 값이 자신의 instanceId인지 확인하고 갱신
      const currentValue = await this.redis.get(this.lockKey);
      if (currentValue === this.instanceId) {
        await this.redis.expire(this.lockKey, this.lockTtl);
        return true;
      }
      return false;
    } catch (error: any) {
      this.logger.error(`[Broadcast Scheduler] Failed to renew lock: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * 분산 락 해제
   */
  private async releaseLock(): Promise<void> {
    try {
      const currentValue = await this.redis.get(this.lockKey);
      if (currentValue === this.instanceId) {
        await this.redis.del(this.lockKey);
        this.logger.log(`[Broadcast Scheduler] Lock released by ${this.instanceId}`);
      }
    } catch (error: any) {
      this.logger.error(`[Broadcast Scheduler] Failed to release lock: ${error.message}`, error.stack);
    }
  }

  /**
   * Socket.IO 서버 설정
   */
  setServer(server: Server): void {
    this.server = server;
    this.logger.log('[Broadcast Scheduler] Socket.IO server set');
  }

  /**
   * 브로드캐스트 스케줄러 시작
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn('[Broadcast Scheduler] Already running');
      return;
    }

    if (!this.server) {
      this.logger.error('[Broadcast Scheduler] Socket.IO server not set. Cannot start scheduler.');
      return;
    }

    this.isRunning = true;
    this.stats.startTime = Date.now();
    this.stats.lastBroadcastTime = Date.now();

    // 리더 선출 시도
    this.tryBecomeLeader();

    // 주기적으로 리더 선출 시도 및 브로드캐스트 처리
    this.broadcastInterval = setInterval(() => {
      this.tryBecomeLeader();
      if (this.isLeader) {
        this.processBroadcast().catch((error) => {
          this.logger.error(
            `[Broadcast Scheduler] Error in broadcast cycle: ${error.message}`,
            error.stack,
          );
        });
      }
    }, this.broadcastIntervalMs);

    this.logger.log(
      `[Broadcast Scheduler] Started (interval: ${this.broadcastIntervalMs}ms, ~${Math.round(1000 / this.broadcastIntervalMs)}fps)`,
    );
  }

  /**
   * 리더 선출 시도
   */
  private async tryBecomeLeader(): Promise<void> {
    // Redis 연결 상태 확인
    if (!this.redis.isOpen) {
      // 연결되지 않은 경우 연결 시도 (조용히 실패 허용)
      try {
        await this.redis.connect();
      } catch (error: any) {
        // 연결 실패는 조용히 무시 (재연결 전략이 처리)
        return;
      }
    }

    if (this.isLeader) {
      // 이미 리더인 경우 락 갱신
      const renewed = await this.renewLock();
      if (!renewed) {
        this.isLeader = false;
        this.logger.warn(`[Broadcast Scheduler] Lost leadership (${this.instanceId})`);
      }
    } else {
      // 리더가 아닌 경우 락 획득 시도
      const acquired = await this.acquireLock();
      if (acquired) {
        this.isLeader = true;
        this.logger.log(`[Broadcast Scheduler] Became leader (${this.instanceId})`);
      }
    }
  }

  /**
   * 브로드캐스트 스케줄러 중지
   */
  stop(): void {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }

    this.releaseLock().catch(() => {
      // 무시
    });

    this.isLeader = false;
    this.isRunning = false;
    this.logger.log('⏹️ [Broadcast Scheduler] Stopped');
  }

  /**
   * 스케줄러 상태 확인
   */
  isSchedulerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * 브로드캐스트 통계 조회
   */
  getStats(): {
    isRunning: boolean;
    totalBroadcasts: number;
    totalDataSent: number;
    totalRoomsProcessed: number;
    uptime: number;
    avgDataPerBroadcast: number;
    broadcastsPerSecond: number;
    avgRoomsPerBroadcast: number;
    avgLatency: number;
  } {
    const uptime = Date.now() - this.stats.startTime;
    const uptimeSeconds = uptime / 1000;

    return {
      isRunning: this.isRunning,
      totalBroadcasts: this.stats.totalBroadcasts,
      totalDataSent: this.stats.totalDataSent,
      totalRoomsProcessed: this.stats.totalRoomsProcessed,
      uptime: uptime,
      avgDataPerBroadcast:
        this.stats.totalBroadcasts > 0
          ? this.stats.totalDataSent / this.stats.totalBroadcasts
          : 0,
      broadcastsPerSecond:
        uptimeSeconds > 0 ? this.stats.totalBroadcasts / uptimeSeconds : 0,
      avgRoomsPerBroadcast:
        this.stats.totalBroadcasts > 0
          ? this.stats.totalRoomsProcessed / this.stats.totalBroadcasts
          : 0,
      avgLatency:
        this.stats.totalBroadcasts > 0
          ? (Date.now() - this.stats.lastBroadcastTime) / this.stats.totalBroadcasts
          : 0,
    };
  }

  /**
   * 브로드캐스트 처리 (12ms마다 실행, 리더만 실행)
   * 최적화: 병렬 처리 및 배치 작업
   */
  private async processBroadcast(): Promise<void> {
    if (!this.server || !this.isLeader) {
      return;
    }

    const cycleStartTime = Date.now();

    try {
      // 활성 룸 목록 조회
      const activeRooms = await this.roomService.getActiveRoomIds();

      if (activeRooms.length === 0) {
        return;
      }

      // 모든 활성 룸의 메시지를 병렬로 가져오기
      const roomMessages = await this.queueService.dequeueMultipleRooms(activeRooms);

      let totalDataSent = 0;
      let roomsWithData = 0;

      // 각 룸에 대해 브로드캐스트 처리
      for (const [roomId, messages] of roomMessages.entries()) {
        if (messages.length > 0) {
          const broadcastData: BroadcastData = {
            roomId,
            timestamp: Date.now(),
            messages,
          };

          // Socket.IO Redis Adapter를 통해 모든 레플리카의 클라이언트에게 브로드캐스트
          this.server.to(roomId).emit(
            ServerToClientListenerType.ROOM_BROADCAST,
            broadcastData,
          );

          totalDataSent += messages.length;
          roomsWithData++;

          this.logger.debug(
            `[Broadcast Scheduler] Broadcast to room '${roomId}': ${messages.length} messages from ${new Set(messages.map((m) => m.clientId)).size} clients`,
          );
        }
      }

      // 통계 업데이트
      if (totalDataSent > 0) {
        this.stats.totalBroadcasts++;
        this.stats.totalDataSent += totalDataSent;
        this.stats.totalRoomsProcessed += roomsWithData;
        this.stats.lastBroadcastTime = Date.now();

        const cycleDuration = Date.now() - cycleStartTime;
        if (cycleDuration > this.broadcastIntervalMs) {
          this.logger.warn(
            `[Broadcast Scheduler] Broadcast cycle took ${cycleDuration}ms (exceeds interval ${this.broadcastIntervalMs}ms)`,
          );
        }
      }
    } catch (error: any) {
      this.logger.error(
        `[Broadcast Scheduler] Error in broadcast process: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 모듈 종료 시 정리
   */
  async onModuleDestroy(): Promise<void> {
    this.stop();
    try {
      await this.redis.quit();
    } catch (error: any) {
      this.logger.error(`[Broadcast Scheduler] Error closing Redis connection: ${error.message}`, error.stack);
    }
  }
}

