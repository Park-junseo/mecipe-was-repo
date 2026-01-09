import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, RedisClientType } from 'redis';

/**
 * Redis Adapter configuration for Socket.IO
 * 레플리카셋 환경에서 Socket.IO 이벤트를 모든 레플리카에 브로드캐스트
 */
export async function createRedisAdapter() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  // Redis URL 로깅 (디버깅용)
  console.log(`[Redis Adapter] Connecting to Redis: ${redisUrl.replace(/:[^:@]+@/, ':****@')}`); // 비밀번호 마스킹
  console.log(`[Redis Adapter] Full Redis URL (for debugging): ${redisUrl}`);
  console.log(`[Redis Adapter] Process env check - REDIS_URL exists: ${!!process.env.REDIS_URL}`);

  const pubClient: RedisClientType = createClient({
    url: redisUrl,
    socket: {
      connectTimeout: 15000, // 15초 연결 타임아웃 (PM2 클러스터 모드에서 여러 인스턴스가 동시에 연결 시도할 수 있음)
      reconnectStrategy: (retries) => {
        // 운영 환경에서의 재연결 전략 (개발 환경에서는 거의 사용되지 않음)
        // 개발 스크립트에서 Redis가 준비될 때까지 기다리므로, 연결 실패는 예상치 못한 상황
        const maxRetries = 20; // 합리적인 재시도 횟수
        if (retries > maxRetries) {
          console.error(`[Redis Adapter] Reconnection failed after ${maxRetries} retries`);
          return new Error('Redis reconnection limit exceeded');
        }
        // 지수 백오프: 1초, 2초, 4초, ... 최대 5초
        const baseDelay = 1000;
        const maxDelay = 5000;
        const delay = Math.min(baseDelay * Math.pow(2, Math.min(retries, 2)), maxDelay);
        return delay;
      },
    },
  });

  const subClient: RedisClientType = pubClient.duplicate();

  // Error handling
  pubClient.on('error', (err: any) => {
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
      console.error('[Redis Adapter] Pub Client Error:', err);
    }
  });

  subClient.on('error', (err: any) => {
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
      console.error('[Redis Adapter] Sub Client Error:', err);
    }
  });

  pubClient.on('connect', () => {
    console.log('[Redis Adapter] Pub client connected');
  });

  subClient.on('connect', () => {
    console.log('[Redis Adapter] Sub client connected');
  });
  
  pubClient.on('ready', () => {
    console.log('[Redis Adapter] Pub client ready');
  });
  
  subClient.on('ready', () => {
    console.log('[Redis Adapter] Sub client ready');
  });

  // Connect to Redis
  // 개발 환경에서는 Redis가 이미 준비되어 있으므로 바로 연결 시도
  // 운영 환경에서는 Gateway의 재시도 로직이 처리
  try {
    console.log(`[Redis Adapter] Connecting to Redis...`);
    await Promise.all([pubClient.connect(), subClient.connect()]);
    console.log('✅ [Redis Adapter] Redis adapter connected for Socket.IO');
    return createAdapter(pubClient, subClient);
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error(`[Redis Adapter] Failed to connect: ${errorMessage}`);
    // 에러를 throw하여 Gateway의 재시도 로직이 처리하도록 함
    throw error;
  }
}

