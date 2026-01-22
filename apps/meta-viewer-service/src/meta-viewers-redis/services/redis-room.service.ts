import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Socket } from 'socket.io';
import { createClient, RedisClientType } from 'redis';
import { ServerToClientListenerType } from '../interface/socket-event-type';
import { RoomDataMessageType, ClientMessage } from '../interface/broadcast-data-type';
import { RedisQueueService } from './redis-queue.service';
import * as crypto from 'crypto';

export interface RoomInfo {
  roomId: string;
  createdAt: number;
  lastActivity: number;
}

/**
 * Redis 기반 룸 관리 서비스
 * 레플리카셋 환경에서 공유 룸 정보 제공
 * Redis Hash와 Set을 활용한 룸 정보 관리
 * 임시 토큰 기반 세션 관리 지원
 */
@Injectable()
export class RedisRoomService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisRoomService.name);
  private readonly redis: RedisClientType;
  // 헬스체크 기반 정리 시스템과 조화:
  // - 헬스체크: 30초마다 (TTL 갱신)
  // - 정리 작업: 60초마다 (비활성 클라이언트 제거)
  // - roomTtl: 정리 주기의 2-3배 (정리 작업 실패 시 안전장치)
  private readonly roomTtl = 180; // 3분 (초) - 헬스체크로 갱신되므로 실제로는 활성 클라이언트는 계속 유지
  // - sessionTokenTtl: 세션 복원을 위해 roomTtl보다 길게 (클라이언트 재연결 대기 시간)
  private readonly sessionTokenTtl = 600; // 10분 (초) - 세션 토큰 TTL (재연결 시 복원 가능 시간)
  private readonly heartbeatTimeout = 60; // 60초 - 헬스체크 타임아웃 (30초 헬스체크 + 여유시간)

  constructor(
    @Inject(forwardRef(() => RedisQueueService))
    private readonly queueService: RedisQueueService,
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
        this.logger.error(`[Redis Room] Connection Error: ${err.message || String(err)}`, err.stack);
      }
    });

    this.redis.on('connect', () => {
      this.logger.log('[Redis Room] Connected to Redis');
    });

    this.redis.on('reconnecting', () => {
      this.logger.warn(`[Redis Room] Redis(${redisUrl}) reconnecting...`);
    });

    this.redis.on('ready', () => {
      this.logger.log('[Redis Room] Redis ready');
    });

    this.redis.connect().catch((err) => {
      this.logger.error(`[Redis Room] Failed to connect to Redis: ${err.message}`, err.stack);
    });
  }

  /**
   * 임시 세션 토큰 생성 (32바이트 랜덤 문자열, base64 인코딩)
   */
  private generateSessionToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * 새 세션 토큰 생성 및 저장
   * @returns 생성된 세션 토큰
   */
  async createSessionToken(socketId: string): Promise<string> {
    try {
      const token = this.generateSessionToken();
      const createdAt = Date.now();

      // 세션 토큰 → 소켓 ID 매핑 저장
      await this.redis.set(`session:${token}:socketId`, socketId, { EX: this.sessionTokenTtl });
      // 세션 토큰 생성 시간 저장
      await this.redis.set(`session:${token}:createdAt`, createdAt.toString(), { EX: this.sessionTokenTtl });
      // 소켓 ID → 세션 토큰 매핑 저장 (역방향 조회용)
      await this.redis.set(`socket:${socketId}:sessionToken`, token, { EX: this.sessionTokenTtl });

      this.logger.debug(`[Redis Room] Created session token for socketId '${socketId}'`);
      return token;
    } catch (error: any) {
      this.logger.error(
        `[Redis Room] Failed to create session token for socketId '${socketId}': ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 세션 토큰으로 세션 정보 조회
   */
  async getSessionByToken(token: string): Promise<{ roomId: string | null; socketId: string | null; valid: boolean }> {
    try {
      const [roomId, socketId] = await Promise.all([
        this.redis.get(`session:${token}:roomId`),
        this.redis.get(`session:${token}:socketId`),
      ]);

      const valid = socketId !== null;

      return {
        roomId: roomId || null,
        socketId: socketId || null,
        valid,
      };
    } catch (error: any) {
      this.logger.error(`[Redis Room] Failed to get session for token: ${error.message}`, error.stack);
      return { roomId: null, socketId: null, valid: false };
    }
  }

  /**
   * 세션 토큰으로 이전 룸에 자동 재입장 (재연결 시 사용)
   */
  async restoreSessionByToken(token: string, client: Socket): Promise<{ roomId: string | null; restored: boolean }> {
    try {
      const session = await this.getSessionByToken(token);

      if (!session.valid) {
        this.logger.warn(`[Redis Room] Invalid or expired session token`);
        return { roomId: null, restored: false };
      }

      // 이전 소켓 ID가 있고 새 소켓 ID와 다른 경우, 이전 소켓 ID를 룸에서 직접 제거
      // leaveRoom을 호출하지 않고 직접 Redis에서 제거 (이미 disconnect된 소켓이므로)
      if (session.socketId && session.socketId !== client.id && session.roomId) {
        try {
          // 이전 소켓 ID를 룸에서 직접 제거 (Socket 객체 없이)
          await Promise.all([
            this.redis.sRem(`room:${session.roomId}:clients`, session.socketId),
            this.redis.del(`client:${session.socketId}:room`),
            this.redis.del(`client:${session.socketId}:info`),
            this.redis.del(`socket:${session.socketId}:sessionToken`),
          ]);
          this.logger.debug(
            `[Redis Room] Removed previous socketId '${session.socketId}' from room '${session.roomId}' (new socketId: ${client.id})`,
          );
        } catch (error: any) {
          // 제거 실패는 경고만 (이미 제거되었을 수 있음)
          this.logger.warn(
            `[Redis Room] Failed to remove previous socketId '${session.socketId}' from room: ${error.message}`,
          );
        }
      }

      // 새 소켓 ID로 토큰 매핑 업데이트
      await this.redis.set(`session:${token}:socketId`, client.id, { EX: this.sessionTokenTtl });
      await this.redis.set(`socket:${client.id}:sessionToken`, token, { EX: this.sessionTokenTtl });

      if (session.roomId) {
        // 이전 룸이 존재하는지 확인
        const roomExists = await this.redis.exists(`room:${session.roomId}:info`);

        if (roomExists) {
          // 이전 룸에 자동 재입장 (토큰과 함께)
          await this.joinRoom(client, session.roomId, token);
          this.logger.log(
            `[Redis Room] Session restored by token: rejoined room '${session.roomId}' (socketId: ${client.id})`,
          );
          return { roomId: session.roomId, restored: true };
        } else {
          // 룸이 더 이상 존재하지 않으면 세션에서 룸 정보 제거
          await this.redis.del(`session:${token}:roomId`);
          this.logger.log(
            `[Redis Room] Previous room '${session.roomId}' no longer exists, session room cleared`,
          );
        }
      }

      return { roomId: null, restored: false };
    } catch (error: any) {
      this.logger.error(`[Redis Room] Failed to restore session by token: ${error.message}`, error.stack);
      return { roomId: null, restored: false };
    }
  }

  /**
   * 소켓 ID로 세션 토큰 조회
   */
  async getSessionTokenBySocketId(socketId: string): Promise<string | null> {
    this.logger.debug(`[Redis Room] getSessionTokenBySocketId called for socketId '${socketId}'`);
    try {
      this.logger.debug(`[Redis Room] Calling Redis GET for socket:${socketId}:sessionToken...`);
      const result = await this.redis.get(`socket:${socketId}:sessionToken`);
      this.logger.debug(`[Redis Room] Redis GET completed for socketId '${socketId}': ${result ? 'found' : 'not found'}`);
      return result;
    } catch (error: any) {
      this.logger.error(
        `[Redis Room] Failed to get session token for socketId '${socketId}': ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * 클라이언트를 방에 입장시킴
   */
  async joinRoom(
    client: Socket,
    roomId: string,
    sessionToken?: string, // 선택적 세션 토큰 (재연결 시 세션 유지용)
  ): Promise<{
    success: boolean;
    clientId: string;
    roomId: string;
    clientsInRoom: { socketId: string; joinAt: string; sessionToken: string | null }[];
    message: string;
  }> {
    const startTime = Date.now();
    const clientId = client.id;
    const joinAt = new Date().toISOString();
    const timestamp = Date.now();

    this.logger.debug(`[Redis Room] joinRoom called - clientId: ${clientId}, roomId: ${roomId}, sessionToken: ${sessionToken ? 'provided' : 'not provided'}`);

    try {
      // 클라이언트 연결 상태 확인
      if (!client.connected) {
        const errorMsg = `[Redis Room] Client '${clientId}' is not connected`;
        this.logger.error(errorMsg);
        throw new Error(errorMsg);
      }

      // 기존 방에서 제거 (현재 룸 확인 후 제거)
      this.logger.debug(`[Redis Room] Checking current room for client '${clientId}'...`);
      const currentRoom = await this.getClientRoom(clientId);
      this.logger.debug(`[Redis Room] Current room for client '${clientId}': ${currentRoom || 'none'}`);
      if (currentRoom && currentRoom !== roomId) {
        // 다른 룸에 있으면 제거
        await this.removeClientFromRoom(clientId, currentRoom);
      }

      // Socket.IO 방 입장
      client.join(roomId);

      // 룸 정보 초기화 (없는 경우)
      await this.ensureRoomExists(roomId, timestamp);

      // 클라이언트를 룸에 추가 (중복 방지를 위해 SADD 결과 확인)
      // SADD는 이미 존재하는 멤버면 0을 반환하므로, 이전 소켓 ID가 남아있을 수 있음
      // 명시적으로 제거 후 추가
      await this.redis.sRem(`room:${roomId}:clients`, clientId); // 중복 제거

      const promises: Promise<any>[] = [
        this.redis.sAdd(`room:${roomId}:clients`, clientId),
        this.redis.set(`client:${clientId}:room`, roomId, { EX: this.roomTtl }),
        this.redis.hSet(`client:${clientId}:info`, {
          roomId,
          joinAt,
          lastActivity: timestamp.toString(),
        }),
        this.redis.hSet(`room:${roomId}:info`, {
          lastActivity: timestamp.toString(),
        }),
        this.redis.sAdd('rooms:active', roomId),
      ];

      // 세션 토큰이 제공된 경우 세션에 룸 정보 저장
      if (sessionToken) {
        promises.push(this.redis.set(`session:${sessionToken}:roomId`, roomId, { EX: this.sessionTokenTtl }));
      }

      await Promise.all(promises);

      // 룸 TTL 갱신
      await Promise.all([
        this.redis.expire(`room:${roomId}:clients`, this.roomTtl),
        this.redis.expire(`room:${roomId}:info`, this.roomTtl),
      ]);

      // 룸의 모든 클라이언트 목록 조회 (타임아웃 적용, 실패해도 계속 진행)
      let clientsInRoom: { socketId: string; sessionToken: string; joinAt: string }[] = [];
      try {
        clientsInRoom = await this.getRoomClients(roomId);
      } catch (error: any) {
        // getRoomClients 실패해도 joinRoom은 성공으로 처리
        this.logger.warn(`[Redis Room] Failed to get room clients for '${roomId}': ${error.message}, continuing with empty list`);
        clientsInRoom = [];
      }

      // 브로드캐스트 큐에 USER_JOINED 메시지 추가 (메시지 순서 보장)
      // 명시적 이벤트 대신 브로드캐스트 메시지로 처리하여 순서 보장
      const joinMessage: ClientMessage = {
        type: RoomDataMessageType.USER_JOINED,
        timestamp: timestamp,
        data: {
          socketId: clientId,
          sessionToken: sessionToken || '',
          roomId: roomId,
          timestamp: joinAt,
        },
        clientId: clientId,
      };

      // RedisQueueService를 통해 큐에 메시지 추가
      try {
        await this.queueService.enqueueData(roomId, joinMessage);
        this.logger.debug(
          `[Redis Room] Enqueued USER_JOINED message for client '${clientId}' in room '${roomId}'`,
        );
      } catch (error: any) {
        // 큐 추가 실패는 로그만 남기고 계속 진행 (루 입장은 성공)
        this.logger.warn(
          `[Redis Room] Failed to enqueue USER_JOINED message for client '${clientId}' in room '${roomId}': ${error.message}`,
        );
      }

      const duration = Date.now() - startTime;
      const logMessage = sessionToken
        ? `[Redis Room] Client '${clientId}' (session token) joined room '${roomId}'`
        : `[Redis Room] Client '${clientId}' joined room '${roomId}'`;
      this.logger.log(`${logMessage} (${clientsInRoom.length} clients, duration: ${duration}ms)`);

      return {
        success: true,
        clientId: clientId,
        roomId: roomId,
        clientsInRoom: clientsInRoom,
        message: `Room '${roomId}' joined.`,
      };
    } catch (error: any) {
      this.logger.error(
        `[Redis Room] Failed to join room '${roomId}' for client '${clientId}': ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 클라이언트를 현재 방에서 나가게 함
   */
  async leaveRoom(clientId: string, roomId?: string, sessionToken?: string): Promise<{
    success: boolean;
    clientId: string;
    leftRoom?: string;
    message: string;
  }> {
    const startTime = Date.now();

    try {
      const currentRoomId = roomId || await this.getClientRoom(clientId);

      if (!currentRoomId) {
        return {
          success: false,
          clientId: clientId,
          message: 'Currently not in any room.',
        };
      }

      const token = sessionToken || await this.getSessionTokenBySocketId(clientId);

      // 브로드캐스트 큐에 USER_LEFT 메시지 추가 (메시지 순서 보장)
      // 명시적 이벤트 대신 브로드캐스트 메시지로 처리하여 순서 보장
      const leaveMessage: ClientMessage = {
        type: RoomDataMessageType.USER_LEFT,
        timestamp: Date.now(),
        data: {
          socketId: clientId,
          roomId: currentRoomId,
          sessionToken: token || '',
          timestamp: new Date().toISOString(),
        },
        clientId: clientId,
      };

      // RedisQueueService를 통해 큐에 메시지 추가
      try {
        await this.queueService.enqueueData(currentRoomId, leaveMessage);
        this.logger.debug(
          `[Redis Room] Enqueued USER_LEFT message for client '${clientId}' in room '${currentRoomId}'`,
        );
      } catch (error: any) {
        // 큐 추가 실패는 로그만 남기고 계속 진행 (루 퇴장은 성공)
        this.logger.warn(
          `[Redis Room] Failed to enqueue USER_LEFT message for client '${clientId}' in room '${currentRoomId}': ${error.message}`,
        );
      }

      await this.removeClientFromRoom(clientId, currentRoomId, sessionToken);

      // 룸이 비었는지 확인
      const clientCount = await this.redis.sCard(`room:${currentRoomId}:clients`);
      if (clientCount === 0) {
        // 빈 룸 정리
        await Promise.all([
          this.redis.del(`room:${currentRoomId}:clients`),
          this.redis.del(`room:${currentRoomId}:info`),
          this.redis.sRem('rooms:active', currentRoomId),
        ]);
        this.logger.log(`[Redis Room] Room '${currentRoomId}' deleted (empty)`);
      } else {
        // 룸 활동 시간 업데이트
        await this.redis.hSet(`room:${currentRoomId}:info`, {
          lastActivity: Date.now().toString(),
        });
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `[Redis Room] Client '${clientId}' left room '${currentRoomId}' (duration: ${duration}ms)`,
      );

      return {
        success: true,
        clientId: clientId,
        leftRoom: currentRoomId,
        message: `Room '${currentRoomId}' left.`,
      };
    } catch (error: any) {
      this.logger.error(
        `[Redis Room] Failed to leave room for client '${clientId}': ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 클라이언트 연결 해제 처리
   */
  async handleClientDisconnect(client: Socket): Promise<string | null> {
    const clientId = client.id;
    const startTime = Date.now();

    try {
      const currentRoom = await this.getClientRoom(clientId);

      if (!currentRoom) {
        return null;
      }

      // 방에 있는 다른 클라이언트들에게 알림
      client
        .to(currentRoom)
        .emit(ServerToClientListenerType.USER_DISCONNECTED, {
          socketId: clientId,
          roomId: currentRoom,
          timestamp: new Date().toISOString(),
        });


      // 브로드캐스트 큐에 USER_DISCONNECTED 메시지 추가 (메시지 순서 보장)
      // 명시적 이벤트 대신 브로드캐스트 메시지로 처리하여 순서 보장
      const disconnectMessage: ClientMessage = {
        type: RoomDataMessageType.USER_LEFT,
        timestamp: Date.now(),
        data: {
          socketId: clientId,
          roomId: currentRoom,
          sessionToken: await this.getSessionTokenBySocketId(clientId) || '',
          timestamp: new Date().toISOString(),
        },
        clientId: clientId,
      };

      // RedisQueueService를 통해 큐에 메시지 추가
      try {
        await this.queueService.enqueueData(currentRoom, disconnectMessage);
        this.logger.debug(
          `[Redis Room] Enqueued USER_DISCONNECTED message for client '${clientId}' in room '${currentRoom}'`,
        );
      } catch (error: any) {
        // 큐 추가 실패는 로그만 남기고 계속 진행 (연결 해제는 성공)
        this.logger.warn(
          `[Redis Room] Failed to enqueue USER_DISCONNECTED message for client '${clientId}' in room '${currentRoom}': ${error.message}`,
        );
      }

      await this.removeClientFromRoom(clientId, currentRoom);

      // 룸이 비었는지 확인
      const clientCount = await this.redis.sCard(`room:${currentRoom}:clients`);
      if (clientCount === 0) {
        await Promise.all([
          this.redis.del(`room:${currentRoom}:clients`),
          this.redis.del(`room:${currentRoom}:info`),
          this.redis.sRem('rooms:active', currentRoom),
        ]);
        this.logger.log(`[Redis Room] Room '${currentRoom}' deleted (empty)`);
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `[Redis Room] Client '${clientId}' disconnected from room '${currentRoom}' (duration: ${duration}ms)`,
      );

      return currentRoom;
    } catch (error: any) {
      this.logger.error(
        `[Redis Room] Failed to handle disconnect for client '${clientId}': ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * 클라이언트의 현재 방 정보 조회
   */
  async getCurrentRoomInfo(clientId: string): Promise<{
    currentRoom: string | null;
    clientsInRoom?: number;
    clients?: string[];
    message?: string;
  }> {
    try {
      const currentRoom = await this.getClientRoom(clientId);

      if (!currentRoom) {
        return {
          currentRoom: null,
          message: 'Currently not in any room.',
        };
      }

      const clientsInRoom = await this.getRoomClients(currentRoom);

      return {
        currentRoom: currentRoom,
        clientsInRoom: clientsInRoom.length,
        clients: clientsInRoom.map((c) => c.socketId),
      };
    } catch (error: any) {
      this.logger.error(
        `[Redis Room] Failed to get room info for client '${clientId}': ${error.message}`,
        error.stack,
      );
      return {
        currentRoom: null,
        message: 'Failed to get room info.',
      };
    }
  }

  /**
   * 모든 방 목록 조회
   */
  async getAllRooms(): Promise<{
    totalRooms: number;
    rooms: Array<{
      roomId: string;
      clientCount: number;
      clients: string[];
      createdAt: string;
      lastActivity: string;
    }>;
  }> {
    try {
      const activeRooms = await this.redis.sMembers('rooms:active');

      const roomPromises = activeRooms.map(async (roomId) => {
        const [info, clients] = await Promise.all([
          this.redis.hGetAll(`room:${roomId}:info`),
          this.redis.sMembers(`room:${roomId}:clients`),
        ]);

        return {
          roomId: roomId,
          clientCount: clients.length,
          clients: clients,
          createdAt: info.createdAt
            ? new Date(parseInt(info.createdAt)).toISOString()
            : new Date().toISOString(),
          lastActivity: info.lastActivity
            ? new Date(parseInt(info.lastActivity)).toISOString()
            : new Date().toISOString(),
        };
      });

      const rooms = await Promise.all(roomPromises);

      return {
        totalRooms: rooms.length,
        rooms: rooms,
      };
    } catch (error: any) {
      this.logger.error(`[Redis Room] Failed to get all rooms: ${error.message}`, error.stack);
      return { totalRooms: 0, rooms: [] };
    }
  }

  /**
   * 클라이언트가 속한 방 ID 조회
   */
  async getClientRoom(clientId: string): Promise<string | null> {
    try {
      const roomId = await this.redis.get(`client:${clientId}:room`);
      return roomId;
    } catch (error: any) {
      this.logger.error(
        `[Redis Room] Failed to get room for client '${clientId}': ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * 모든 활성 방 ID 목록 조회
   */
  async getActiveRoomIds(): Promise<string[]> {
    try {
      const rooms = await this.redis.sMembers('rooms:active');
      return rooms;
    } catch (error: any) {
      this.logger.error(`[Redis Room] Failed to get active rooms: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * 특정 방의 클라이언트 목록 조회
   * 최적화: sessionToken 조회를 배치로 처리하여 Redis 호출 최소화 및 타임아웃 적용
   */
  async getRoomClients(roomId: string): Promise<{ socketId: string; sessionToken: string; joinAt: string }[]> {
    const startTime = Date.now();
    try {
      const clientIds = await this.redis.sMembers(`room:${roomId}:clients`);

      if (clientIds.length === 0) {
        return [];
      }

      // 배치로 sessionToken 조회 (한 번에 여러 개 조회, 타임아웃 적용)
      const sessionTokenPromises = clientIds.map(clientId => 
        this.redis.get(`socket:${clientId}:sessionToken`).catch(() => null)
      );
      
      // 배치로 클라이언트 정보 조회
      const clientInfoPromises = clientIds.map(clientId => 
        this.redis.hGetAll(`client:${clientId}:info`).catch(() => ({}))
      );

      // 타임아웃 설정 (2초) - 배포 환경에서 Redis 지연 대비
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`getRoomClients timeout for room '${roomId}' after 2 seconds`));
        }, 2000);
      });

      // 모든 배치 작업을 병렬로 실행하되 타임아웃 적용
      const [sessionTokens, clientInfos] = await Promise.race([
        Promise.all([
          Promise.all(sessionTokenPromises),
          Promise.all(clientInfoPromises),
        ]),
        timeoutPromise,
      ]);

      // 결과 조합
      const result = clientIds.map((clientId, index) => {
        const info = clientInfos[index] || {};
        const joinAt = 'joinAt' in info && typeof info.joinAt === 'string' ? info.joinAt : new Date().toISOString();
        return {
          socketId: clientId,
          sessionToken: sessionTokens[index] || '',
          joinAt: joinAt,
        };
      });

      const duration = Date.now() - startTime;
      if (duration > 1000) {
        this.logger.warn(`[Redis Room] getRoomClients took ${duration}ms for room '${roomId}' (${clientIds.length} clients)`);
      }
      
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[Redis Room] Failed to get clients for room '${roomId}' (duration: ${duration}ms): ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * 룸 존재 확인 및 생성
   */
  private async ensureRoomExists(roomId: string, timestamp: number): Promise<void> {
    const exists = await this.redis.exists(`room:${roomId}:info`);

    if (!exists) {
      await this.redis.hSet(`room:${roomId}:info`, {
        createdAt: timestamp.toString(),
        lastActivity: timestamp.toString(),
      });
      await this.redis.expire(`room:${roomId}:info`, this.roomTtl);
    }
  }

  /**
   * 방에서 클라이언트 직접 제거 (서버 시작 시 정리 작업용)
   * Socket 객체 없이 클라이언트 ID만으로 제거
   */
  async removeClientFromRoomDirectly(clientId: string, roomId: string): Promise<void> {
    try {
      await Promise.all([
        this.redis.sRem(`room:${roomId}:clients`, clientId),
        this.redis.del(`client:${clientId}:room`),
        this.redis.del(`client:${clientId}:info`),
        this.redis.del(`socket:${clientId}:sessionToken`),
      ]);
      this.logger.debug(
        `[Redis Room] Removed orphaned client '${clientId}' from room '${roomId}'`,
      );
    } catch (error: any) {
      this.logger.warn(
        `[Redis Room] Failed to remove orphaned client '${clientId}' from room '${roomId}': ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 방에서 클라이언트 제거
   */
  private async removeClientFromRoom(clientId: string, roomId?: string, sessionToken?: string): Promise<void> {
    try {
      const currentRoom = roomId || await this.getClientRoom(clientId);

      const token = sessionToken || await this.getSessionTokenBySocketId(clientId);

      if (currentRoom) {
        // 세션 토큰 관련 삭제는 하지 않음 (재연결 시 복원을 위해 유지)
        // session:${token}:socketId는 restoreSessionByToken에서 업데이트됨
        // session:${token}:roomId는 leaveRoom에서만 삭제 (명시적 퇴장 시)
        await Promise.all([
          this.redis.sRem(`room:${currentRoom}:clients`, clientId),
          this.redis.del(`client:${clientId}:room`),
          this.redis.del(`client:${clientId}:info`),
          this.redis.del(`socket:${clientId}:sessionToken`), // 소켓 ID → 토큰 매핑만 삭제
        ]);
        this.logger.debug(
          `[Redis Room] Removed client '${clientId}' from room '${currentRoom}'`,
        );
      }
    } catch (error: any) {
      // 제거 실패는 로그만 남기고 예외를 던지지 않음 (이미 제거되었을 수 있음)
      this.logger.warn(
        `[Redis Room] Failed to remove client '${clientId}' from room: ${error.message}`,
      );
    }
  }

  /**
   * 모듈 초기화 시 로그만 출력
   * 실제 정리 작업은 @Cron 데코레이터로 스케줄링됨
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('[Redis Room] Periodic cleanup scheduled (60s interval via @Cron)');
  }

  /**
   * 헬스체크 처리 - 클라이언트의 모든 관련 Redis 키 TTL 갱신
   */
  async handleHeartbeat(clientId: string): Promise<{ success: boolean; message: string }> {
    try {
      // 클라이언트가 방에 있는지 확인
      const currentRoom = await this.getClientRoom(clientId);
      const sessionToken = await this.getSessionTokenBySocketId(clientId);
      const timestamp = Date.now();

      if (!currentRoom && !sessionToken) {
        // 방도 없고 세션 토큰도 없으면 유효하지 않은 클라이언트
        return { success: false, message: 'Client not in any room and no session token' };
      }

      const promises: Promise<any>[] = [];

      // 클라이언트 정보 TTL 갱신 및 마지막 활동 시간 업데이트
      if (currentRoom) {
        promises.push(
          this.redis.expire(`client:${clientId}:room`, this.roomTtl),
          this.redis.hSet(`client:${clientId}:info`, {
            lastActivity: timestamp.toString(),
          }),
          this.redis.expire(`client:${clientId}:info`, this.roomTtl),
          this.redis.hSet(`room:${currentRoom}:info`, {
            lastActivity: timestamp.toString(),
          }),
          this.redis.expire(`room:${currentRoom}:info`, this.roomTtl),
          this.redis.expire(`room:${currentRoom}:clients`, this.roomTtl),
        );
      } else {
        // 방은 없지만 세션 토큰이 있는 경우
        promises.push(
          this.redis.hSet(`client:${clientId}:info`, {
            lastActivity: timestamp.toString(),
          }),
          this.redis.expire(`client:${clientId}:info`, this.roomTtl),
        );
      }

      // 세션 토큰 관련 TTL 갱신
      if (sessionToken) {
        promises.push(
          this.redis.expire(`session:${sessionToken}:socketId`, this.sessionTokenTtl),
          this.redis.expire(`socket:${clientId}:sessionToken`, this.sessionTokenTtl),
        );

        if (currentRoom) {
          promises.push(this.redis.expire(`session:${sessionToken}:roomId`, this.sessionTokenTtl));
        }
      }

      await Promise.all(promises);

      this.logger.debug(`[Redis Room] Heartbeat received from client '${clientId}' (room: ${currentRoom || 'none'})`);
      return { success: true, message: 'Heartbeat processed' };
    } catch (error: any) {
      this.logger.error(
        `[Redis Room] Failed to process heartbeat for client '${clientId}': ${error.message}`,
        error.stack,
      );
      return { success: false, message: error.message };
    }
  }

  /**
   * 주기적으로 비활성 클라이언트 정리 (60초마다 실행)
   * NestJS Schedule의 @Cron 데코레이터 사용
   * 헬스체크를 받지 않은 클라이언트 제거 후, 각 룸의 현재 멤버 목록을 브로드캐스트
   */
  @Cron('*/60 * * * * *') // 60초마다
  async cleanupInactiveClients(): Promise<void> {
    const startTime = Date.now();
    this.logger.debug('[Redis Room] Starting periodic cleanup of inactive clients...');

    try {
      // 모든 활성 룸 목록 조회
      const allRooms = await this.getAllRooms();
      let totalCleaned = 0;
      const roomsToBroadcast = new Set<string>(); // 멤버 목록을 브로드캐스트할 룸 목록

      for (const room of allRooms.rooms) {
        const inactiveClients: string[] = [];

        for (const clientId of room.clients) {
          // 클라이언트 정보 확인
          const clientInfo = await this.redis.hGetAll(`client:${clientId}:info`);

          if (Object.keys(clientInfo).length === 0) {
            // 클라이언트 정보가 없으면 제거
            inactiveClients.push(clientId);
            continue;
          }

          // 마지막 활동 시간 확인 (lastActivity 또는 joinAt)
          const lastActivity = clientInfo.lastActivity
            ? parseInt(clientInfo.lastActivity, 10)
            : clientInfo.joinAt
              ? new Date(clientInfo.joinAt).getTime()
              : 0;

          const timeSinceLastActivity = Date.now() - lastActivity;
          const safetyMargin = 10 * 1000; // 10초 여유 (헬스체크 지연 대비)

          // 헬스체크 타임아웃(60초) + 여유시간 이상 비활성이면 제거
          if (timeSinceLastActivity > (this.heartbeatTimeout * 1000 + safetyMargin)) {
            inactiveClients.push(clientId);
          }
        }

        // 비활성 클라이언트 제거
        if (inactiveClients.length > 0) {
          this.logger.log(
            `[Redis Room] Cleaning up ${inactiveClients.length} inactive clients from room '${room.roomId}'`,
          );

          for (const clientId of inactiveClients) {
            try {
              await this.removeClientFromRoomDirectly(clientId, room.roomId);
              totalCleaned++;
            } catch (error: any) {
              this.logger.warn(
                `[Redis Room] Failed to remove inactive client '${clientId}' from room '${room.roomId}': ${error.message}`,
              );
            }
          }

          // 클라이언트가 제거된 룸은 멤버 목록 브로드캐스트 대상에 추가
          roomsToBroadcast.add(room.roomId);
        } else {
          // 클라이언트가 제거되지 않았더라도 모든 활성 룸의 멤버 목록을 주기적으로 브로드캐스트
          roomsToBroadcast.add(room.roomId);
        }
      }

      // 각 룸의 현재 멤버 목록을 READ_ROOM_MEMBER 타입으로 브로드캐스트
      for (const roomId of roomsToBroadcast) {
        try {
          const currentClients = await this.getRoomClients(roomId);
          
          // 현재 멤버 목록을 큐에 추가
          await this.queueService.enqueueData(roomId, {
            type: RoomDataMessageType.READ_ROOM_MEMBER,
            timestamp: Date.now(),
            data: {
              roomId,
              members: currentClients.map((client) => ({
                clientId: client.socketId,
                sessionToken: client.sessionToken,
                joinAt: client.joinAt,
              })),
              timestamp: new Date().toISOString(),
            },
            clientId: 'system', // 시스템 메시지
          });

          this.logger.debug(
            `[Redis Room] Enqueued READ_ROOM_MEMBER for room '${roomId}' with ${currentClients.length} members`,
          );
        } catch (error: any) {
          this.logger.warn(
            `[Redis Room] Failed to broadcast room members for room '${roomId}': ${error.message}`,
          );
        }
      }

      const duration = Date.now() - startTime;
      if (totalCleaned > 0) {
        this.logger.log(
          `[Redis Room] Periodic cleanup completed: ${totalCleaned} inactive clients removed, ${roomsToBroadcast.size} rooms broadcasted (duration: ${duration}ms)`,
        );
      } else {
        this.logger.debug(
          `[Redis Room] Periodic cleanup completed: no inactive clients found, ${roomsToBroadcast.size} rooms broadcasted (duration: ${duration}ms)`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `[Redis Room] Error during periodic cleanup: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Redis 연결 종료
   */
  async onModuleDestroy(): Promise<void> {
    // @Cron 데코레이터로 스케줄링된 작업은 NestJS가 자동으로 중지함
    try {
      // 이벤트 리스너 제거
      this.redis.removeAllListeners();
      await this.redis.quit();
      this.logger.log('[Redis Room] Redis connection closed');
    } catch (error: any) {
      this.logger.error(`[Redis Room] Error closing Redis connection: ${error.message}`, error.stack);
    }
  }
}

