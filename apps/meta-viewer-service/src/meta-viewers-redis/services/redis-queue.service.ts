import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ClientMessage } from '../interface/broadcast-data-type';
import { createClient, RedisClientType } from 'redis';

/**
 * Redis Streams 기반 메시지 큐 서비스
 * 레플리카셋 환경에서 공유 메시지 큐 제공
 * Consumer Group을 활용한 중복 처리 방지 및 메시지 순서 보장
 */
@Injectable()
export class RedisQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisQueueService.name);
  private readonly redis: RedisClientType;
  private readonly consumerGroupName = 'meta-viewer-service:broadcast-group';
  private readonly consumerName: string;
  private readonly initializedGroups = new Set<string>();
  private readonly maxBatchSize = 100; // 한 번에 읽을 최대 메시지 수
  private readonly streamMaxLength = 1000; // Stream 최대 길이 (메모리 관리)

  constructor() {
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

    this.consumerName = `instance-${process.env.INSTANCE_ID || process.pid}`;

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
        this.logger.error(`[Redis Queue] Connection Error: ${err.message || String(err)}`, err.stack);
      }
    });

    this.redis.on('connect', () => {
      this.logger.log(`[Redis Queue] Connected to Redis (Consumer: ${this.consumerName})`);
    });

    this.redis.on('reconnecting', () => {
      this.logger.warn(`[Redis Queue] Redis(${redisUrl}) reconnecting...`);
    });
    
    this.redis.on('ready', () => {
      this.logger.log(`[Redis Queue] Redis ready (Consumer: ${this.consumerName})`);
    });

    // Redis 연결
    this.redis.connect().catch((err) => {
      this.logger.error(`[Redis Queue] Failed to connect to Redis: ${err.message}`, err.stack);
    });
  }

  /**
   * Consumer Group 초기화 (한 번만 실행)
   */
  private async ensureConsumerGroup(streamKey: string): Promise<void> {
    if (this.initializedGroups.has(streamKey)) {
      return;
    }

    try {
      await this.redis.xGroupCreate(
        streamKey,
        this.consumerGroupName,
        '0', // 처음부터 읽기
        {
          MKSTREAM: true, // Stream이 없으면 생성
        },
      );
      this.initializedGroups.add(streamKey);
      this.logger.log(`[Redis Queue] Consumer group '${this.consumerGroupName}' created for ${streamKey}`);
    } catch (error: any) {
      // Consumer Group이 이미 존재하면 무시
      if (error.message?.includes('BUSYGROUP')) {
        this.initializedGroups.add(streamKey);
        // Consumer Group이 이미 존재하는 것은 정상적인 상황이므로 로그 없음
      } else {
        this.logger.error(`[Redis Queue] Failed to create consumer group for ${streamKey}: ${error.message}`, error.stack);
        throw error;
      }
    }
  }

  /**
   * 방별 데이터 큐에 데이터 추가
   * 최적화: 파이프라인 사용 가능하지만 단일 메시지이므로 현재 구조 유지
   * 타임아웃: Redis 명령 실행 타임아웃 없음으로 인한 무한 대기 방지 (5초 타임아웃)
   * - Redis 서버 부하/블로킹 시 명령이 매우 느리게 실행될 수 있음
   * - 타임아웃 없으면 joinRoom이 완료되지 않아 ACK 미전송
   */
  async enqueueData(roomId: string, data: ClientMessage): Promise<void> {
    const streamKey = `room:${roomId}:queue`;
    const startTime = Date.now();
    const timeoutMs = 5000; // 5초 타임아웃

    try {
      // 타임아웃 래퍼: Promise.race를 사용하여 최대 5초 대기
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          const isOpenOnTimeout = this.redis.isOpen;
          const isReadyOnTimeout = this.redis.isReady;
          this.logger.warn(
            `[Redis Queue] enqueueData timeout for room '${roomId}' after ${timeoutMs}ms (isOpen: ${isOpenOnTimeout}, isReady: ${isReadyOnTimeout})`,
          );
          reject(new Error(`enqueueData timeout for room '${roomId}' after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      const xAddStartTime = Date.now();
      
      // 최적화: TRIM을 별도로 실행하여 XADD 성능 향상
      // XADD만 먼저 실행하고, TRIM은 비동기로 처리
      const xAddPromise = this.redis.xAdd(
        streamKey,
        '*',
        {
          data: JSON.stringify(data),
          timestamp: data.timestamp.toString(),
          clientId: data.clientId,
          type: data.type,
        },
      ).then(async (messageId) => {
        const xAddDuration = Date.now() - xAddStartTime;
        
        // XADD가 느리면 경고
        if (xAddDuration > 1000) {
          this.logger.warn(
            `[Redis Queue] xAdd slow for room '${roomId}': ${xAddDuration}ms (messageId: ${messageId})`,
          );
        }
        
        // TRIM을 비동기로 실행 (실패해도 무시)
        this.redis
          .xTrim(streamKey, 'MAXLEN', this.streamMaxLength)
          .catch((trimError) => {
            // TRIM 실패는 경고만 (XADD는 이미 성공)
            this.logger.warn(
              `[Redis Queue] Failed to trim stream '${streamKey}': ${trimError.message}`,
            );
          });
        
        return messageId;
      }).catch((error) => {
        const xAddDuration = Date.now() - xAddStartTime;
        this.logger.error(
          `[Redis Queue] xAdd failed for room '${roomId}' (duration: ${xAddDuration}ms): ${error.message}`,
          error.stack,
        );
        throw error;
      });

      const messageId = await Promise.race([xAddPromise, timeoutPromise]);

      const duration = Date.now() - startTime;
      
      // 전체 작업이 느리면 경고
      if (duration > 1000) {
        this.logger.warn(`[Redis Queue] enqueueData slow for room '${roomId}': ${duration}ms (type: ${data.type})`);
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const isOpenAfter = this.redis.isOpen;
      const isReadyAfter = this.redis.isReady;
      
      this.logger.error(
        `[Redis Queue] Failed to enqueue data for room '${roomId}' (duration: ${duration}ms, isOpen: ${isOpenAfter}, isReady: ${isReadyAfter}): ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 특정 방의 모든 큐 데이터를 가져오고 ACK 처리
   * Consumer Group을 사용하여 중복 처리 방지
   * 최적화: 배치 읽기 및 비동기 ACK
   */
  async dequeueAllData(roomId: string): Promise<ClientMessage[]> {
    const streamKey = `room:${roomId}:queue`;
    const startTime = Date.now();

    try {
      // Consumer Group 초기화 확인
      await this.ensureConsumerGroup(streamKey);

      // Consumer Group으로 읽기 (새 메시지만)
      const messages = await this.redis.xReadGroup(
        this.consumerGroupName,
        this.consumerName,
        {
          key: streamKey,
          id: '>', // 새 메시지만 읽기
        },
        {
          COUNT: this.maxBatchSize,
          BLOCK: 0, // 즉시 반환 (블로킹 없음)
        },
      );

      if (!messages || messages.length === 0) {
        return [];
      }

      const clientMessages: ClientMessage[] = [];
      const messageIds: string[] = [];

      // 메시지 파싱
      for (const stream of messages) {
        for (const message of stream.messages) {
          try {
            const data = JSON.parse(message.message.data) as ClientMessage;
            clientMessages.push(data);
            messageIds.push(message.id);
          } catch (error: any) {
            this.logger.error(
              `[Redis Queue] Failed to parse message ${message.id} in room '${roomId}': ${error.message}`,
              error.stack,
            );
          }
        }
      }

      // ACK (처리 완료 표시) - 비동기로 처리하여 성능 최적화
      if (messageIds.length > 0) {
        // ACK는 비동기로 처리 (응답 대기하지 않음)
        this.redis.xAck(streamKey, this.consumerGroupName, messageIds).catch((err) => {
          this.logger.error(
            `[Redis Queue] Failed to ACK messages for room '${roomId}': ${err.message}`,
            err.stack,
          );
        });
      }

      const duration = Date.now() - startTime;
      
      // 느린 dequeue는 경고
      if (duration > 1000) {
        this.logger.warn(
          `[Redis Queue] dequeueAllData slow for room '${roomId}': ${duration}ms (${clientMessages.length} messages)`,
        );
      }

      return clientMessages;
    } catch (error: any) {
      this.logger.error(
        `[Redis Queue] Failed to dequeue data for room '${roomId}': ${error.message}`,
        error.stack,
      );
      // 에러 발생 시 빈 배열 반환 (서비스 중단 방지)
      return [];
    }
  }

  /**
   * 여러 방의 큐 데이터를 병렬로 가져오기 (최적화)
   */
  async dequeueMultipleRooms(roomIds: string[]): Promise<Map<string, ClientMessage[]>> {
    const results = new Map<string, ClientMessage[]>();

    if (roomIds.length === 0) {
      return results;
    }

    // 병렬 처리로 성능 최적화
    const promises = roomIds.map(async (roomId) => {
      const messages = await this.dequeueAllData(roomId);
      return { roomId, messages };
    });

    const roomResults = await Promise.allSettled(promises);

    roomResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.set(result.value.roomId, result.value.messages);
      } else {
        const roomId = roomIds[index];
        this.logger.error(
          `[Redis Queue] Failed to dequeue data for room '${roomId}': ${result.reason?.message || 'Unknown error'}`,
        );
        results.set(roomId, []);
      }
    });

    return results;
  }

  /**
   * 특정 방에 큐된 데이터가 있는지 확인
   */
  async hasQueuedData(roomId: string): Promise<boolean> {
    const streamKey = `room:${roomId}:queue`;

    try {
      const length = await this.redis.xLen(streamKey);
      return length > 0;
    } catch (error: any) {
      this.logger.error(
        `[Redis Queue] Failed to check queue length for room '${roomId}': ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * 특정 방의 큐 상태 조회
   */
  async getRoomQueueStatus(roomId: string): Promise<{
    dataTypes: string[];
    count: number;
    pendingCount: number;
  }> {
    const streamKey = `room:${roomId}:queue`;

    try {
      const [length, pendingInfo] = await Promise.all([
        this.redis.xLen(streamKey),
        this.redis.xPending(streamKey, this.consumerGroupName),
      ]);

      // Stream의 최근 메시지에서 타입 정보 추출 (성능 고려하여 제한)
      const messages = await this.redis.xRevRange(streamKey, '+', '-', {
        COUNT: 100,
      });

      const dataTypes = new Set<string>();
      messages.forEach((msg) => {
        if (msg.message.type) {
          dataTypes.add(msg.message.type);
        }
      });

      return {
        dataTypes: Array.from(dataTypes),
        count: length,
        pendingCount: pendingInfo.pending,
      };
    } catch (error: any) {
      this.logger.error(
        `[Redis Queue] Failed to get queue status for room '${roomId}': ${error.message}`,
        error.stack,
      );
      return { dataTypes: [], count: 0, pendingCount: 0 };
    }
  }

  /**
   * 빈 방의 큐 정리 (Stream 자동 정리)
   */
  async cleanupEmptyRooms(activeRooms: string[]): Promise<void> {
    // Redis Stream은 MAXLEN으로 자동 정리되므로 추가 작업 불필요
  }

  /**
   * Redis 연결 종료
   */
  async onModuleDestroy(): Promise<void> {
    try {
      // 이벤트 리스너 제거
      this.redis.removeAllListeners();
      await this.redis.quit();
      this.logger.log('[Redis Queue] Redis connection closed');
    } catch (error: any) {
      this.logger.error(`[Redis Queue] Error closing Redis connection: ${error.message}`, error.stack);
    }
  }
}

