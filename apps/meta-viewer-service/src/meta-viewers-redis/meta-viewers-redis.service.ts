import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RedisBroadcastSchedulerService } from './services/redis-broadcast-scheduler.service';
import {
  BroadcastData,
  ClientMessage,
  RoomDataMessageType,
} from './interface/broadcast-data-type';
import { RedisRoomService } from './services/redis-room.service';
import { RedisQueueService } from './services/redis-queue.service';
import { RedisCacheService, CacheTypeFlag } from './services/redis-cache.service';
import { ServerToClientListenerType } from './interface/socket-event-type';
import { Logger } from '@nestjs/common';

/**
 * Redis 기반 Meta Viewers 서비스
 * 레플리카셋 환경에서 일관된 소켓 통신 제공
 */
@Injectable()
export class MetaViewersRedisService implements OnModuleDestroy {
  private readonly logger = new Logger(MetaViewersRedisService.name);
  // 연결된 소켓들을 저장할 Map (로컬 인스턴스만)
  private connectedClients = new Map<string, Socket>();

  constructor(
    private readonly schedulerService: RedisBroadcastSchedulerService,
    private readonly roomService: RedisRoomService,
    private readonly queueService: RedisQueueService,
    private readonly cacheService: RedisCacheService,
  ) {}

  afterInit(server: Server) {
    const port = Number(process.env.SOCKET_PORT) || 4100;
    this.logger.log(`[Meta Viewers Redis] Socket.IO server initialized on port ${port}`);
    this.logger.log(`[Meta Viewers Redis] Server path: ${server.path()}`);

    // 브로드캐스트 스케줄러 설정 및 시작
    this.schedulerService.setServer(server);
    this.schedulerService.start();

    // Stateful 소켓 통신 메시지 캐시 타입 선언
    this.cacheService.declareCacheType(
      RoomDataMessageType.PLAYER_TRANSFORM,
      CacheTypeFlag.JOIN_EVENT,
    );
    this.logger.log(
      `[Meta Viewers Redis] Cache type declared: ${RoomDataMessageType.PLAYER_TRANSFORM} (JOIN_EVENT)`,
    );

    // 서버 시작 시 정리 작업 수행 (비동기, 에러는 로그만)
    this.cleanupOrphanedClients(server).catch((error) => {
      this.logger.error(
        `[Meta Viewers Redis] Failed to cleanup orphaned clients: ${error.message}`,
        error.stack,
      );
    });
  }

  /**
   * 서버 시작 시 유효하지 않은 클라이언트 정리
   * 서버가 갑자기 종료되었을 때 Redis에 남아있는 클라이언트 제거
   * 
   * 주의: Socket.IO 서버는 현재 레플리카의 소켓만 확인 가능하므로,
   * 다른 레플리카에 연결된 클라이언트는 제거하지 않음
   */
  private async cleanupOrphanedClients(server: Server): Promise<void> {
    this.logger.log('[Meta Viewers Redis] Starting cleanup of orphaned clients...');
    const startTime = Date.now();

    try {
      // 모든 활성 룸 목록 조회
      const allRooms = await this.roomService.getAllRooms();
      let totalCleaned = 0;

      // 각 룸의 클라이언트 확인
      for (const room of allRooms.rooms) {
        const orphanedClients: string[] = [];

        // 각 클라이언트가 실제로 연결되어 있는지 확인
        for (const clientId of room.clients) {
          // Socket.IO 서버에서 소켓 확인 (현재 레플리카에서만)
          const socket = server.sockets.sockets.get(clientId);
          
          if (!socket || !socket.connected) {
            // 연결되지 않은 클라이언트는 고아 클라이언트로 간주
            // 하지만 다른 레플리카에 연결되어 있을 수 있으므로,
            // 세션 토큰 유효성도 확인
            const sessionToken = await this.roomService.getSessionTokenBySocketId(clientId);
            
            if (!sessionToken) {
              // 세션 토큰이 없으면 확실히 고아 클라이언트
              orphanedClients.push(clientId);
            } else {
              // 세션 토큰이 있으면 세션 정보 확인
              const session = await this.roomService.getSessionByToken(sessionToken);
              
              // 세션이 유효하지 않거나, 소켓 ID가 다르면 고아 클라이언트
              if (!session.valid || session.socketId !== clientId) {
                orphanedClients.push(clientId);
              }
            }
          }
        }

        // 고아 클라이언트 제거
        if (orphanedClients.length > 0) {
          this.logger.log(
            `[Meta Viewers Redis] Cleaning up ${orphanedClients.length} orphaned clients from room '${room.roomId}'`,
          );

          for (const clientId of orphanedClients) {
            try {
              // Redis에서 클라이언트 제거
              await this.roomService.removeClientFromRoomDirectly(clientId, room.roomId);
              totalCleaned++;
            } catch (error: any) {
              this.logger.warn(
                `[Meta Viewers Redis] Failed to remove orphaned client '${clientId}' from room '${room.roomId}': ${error.message}`,
              );
            }
          }
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `[Meta Viewers Redis] Cleanup completed: ${totalCleaned} orphaned clients removed (duration: ${duration}ms)`,
      );
    } catch (error: any) {
      this.logger.error(
        `[Meta Viewers Redis] Error during cleanup: ${error.message}`,
        error.stack,
      );
    }
  }

  async handleDisconnect(client: Socket) {
    const startTime = Date.now();
    const clientId = client.id;

    try {
      // 방에서 클라이언트 제거
      const currentRoom = await this.roomService.handleClientDisconnect(client);

      // 연결 해제된 클라이언트 제거
      this.connectedClients.delete(clientId);

      // 메시지 캐시 정리
      if (currentRoom) {
        await this.cacheService.clearMessageCache(clientId, currentRoom);
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `[Meta Viewers Redis] Client disconnected: ${clientId} (room: ${currentRoom || 'none'}, duration: ${duration}ms)`,
      );
      this.logger.log(
        `[Meta Viewers Redis] Current connected clients: ${this.connectedClients.size}`,
      );
    } catch (error: any) {
      this.logger.error(
        `[Meta Viewers Redis] Error handling disconnect for client '${clientId}': ${error.message}`,
        error.stack,
      );
    }
  }

  async handleConnection(client: Socket, ...args: any[]) {
    const clientId = client.id;
    
    // 새로 연결된 클라이언트 추가
    this.connectedClients.set(clientId, client);

    // 클라이언트 연결 시 세션 토큰 확인 (auth 또는 query에서)
    const providedToken = (client.handshake.auth as any)?.sessionToken || (client.handshake.query as any)?.sessionToken;

    let sessionToken: string;
    let sessionRestored = false;
    let restoredRoomId: string | null = null;

    if (providedToken) {
      // 기존 토큰으로 세션 복원 시도
      const restoreResult = await this.roomService.restoreSessionByToken(providedToken, client);
      sessionToken = providedToken;
      sessionRestored = restoreResult.restored;
      restoredRoomId = restoreResult.roomId;

      if (sessionRestored) {
        this.logger.log(
          `[Meta Viewers Redis] Client connected with existing session token - Session restored, rejoined room '${restoredRoomId}'`,
        );
      } else {
        this.logger.log(
          `[Meta Viewers Redis] Client connected with existing session token - No previous room to restore`,
        );
      }
    } else {
      // 새 세션 토큰 생성
      sessionToken = await this.roomService.createSessionToken(clientId);
      this.logger.log(
        `[Meta Viewers Redis] Client connected - New session token created: ${sessionToken.substring(0, 16)}...`,
      );
    }

    // 클라이언트에 세션 토큰 전송 (connect 이벤트 후 별도 이벤트로 전송)
    // connect 이벤트는 Socket.IO 내장 이벤트이므로 매개변수를 받을 수 없음
    client.emit(ServerToClientListenerType.SESSION_TOKEN, {
      sessionToken,
      socketId: clientId,
      restored: sessionRestored,
      roomId: restoredRoomId,
    });

    this.logger.log(`[Meta Viewers Redis] Client connected: ${clientId}`);
    this.logger.log(
      `[Meta Viewers Redis] Current connected clients: ${this.connectedClients.size}`,
    );
    this.logger.debug(
      `[Meta Viewers Redis] Client info - IP: ${client.handshake.address}, User-Agent: ${client.handshake.headers['user-agent']}`,
    );
  }

  onModuleDestroy() {
    this.schedulerService.stop();
    this.logger.log('[Meta Viewers Redis] Service destroyed');
  }

  async handleRoomData(data: { type: string; data: any }, client: Socket) {
    const startTime = Date.now();
    const clientId = client.id;

    try {
      const currentRoom = await this.roomService.getClientRoom(clientId);

      if (!currentRoom) {
        return {
          success: false,
          message: 'You must be in a room to send realtime data.',
        };
      }

      const clientMessage: ClientMessage = {
        type: data.type,
        timestamp: Date.now(),
        data: data.data,
        clientId: clientId,
      };

      // 방별 큐에 데이터 추가 (Redis Streams)
      await this.queueService.enqueueData(currentRoom, clientMessage);

      // 메시지 캐시 저장 (Redis)
      await this.cacheService.setMessageCache(
        clientId,
        currentRoom,
        data.type,
        clientMessage,
      );

      const duration = Date.now() - startTime;
      this.logger.debug(
        `[Meta Viewers Redis] Data queued for room '${currentRoom}' (type: ${data.type}, clientId: ${clientId}, duration: ${duration}ms)`,
      );

      return {
        success: true,
        message: `Data queued for room '${currentRoom}'`,
        dataType: data.type,
        roomId: currentRoom,
      };
    } catch (error: any) {
      this.logger.error(
        `[Meta Viewers Redis] Failed to handle room data for client '${clientId}': ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        message: 'Failed to queue data.',
      };
    }
  }

  /**
   * 헬스체크 처리
   * 클라이언트의 모든 관련 Redis 키 TTL 갱신
   */
  async handleHeartbeat(client: Socket): Promise<{ success: boolean; message: string }> {
    const clientId = client.id;
    return await this.roomService.handleHeartbeat(clientId);
  }

  getSocketInfo(socketId: string) {
    const client = this.connectedClients.get(socketId);

    if (!client) {
      return { error: `Socket ${socketId} not found in this instance` };
    }

    return {
      socketId: client.id,
      connected: client.connected,
      ip: client.handshake.address,
      userAgent: client.handshake.headers['user-agent'],
      connectedAt: client.handshake.time,
    };
  }

  getConnectedClients() {
    const clients = Array.from(this.connectedClients.values()).map((socket) => ({
      socketId: socket.id,
      connected: socket.connected,
      ip: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'],
      connectedAt: socket.handshake.time,
    }));

    this.logger.log(
      `[Meta Viewers Redis] Client list requested - Total: ${clients.length} (this instance)`,
    );

    return {
      total: clients.length,
      clients: clients,
      note: 'This is the count for this instance only. Total clients may be distributed across replicas.',
    };
  }

  async joinRoom(data: { roomId: string; sessionToken?: string }, client: Socket) {
    const startTime = Date.now();
    const clientId = client.id;

    try {
      // 세션 토큰은 데이터에서 제공되거나 소켓에서 가져옴
      const sessionToken =
        data.sessionToken ||
        (await this.roomService.getSessionTokenBySocketId(clientId)) ||
        (client.handshake.auth as any)?.sessionToken ||
        (client.handshake.query as any)?.sessionToken;

      const result = await this.roomService.joinRoom(client, data.roomId, sessionToken || undefined);

      // 조인 이벤트 캐시 메시지 풀 전송
      const cachedMessages = await this.cacheService.getJoinEventMessages(data.roomId);

      if (cachedMessages.length > 0) {
        const broadcastData: BroadcastData = {
          roomId: data.roomId,
          timestamp: Date.now(),
          messages: cachedMessages,
        };

        client.emit(ServerToClientListenerType.INITIALIZE_ENV, broadcastData);

        this.logger.log(
          `[Meta Viewers Redis] Sent ${cachedMessages.length} cached messages to client '${clientId}' on join (room: ${data.roomId})`,
        );
      }

      const duration = Date.now() - startTime;
      const logMessage = sessionToken
        ? `[Meta Viewers Redis] Client '${clientId}' (session token) joined room '${data.roomId}'`
        : `[Meta Viewers Redis] Client '${clientId}' joined room '${data.roomId}'`;
      this.logger.log(`${logMessage} (duration: ${duration}ms)`);

      return result;
    } catch (error: any) {
      this.logger.error(
        `[Meta Viewers Redis] Failed to join room '${data.roomId}' for client '${clientId}': ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async leaveRoom(data: any, client: Socket) {
    const startTime = Date.now();
    const clientId = client.id;

    try {
      const result = await this.roomService.leaveRoom(clientId);

      if (result.success && result.leftRoom) {
        // 리빌 이벤트 캐시 메시지 풀 전송
        const cachedMessages = await this.cacheService.getLeaveEventMessages(
          clientId,
          result.leftRoom,
        );

        if (cachedMessages.length > 0) {
          const broadcastData: BroadcastData = {
            roomId: result.leftRoom,
            timestamp: Date.now(),
            messages: cachedMessages,
          };

          client.emit(ServerToClientListenerType.INITIALIZE_ENV, broadcastData);

          this.logger.log(
            `[Meta Viewers Redis] Sent ${cachedMessages.length} cached messages to client '${clientId}' on leave (room: ${result.leftRoom})`,
          );
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `[Meta Viewers Redis] Client '${clientId}' left room (duration: ${duration}ms)`,
      );

      return result;
    } catch (error: any) {
      this.logger.error(
        `[Meta Viewers Redis] Failed to leave room for client '${clientId}': ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getRoomInfo(client: Socket) {
    return await this.roomService.getCurrentRoomInfo(client.id);
  }

  async getRoomList() {
    return await this.roomService.getAllRooms();
  }

  async sendToRoom(data: { message: string }, client: Socket) {
    const clientId = client.id;

    try {
      const currentRoom = await this.roomService.getClientRoom(clientId);

      if (!currentRoom) {
        return {
          success: false,
          message: 'You must be in a room to send messages.',
        };
      }

      // 같은 방의 다른 클라이언트들에게만 전송 (Socket.IO Redis Adapter가 처리)
      client.to(currentRoom).emit(ServerToClientListenerType.ROOM_MESSAGE, {
        from: clientId,
        message: data.message,
        roomId: currentRoom,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `[Meta Viewers Redis] Room message sent to '${currentRoom}' from client '${clientId}': ${data.message}`,
      );

      return {
        success: true,
        message: `Room '${currentRoom}' message sent.`,
        roomId: currentRoom,
      };
    } catch (error: any) {
      this.logger.error(
        `[Meta Viewers Redis] Failed to send room message from client '${clientId}': ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        message: 'Failed to send message.',
      };
    }
  }
}


