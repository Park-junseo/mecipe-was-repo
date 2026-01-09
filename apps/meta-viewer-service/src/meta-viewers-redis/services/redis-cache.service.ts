import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ClientMessage } from '../interface/broadcast-data-type';
import { createClient, RedisClientType } from 'redis';

export enum CacheTypeFlag {
  JOIN_EVENT = 1, // 방 입장 시 전송될 이벤트
  LEAVE_EVENT = 1 << 2, // 방 퇴장 시 전송될 이벤트
  RECORD_EVERY = 1 << 3, // 모든 레코드 기록 모드
  NON_VOLATILE = 1 << 4, // 비휘발성 모드
}

/**
 * Redis 기반 메시지 캐시 서비스
 * 레플리카셋 환경에서 공유 메시지 캐시 제공
 * 캐시 타입별로 다른 저장 전략 사용:
 * - 단일 메시지 (덮어쓰기): Redis String
 * - 다중 메시지 (RECORD_EVERY): Redis Sorted Set
 */
@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly redis: RedisClientType;
  private readonly cacheTypeMap = new Map<string, CacheTypeFlag>();
  private readonly defaultTtl = 3600; // 1시간 (초)
  private readonly maxCacheSize = 1000; // RECORD_EVERY 모드 최대 캐시 크기

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
        this.logger.error(`[Redis Cache] Connection Error: ${err.message || String(err)}`, err.stack);
      }
    });

    this.redis.on('connect', () => {
      this.logger.log('[Redis Cache] Connected to Redis');
    });

    this.redis.on('reconnecting', () => {
      this.logger.warn(`[Redis Cache] Redis(${redisUrl}) reconnecting...`);
    });
    
    this.redis.on('ready', () => {
      this.logger.log('[Redis Cache] Redis ready');
    });

    this.redis.connect().catch((err) => {
      this.logger.error(`[Redis Cache] Failed to connect to Redis: ${err.message}`, err.stack);
    });
  }

  /**
   * 캐시 타입 선언
   */
  declareCacheType(type: string, options: CacheTypeFlag): this {
    this.cacheTypeMap.set(type, options);
    this.logger.log(`[Redis Cache] Cache type declared: ${type} (flags: ${options})`);
    return this;
  }

  /**
   * 메시지 캐시 저장
   * 캐시 타입에 따라 다른 저장 전략 사용
   */
  async setMessageCache(
    clientId: string,
    roomId: string,
    type: string,
    data: ClientMessage,
  ): Promise<void> {
    const cacheType = this.cacheTypeMap.get(type);
    if (cacheType === undefined) {
      return; // 캐시 타입이 선언되지 않은 경우 무시
    }

    const startTime = Date.now();

    try {
      if (cacheType & CacheTypeFlag.RECORD_EVERY) {
        // 다중 메시지 모드: Sorted Set 사용
        await this.setMessageCacheRecordEvery(clientId, roomId, type, data);
      } else {
        // 단일 메시지 모드: String 사용 (덮어쓰기)
        await this.setMessageCacheSingle(clientId, roomId, type, data);
      }

      const duration = Date.now() - startTime;
      this.logger.debug(
        `[Redis Cache] Cached message for client '${clientId}' in room '${roomId}' (type: ${type}, duration: ${duration}ms)`,
      );
    } catch (error: any) {
      this.logger.error(
        `[Redis Cache] Failed to cache message for client '${clientId}' in room '${roomId}' (type: ${type}): ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 단일 메시지 캐시 저장 (덮어쓰기 모드)
   */
  private async setMessageCacheSingle(
    clientId: string,
    roomId: string,
    type: string,
    data: ClientMessage,
  ): Promise<void> {
    const key = this.getCacheKey(roomId, clientId, type);
    await this.redis.setEx(key, this.defaultTtl, JSON.stringify(data));
  }

  /**
   * 다중 메시지 캐시 저장 (RECORD_EVERY 모드)
   */
  private async setMessageCacheRecordEvery(
    clientId: string,
    roomId: string,
    type: string,
    data: ClientMessage,
  ): Promise<void> {
    const key = this.getCacheKey(roomId, clientId, type, 'messages');
    const score = data.timestamp;

    // Sorted Set에 추가
    await this.redis.zAdd(key, {
      score,
      value: JSON.stringify(data),
    });

    // 최대 크기 제한 (오래된 메시지 삭제)
    const count = await this.redis.zCard(key);
    if (count > this.maxCacheSize) {
      const removeCount = count - this.maxCacheSize;
      await this.redis.zRemRangeByRank(key, 0, removeCount - 1);
      this.logger.debug(
        `[Redis Cache] Trimmed ${removeCount} old messages from cache (room: ${roomId}, client: ${clientId}, type: ${type})`,
      );
    }

    // TTL 설정
    await this.redis.expire(key, this.defaultTtl);
  }

  /**
   * 방 입장 시 캐시된 메시지 풀 조회
   */
  async getJoinEventMessages(roomId: string): Promise<ClientMessage[]> {
    const messagePool: ClientMessage[] = [];

    for (const [type, cacheType] of this.cacheTypeMap.entries()) {
      if (cacheType & CacheTypeFlag.JOIN_EVENT) {
        const messages = await this.getRoomMessagesByType(roomId, type, cacheType);
        messagePool.push(...messages);
      }
    }

    this.logger.debug(
      `[Redis Cache] Retrieved ${messagePool.length} cached messages for JOIN event in room '${roomId}'`,
    );

    return messagePool;
  }

  /**
   * 방 퇴장 시 캐시된 메시지 풀 조회 및 정리
   */
  async getLeaveEventMessages(
    clientId: string,
    roomId: string,
  ): Promise<ClientMessage[]> {
    const messagePool: ClientMessage[] = [];

    for (const [type, cacheType] of this.cacheTypeMap.entries()) {
      if (cacheType & CacheTypeFlag.LEAVE_EVENT) {
        const messages = await this.getClientMessagesByType(roomId, clientId, type, cacheType);
        messagePool.push(...messages);

        // NON_VOLATILE이 아닌 경우 캐시 정리
        if (!(cacheType & CacheTypeFlag.NON_VOLATILE)) {
          await this.clearClientCache(roomId, clientId, type);
        } else {
          this.logger.warn(
            `[Redis Cache] Message cache maintained (NON_VOLATILE): ${type} for client '${clientId}' in room '${roomId}'`,
          );
        }
      }
    }

    this.logger.debug(
      `[Redis Cache] Retrieved ${messagePool.length} cached messages for LEAVE event (client: ${clientId}, room: ${roomId})`,
    );

    return messagePool;
  }

  /**
   * 룸의 모든 클라이언트의 특정 타입 메시지 조회 (JOIN_EVENT용)
   */
  private async getRoomMessagesByType(
    roomId: string,
    type: string,
    cacheType: CacheTypeFlag,
  ): Promise<ClientMessage[]> {
    // RECORD_EVERY 모드는 'messages' suffix가 있음
    const suffix = cacheType & CacheTypeFlag.RECORD_EVERY ? 'messages' : undefined;
    const basePattern = this.getCacheKey(roomId, '*', type, suffix);
    const keys = await this.redis.keys(basePattern);

    if (keys.length === 0) {
      return [];
    }

    const allMessages: ClientMessage[] = [];

    if (cacheType & CacheTypeFlag.RECORD_EVERY) {
      // Sorted Set에서 모든 메시지 조회
      for (const key of keys) {
        const messages = await this.redis.zRange(key, 0, -1);
        for (const messageJson of messages) {
          try {
            allMessages.push(JSON.parse(messageJson) as ClientMessage);
          } catch (error: any) {
            this.logger.error(`[Redis Cache] Failed to parse cached message: ${error.message}`);
          }
        }
      }
    } else {
      // String에서 단일 메시지 조회
      const values = await this.redis.mGet(keys);
      for (const value of values) {
        if (value) {
          try {
            allMessages.push(JSON.parse(value) as ClientMessage);
          } catch (error: any) {
            this.logger.error(`[Redis Cache] Failed to parse cached message: ${error.message}`);
          }
        }
      }
    }

    return allMessages;
  }

  /**
   * 특정 클라이언트의 특정 타입 메시지 조회 (LEAVE_EVENT용)
   */
  private async getClientMessagesByType(
    roomId: string,
    clientId: string,
    type: string,
    cacheType: CacheTypeFlag,
  ): Promise<ClientMessage[]> {
    if (cacheType & CacheTypeFlag.RECORD_EVERY) {
      const key = this.getCacheKey(roomId, clientId, type, 'messages');
      const messages = await this.redis.zRange(key, 0, -1);
      return messages.map((msg) => JSON.parse(msg) as ClientMessage);
    } else {
      const key = this.getCacheKey(roomId, clientId, type);
      const value = await this.redis.get(key);
      return value ? [JSON.parse(value) as ClientMessage] : [];
    }
  }

  /**
   * 클라이언트 캐시 정리
   */
  private async clearClientCache(
    roomId: string,
    clientId: string,
    type: string,
  ): Promise<void> {
    const cacheType = this.cacheTypeMap.get(type);
    if (!cacheType) return;

    if (cacheType & CacheTypeFlag.RECORD_EVERY) {
      const key = this.getCacheKey(roomId, clientId, type, 'messages');
      await this.redis.del(key);
    } else {
      const key = this.getCacheKey(roomId, clientId, type);
      await this.redis.del(key);
    }
  }

  /**
   * 클라이언트의 모든 캐시 정리
   */
  async clearMessageCache(clientId: string, roomId: string): Promise<void> {
    const pattern = this.getCacheKeyPattern(roomId, clientId, '*');
    const keys = await this.redis.keys(pattern);

    if (keys.length > 0) {
      await this.redis.del(keys);
      this.logger.debug(
        `[Redis Cache] Cleared ${keys.length} cache entries for client '${clientId}' in room '${roomId}'`,
      );
    }
  }

  /**
   * 캐시 키 생성
   */
  private getCacheKey(
    roomId: string,
    clientId: string,
    type: string,
    suffix?: string,
  ): string {
    const parts = ['cache', 'room', roomId, 'client', clientId, 'type', type];
    if (suffix) {
      parts.push(suffix);
    }
    return parts.join(':');
  }

  /**
   * 캐시 키 패턴 생성 (keys 명령용)
   */
  private getCacheKeyPattern(
    roomId: string,
    clientId: string,
    type: string,
  ): string {
    const parts = ['cache', 'room', roomId, 'client', clientId, 'type', type];
    return parts.join(':');
  }

  /**
   * Redis 연결 종료
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.redis.quit();
      this.logger.log('[Redis Cache] Redis connection closed');
    } catch (error: any) {
      this.logger.error(`[Redis Cache] Error closing Redis connection: ${error.message}`, error.stack);
    }
  }
}

