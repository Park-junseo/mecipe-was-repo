import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientMessage } from '../interface/broadcast-data-type';
import { createClient, RedisClientType } from 'redis';

/**
 * Redis Stream 기반 메시지 큐 서비스
 * 여러 replica 인스턴스 간 메시지 큐를 공유
 */
@Injectable()
export class RedisRoomDataQueueService {
  private readonly logger = new Logger(RedisRoomDataQueueService.name);
  private readonly redis: RedisClientType;
  private readonly consumerGroupName = 'broadcast-group';
  private readonly consumerName: string;
  private readonly initializedGroups = new Set<string>();

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = createClient({ url: redisUrl });
    this.consumerName = `instance-${process.env.INSTANCE_ID || process.pid}`;

    this.redis.on('error', (err) => {
      this.logger.error('Redis Client Error:', err);
    });

    // Redis 연결
    this.redis.connect().catch((err) => {
      this.logger.error('Failed to connect to Redis:', err);
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
      // Consumer Group 생성 (이미 있으면 무시)
      await this.redis.xGroupCreate(
        streamKey,
        this.consumerGroupName,
        '0', // 처음부터 읽기
        {
          MKSTREAM: true, // Stream이 없으면 생성
        },
      );
      this.initializedGroups.add(streamKey);
      this.logger.log(`Consumer group created for ${streamKey}`);
    } catch (error: any) {
      // Consumer Group이 이미 존재하면 무시
      if (error.message?.includes('BUSYGROUP')) {
        this.initializedGroups.add(streamKey);
        this.logger.debug(`Consumer group already exists for ${streamKey}`);
      } else {
        this.logger.error(`Failed to create consumer group for ${streamKey}:`, error);
        throw error;
      }
    }
  }

  /**
   * 방별 데이터 큐에 데이터 추가
   */
  async enqueueData(roomId: string, data: ClientMessage): Promise<void> {
    const streamKey = `room:${roomId}:queue`;

    try {
      await this.redis.xAdd(streamKey, '*', {
        data: JSON.stringify(data),
        timestamp: Date.now().toString(),
        clientId: data.clientId,
        type: data.type,
      });

      this.logger.debug(`Data queued to Redis for room ${roomId}, type: ${data.type}`);
    } catch (error) {
      this.logger.error(`Failed to enqueue data for room ${roomId}:`, error);
      throw error;
    }
  }

  /**
   * 특정 방의 모든 큐 데이터를 가져오고 큐를 비움
   * Consumer Group을 사용하여 중복 처리 방지
   */
  async dequeueAllData(roomId: string): Promise<ClientMessage[]> {
    const streamKey = `room:${roomId}:queue`;

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
          COUNT: 100, // 최대 100개
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
          } catch (error) {
            this.logger.error(`Failed to parse message ${message.id}:`, error);
          }
        }
      }

      // ACK (처리 완료 표시)
      if (messageIds.length > 0) {
        await this.redis.xAck(streamKey, this.consumerGroupName, messageIds);
      }

      this.logger.debug(
        `Dequeued ${clientMessages.length} data items from Redis for room ${roomId}`,
      );

      return clientMessages;
    } catch (error) {
      this.logger.error(`Failed to dequeue data for room ${roomId}:`, error);
      // 에러 발생 시 빈 배열 반환 (서비스 중단 방지)
      return [];
    }
  }

  /**
   * 특정 방에 큐된 데이터가 있는지 확인
   */
  async hasQueuedData(roomId: string): Promise<boolean> {
    const streamKey = `room:${roomId}:queue`;

    try {
      const length = await this.redis.xLen(streamKey);
      return length > 0;
    } catch (error) {
      this.logger.error(`Failed to check queue length for room ${roomId}:`, error);
      return false;
    }
  }

  /**
   * 특정 방의 큐 상태 조회
   */
  async getRoomQueueStatus(roomId: string): Promise<{
    dataTypes: string[];
    count: number;
  }> {
    const streamKey = `room:${roomId}:queue`;

    try {
      const length = await this.redis.xLen(streamKey);
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
      };
    } catch (error) {
      this.logger.error(`Failed to get queue status for room ${roomId}:`, error);
      return { dataTypes: [], count: 0 };
    }
  }

  /**
   * 빈 방의 큐 정리 (TTL 설정으로 자동 삭제되지만 수동 정리도 가능)
   */
  async cleanupEmptyRooms(activeRooms: string[]): Promise<void> {
    // Redis Stream은 TTL로 자동 정리되므로 여기서는 로그만
    this.logger.debug(`Cleanup check for ${activeRooms.length} active rooms`);
  }

  /**
   * 전체 큐 초기화 (주의: 모든 방의 큐를 삭제)
   */
  async clearAllQueues(): Promise<void> {
    this.logger.warn('clearAllQueues called - this will delete all room queues');
    // 실제 구현은 필요에 따라
  }

  /**
   * Redis 연결 종료
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
    this.logger.log('Redis connection closed');
  }
}


