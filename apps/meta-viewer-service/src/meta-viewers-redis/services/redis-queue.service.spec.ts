import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { RedisQueueService } from './redis-queue.service';
import { createClient, RedisClientType } from 'redis';
import { ClientMessage } from '../interface/broadcast-data-type';

// Redis 클라이언트 모킹
jest.mock('redis');

describe('RedisQueueService', () => {
  let service: RedisQueueService;
  let mockRedis: jest.Mocked<RedisClientType>;

  beforeEach(async () => {
    // Mock Redis 클라이언트 생성
    mockRedis = {
      isOpen: true,
      isReady: true,
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      removeAllListeners: jest.fn(),
      xAdd: jest.fn().mockResolvedValue('123-0'), // 기본값 설정
      xTrim: jest.fn().mockResolvedValue(10),
      xRevRange: jest.fn().mockResolvedValue([]),
      xGroupCreate: jest.fn().mockResolvedValue('OK'),
      xReadGroup: jest.fn().mockResolvedValue([]),
      xAck: jest.fn().mockResolvedValue(0),
      xLen: jest.fn().mockResolvedValue(0),
      xPending: jest.fn().mockResolvedValue({ pending: 0, consumers: [] }),
    } as any;

    (createClient as jest.Mock).mockReturnValue(mockRedis);

    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisQueueService],
    }).compile();

    service = module.get<RedisQueueService>(RedisQueueService);
    
    // 서비스 내부의 redis 인스턴스를 모킹된 인스턴스로 교체
    (service as any).redis = mockRedis;
    
    // Logger 모킹 (로그 출력 방지)
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('enqueueData', () => {
    const mockRoomId = 'test-room';
    const mockMessage: ClientMessage = {
      type: 'testType',
      timestamp: 1234567890,
      data: { test: 'data' },
      clientId: 'test-client-id',
    };

    it('should successfully enqueue data on first attempt', async () => {
      // Given
      mockRedis.xAdd.mockResolvedValue('123-0');

      // When
      await service.enqueueData(mockRoomId, mockMessage);

      // Then
      expect(mockRedis.xAdd).toHaveBeenCalledTimes(1);
      expect(mockRedis.xAdd).toHaveBeenCalledWith(
        `room:${mockRoomId}:queue`,
        '*',
        expect.objectContaining({
          data: JSON.stringify(mockMessage),
          timestamp: mockMessage.timestamp.toString(),
          clientId: mockMessage.clientId,
          type: mockMessage.type,
          idempotencyKey: expect.any(String),
        }),
      );
    });

    it('should retry on timeout and succeed', async () => {
      // Given
      jest.useFakeTimers({ advanceTimers: true });
      let callCount = 0;
      mockRedis.xAdd.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // 첫 번째 시도는 타임아웃되도록 지연
          return new Promise((resolve) => {
            setTimeout(() => resolve('123-0'), 6000);
          });
        }
        // 재시도는 즉시 성공
        return Promise.resolve('124-0');
      });

      const enqueuePromise = service.enqueueData(mockRoomId, mockMessage);

      // 첫 번째 시도 타임아웃 발생 (5초)
      jest.advanceTimersByTime(5000);
      await Promise.resolve(); // Promise 체인 처리

      // 재시도 지연 (100ms)
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      // 재시도 성공
      await enqueuePromise;

      // Then
      expect(mockRedis.xAdd).toHaveBeenCalledTimes(2);
      
      jest.useRealTimers();
    }, 15000);

    it('should detect duplicate message and skip retry', async () => {
      // Given
      jest.useFakeTimers({ advanceTimers: true });
      const idempotencyKey = `${mockMessage.clientId}-${mockMessage.timestamp}-${mockMessage.type}`;
      
      // 첫 번째 시도는 타임아웃 (실제로는 Redis에 저장되었지만 타임아웃으로 실패로 인식)
      mockRedis.xAdd.mockImplementationOnce(() => new Promise((resolve) => {
        setTimeout(() => resolve('123-0'), 6000);
      }));

      // 중복 체크: 같은 멱등성 키를 가진 메시지가 이미 존재 (첫 번째 시도가 실제로 저장됨)
      mockRedis.xRevRange.mockResolvedValue([
        {
          id: '123-0',
          message: {
            data: JSON.stringify(mockMessage),
            timestamp: mockMessage.timestamp.toString(),
            clientId: mockMessage.clientId,
            type: mockMessage.type,
            idempotencyKey: idempotencyKey,
          },
        },
      ]);

      const enqueuePromise = service.enqueueData(mockRoomId, mockMessage);

      // 첫 번째 시도 타임아웃 발생
      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      // 재시도 지연 (100ms)
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      // 중복 체크 후 재시도하지 않고 성공으로 처리
      await enqueuePromise;

      // Then
      expect(mockRedis.xAdd).toHaveBeenCalledTimes(1); // 첫 번째 시도만 호출됨
      expect(mockRedis.xRevRange).toHaveBeenCalled(); // 중복 체크 호출됨
      
      jest.useRealTimers();
    }, 15000);

    it('should fail after max retries exceeded', async () => {
      // Given
      jest.useFakeTimers({ advanceTimers: true });
      mockRedis.xAdd.mockImplementation(() => new Promise((resolve) => {
        // 항상 타임아웃되도록 지연
        setTimeout(() => resolve('123-0'), 6000);
      }));

      const enqueuePromise = service.enqueueData(mockRoomId, mockMessage);

      // 4번의 시도 모두 타임아웃
      for (let i = 0; i < 4; i++) {
        jest.advanceTimersByTime(5000);
        await Promise.resolve();
        if (i < 3) {
          // 재시도 지연 (100ms, 200ms, 400ms)
          const delay = 100 * Math.pow(2, i);
          jest.advanceTimersByTime(delay);
          await Promise.resolve();
        }
      }

      // Then
      await expect(enqueuePromise).rejects.toThrow();
      expect(mockRedis.xAdd).toHaveBeenCalledTimes(4); // 최대 재시도 횟수 + 1
      
      jest.useRealTimers();
    }, 40000);

    it('should retry on XADD error', async () => {
      // Given
      mockRedis.xAdd
        .mockRejectedValueOnce(new Error('Redis connection error'))
        .mockResolvedValueOnce('124-0'); // 재시도는 성공

      // When
      await service.enqueueData(mockRoomId, mockMessage);

      // Then
      expect(mockRedis.xAdd).toHaveBeenCalledTimes(2);
    });

    it('should include idempotencyKey in message', async () => {
      // Given
      mockRedis.xAdd.mockResolvedValue('123-0');
      const idempotencyKey = `${mockMessage.clientId}-${mockMessage.timestamp}-${mockMessage.type}`;

      // When
      await service.enqueueData(mockRoomId, mockMessage);

      // Then
      expect(mockRedis.xAdd).toHaveBeenCalledWith(
        `room:${mockRoomId}:queue`,
        '*',
        expect.objectContaining({
          idempotencyKey: idempotencyKey,
        }),
      );
    });

    it('should execute xTrim asynchronously after successful xAdd', async () => {
      // Given
      mockRedis.xAdd.mockResolvedValue('123-0');
      mockRedis.xTrim.mockResolvedValue(10);

      // When
      await service.enqueueData(mockRoomId, mockMessage);
      await new Promise((resolve) => setTimeout(resolve, 10)); // 비동기 처리 대기

      // Then
      expect(mockRedis.xTrim).toHaveBeenCalledWith(
        `room:${mockRoomId}:queue`,
        'MAXLEN',
        1000,
      );
    });

    it('should handle xTrim failure gracefully', async () => {
      // Given
      mockRedis.xAdd.mockResolvedValue('123-0');
      mockRedis.xTrim.mockRejectedValue(new Error('Trim failed'));

      // When
      await service.enqueueData(mockRoomId, mockMessage);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Then
      // xTrim 실패해도 에러가 throw되지 않아야 함
      expect(mockRedis.xAdd).toHaveBeenCalled();
    });

    it('should continue retry when duplicate check fails', async () => {
      // Given
      jest.useFakeTimers({ advanceTimers: true });
      let callCount = 0;
      mockRedis.xAdd.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // 첫 번째 시도는 타임아웃
          return new Promise((resolve) => {
            setTimeout(() => resolve('123-0'), 6000);
          });
        }
        // 재시도는 성공
        return Promise.resolve('124-0');
      });

      // 중복 체크 실패 (xRevRange 에러)
      mockRedis.xRevRange.mockRejectedValue(new Error('Redis connection error'));

      const enqueuePromise = service.enqueueData(mockRoomId, mockMessage);

      // 첫 번째 시도 타임아웃
      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      // 재시도 지연 (100ms)
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      // 중복 체크 실패했지만 재시도는 계속 진행되어 성공
      await enqueuePromise;

      // Then
      expect(mockRedis.xRevRange).toHaveBeenCalled(); // 중복 체크 시도됨
      expect(mockRedis.xAdd).toHaveBeenCalledTimes(2); // 재시도까지 포함하여 2번 호출
      
      jest.useRealTimers();
    }, 15000);

    it('should continue retry when no duplicate found', async () => {
      // Given
      jest.useFakeTimers({ advanceTimers: true });
      let callCount = 0;
      mockRedis.xAdd.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // 첫 번째 시도는 타임아웃
          return new Promise((resolve) => {
            setTimeout(() => resolve('123-0'), 6000);
          });
        }
        // 재시도는 성공
        return Promise.resolve('124-0');
      });

      // 중복 체크: 다른 메시지만 존재 (중복 없음)
      mockRedis.xRevRange.mockResolvedValue([
        {
          id: '999-0',
          message: {
            data: JSON.stringify({ ...mockMessage, clientId: 'other-client' }),
            timestamp: mockMessage.timestamp.toString(),
            clientId: 'other-client',
            type: mockMessage.type,
            idempotencyKey: 'other-client-key',
          },
        },
      ]);

      const enqueuePromise = service.enqueueData(mockRoomId, mockMessage);

      // 첫 번째 시도 타임아웃
      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      // 재시도 지연 (100ms)
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      // 중복이 없으므로 재시도 진행되어 성공
      await enqueuePromise;

      // Then
      expect(mockRedis.xRevRange).toHaveBeenCalled(); // 중복 체크 호출됨
      expect(mockRedis.xAdd).toHaveBeenCalledTimes(2); // 재시도까지 포함하여 2번 호출
      
      jest.useRealTimers();
    }, 15000);

    it('should handle message parsing failure in duplicate check', async () => {
      // Given
      jest.useFakeTimers({ advanceTimers: true });
      let callCount = 0;
      mockRedis.xAdd.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // 첫 번째 시도는 타임아웃
          return new Promise((resolve) => {
            setTimeout(() => resolve('123-0'), 6000);
          });
        }
        // 재시도는 성공
        return Promise.resolve('124-0');
      });

      // 중복 체크: 파싱 불가능한 메시지 포함 (파싱 실패는 무시하고 계속)
      mockRedis.xRevRange.mockResolvedValue([
        {
          id: '123-0',
          message: {
            data: 'invalid-json-{', // 파싱 불가능한 JSON
            timestamp: mockMessage.timestamp.toString(),
            clientId: mockMessage.clientId,
            type: mockMessage.type,
            idempotencyKey: 'some-key',
          },
        },
      ]);

      const enqueuePromise = service.enqueueData(mockRoomId, mockMessage);

      // 첫 번째 시도 타임아웃
      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      // 재시도 지연 (100ms)
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      // 파싱 실패는 무시하고 재시도 진행되어 성공
      await enqueuePromise;

      // Then
      expect(mockRedis.xRevRange).toHaveBeenCalled(); // 중복 체크 호출됨
      expect(mockRedis.xAdd).toHaveBeenCalledTimes(2); // 재시도까지 포함하여 2번 호출
      
      jest.useRealTimers();
    }, 15000);

    it('should apply exponential backoff delays between retries', async () => {
      // Given
      jest.useFakeTimers({ advanceTimers: true });
      
      // 각 시도마다 타임아웃되도록 설정
      mockRedis.xAdd.mockImplementation(() => new Promise((resolve) => {
        setTimeout(() => resolve('123-0'), 6000);
      }));

      const enqueuePromise = service.enqueueData(mockRoomId, mockMessage);

      // 첫 번째 시도 타임아웃 (5초)
      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      // 첫 번째 재시도 지연 (100ms = baseRetryDelay * 2^0)
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      // 두 번째 시도 타임아웃 (5초)
      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      // 두 번째 재시도 지연 (200ms = baseRetryDelay * 2^1)
      jest.advanceTimersByTime(200);
      await Promise.resolve();

      // 세 번째 시도 타임아웃 (5초)
      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      // 세 번째 재시도 지연 (400ms = baseRetryDelay * 2^2)
      jest.advanceTimersByTime(400);
      await Promise.resolve();

      // 네 번째 시도 타임아웃 (최대 재시도 초과)
      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      // Then
      await expect(enqueuePromise).rejects.toThrow();
      expect(mockRedis.xAdd).toHaveBeenCalledTimes(4); // 최대 재시도 횟수 + 1
      
      jest.useRealTimers();
    }, 40000);
  });
});
