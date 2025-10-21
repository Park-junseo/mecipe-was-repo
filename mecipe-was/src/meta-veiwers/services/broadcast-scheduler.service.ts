import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Server } from 'socket.io';
import { RoomDataQueueService } from './room-data-queue.service';
import { BroadcastData } from '../interface/broadcast-data-type';
import { ServerToClientListenerType } from '../interface/socket-event-type';

@Injectable()
export class BroadcastSchedulerService implements OnModuleDestroy {
  private readonly logger: Logger = new Logger(BroadcastSchedulerService.name);
  private broadcastInterval: NodeJS.Timeout | null = null;
  private server: Server | null = null;
  private activeRooms: Set<string> = new Set();
  private isRunning = false;

  // 브로드캐스트 통계
  private stats = {
    totalBroadcasts: 0,
    totalDataSent: 0,
    startTime: Date.now(),
  };

  constructor(
    private readonly queueService: RoomDataQueueService,
  ) {}

  /**
   * Socket.IO 서버 설정
   */
  setServer(server: Server): void {
    this.server = server;
  }

  /**
   * 활성 방 목록 업데이트
   */
  updateActiveRooms(rooms: string[]): void {
    this.activeRooms = new Set(rooms);

    // 비활성 방의 큐 정리
    this.queueService.cleanupEmptyRooms(rooms);
  }

  /**
   * 브로드캐스트 스케줄러 시작 (12ms 간격 = ~83fps)
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn('Broadcast scheduler is already running');
      return;
    }

    if (!this.server) {
      this.logger.error('Socket.IO server not set. Cannot start scheduler.');
      return;
    }

    this.isRunning = true;
    this.stats.startTime = Date.now();

    this.broadcastInterval = setInterval(() => {
      this.processBroadcast();
    }, 12); // 12ms = ~83fps

    this.logger.log('Broadcast scheduler started (12ms interval)');
  }

  /**
   * 브로드캐스트 스케줄러 중지
   */
  stop(): void {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }

    this.isRunning = false;
    this.logger.log('⏹️ Broadcast scheduler stopped');
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
    uptime: number;
    avgDataPerBroadcast: number;
    broadcastsPerSecond: number;
  } {
    const uptime = Date.now() - this.stats.startTime;
    const uptimeSeconds = uptime / 1000;

    return {
      isRunning: this.isRunning,
      totalBroadcasts: this.stats.totalBroadcasts,
      totalDataSent: this.stats.totalDataSent,
      uptime: uptime,
      avgDataPerBroadcast:
        this.stats.totalBroadcasts > 0
          ? this.stats.totalDataSent / this.stats.totalBroadcasts
          : 0,
      broadcastsPerSecond:
        uptimeSeconds > 0 ? this.stats.totalBroadcasts / uptimeSeconds : 0,
    };
  }

  /**
   * 브로드캐스트 처리 (12ms마다 실행)
   */
  private processBroadcast(): void {
    if (!this.server || this.activeRooms.size === 0) {
      return;
    }

    let totalDataSent = 0;

    // 각 활성 방에 대해 브로드캐스트 처리
    this.activeRooms.forEach((roomId) => {
      const queuedData = this.queueService.dequeueAllData(roomId);

      if (queuedData.length > 0) {
        const broadcastData: BroadcastData = {
          roomId,
          timestamp: Date.now(),
          messages: queuedData,
        };

        // 특정 방에만 브로드캐스트
        this.server!.to(roomId).emit(ServerToClientListenerType.ROOM_BROADCAST, broadcastData);

        totalDataSent += queuedData.length;

        this.logger.debug(
          `Broadcast to room ${roomId}: ${queuedData.length} data items, [${queuedData.map((data) => data.clientId).join(', ')}]`,
        );
      }
    });

    // 통계 업데이트
    if (totalDataSent > 0) {
      this.stats.totalBroadcasts++;
      this.stats.totalDataSent += totalDataSent;
    }
  }

  /**
   * 모듈 종료 시 정리
   */
  onModuleDestroy(): void {
    this.stop();
  }
}
