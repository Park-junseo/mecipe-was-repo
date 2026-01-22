import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { MetaViewersRedisService } from './meta-viewers-redis.service';
import { Server, Socket } from 'socket.io';
import { ClientToServerListenerType } from './interface/socket-event-type';
import { createRedisAdapter } from './redis-adapter.config';

/**
 * Redis 기반 Meta Viewers WebSocket Gateway
 * Socket.IO Redis Adapter를 사용하여 레플리카셋 환경에서 일관된 소켓 통신 제공
 */
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  path: '/meta-viewers',
  adapter: null, // 동적으로 설정
})
export class MetaViewersRedisGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private readonly metaViewersRedisService: MetaViewersRedisService) {}

  /**
   * Gateway 초기화 시 Redis Adapter 설정
   * Redis 연결 실패 시 재시도 로직 포함
   */
  async afterInit(server: Server) {
    // 개발 환경에서는 Redis가 이미 준비되어 있으므로 재시도 횟수 감소
    // 운영 환경에서는 Kubernetes의 liveness probe가 처리
    const isDevelopment = process.env.NODE_ENV === 'development';
    const maxRetries = isDevelopment ? 3 : 10;
    const baseRetryDelay = isDevelopment ? 2000 : 5000; // 개발: 2초, 운영: 5초

    // PM2 클러스터 모드에서 인스턴스 간 경쟁 상태 방지
    // 각 인스턴스가 순차적으로 연결을 시도하도록 지연 추가
    if (isDevelopment && process.env.NODE_APP_INSTANCE !== undefined) {
      const instanceId = parseInt(process.env.NODE_APP_INSTANCE, 10) || 0;
      const staggerDelay = instanceId * 500; // 인스턴스당 500ms 지연
      console.log(`[Gateway] Staggering connection attempt for instance ${instanceId} (${staggerDelay}ms delay)`);
      await new Promise((resolve) => setTimeout(resolve, staggerDelay));
    }

    // 환경 변수 확인 (디버깅용)
    const redisUrl = process.env.REDIS_URL;
    console.log(`[Gateway] Environment check - REDIS_URL: ${redisUrl ? redisUrl.replace(/:[^:@]+@/, ':****@') : 'NOT SET'}`);
    console.log(`[Gateway] Process PID: ${process.pid}, INSTANCE_ID: ${process.env.INSTANCE_ID || 'NOT SET'}`);
    console.log(`[Gateway] NODE_APP_INSTANCE: ${process.env.NODE_APP_INSTANCE || 'NOT SET'}`);
    console.log(`[Gateway] Mode: ${isDevelopment ? 'development' : 'production'}, Max retries: ${maxRetries}`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const instanceId = process.env.NODE_APP_INSTANCE || process.env.INSTANCE_ID || process.pid;
        console.log(`[Gateway] Attempting to connect to Redis adapter (attempt ${attempt}/${maxRetries}, Instance: ${instanceId})...`);
        const adapter = await createRedisAdapter();
        server.adapter(adapter);
        this.metaViewersRedisService.afterInit(server);
        console.log(`[Gateway] ✅ Redis adapter initialized successfully (Instance: ${instanceId})`);
        console.log(`[Gateway] Server ready to accept connections (Instance: ${instanceId}, PID: ${process.pid})`);
        // 서버 인스턴스 저장 (joinRoom에서 확인하기 위해)
        (this as any).server = server;
        return;
      } catch (error: any) {
        const errorMessage = error.message || String(error);
        console.error(
          `[Gateway] Failed to initialize Redis adapter (attempt ${attempt}/${maxRetries}): ${errorMessage}`,
        );

        if (attempt < maxRetries) {
          // 재시도 지연 (개발 환경에서는 짧게)
          const delay = baseRetryDelay * attempt; // 2초, 4초, 6초 (개발) 또는 5초, 10초, 15초 (운영)
          console.log(`[Gateway] Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          console.error('[Gateway] ❌ Redis adapter initialization failed after all retries');
          console.error('[Gateway] Please check if Redis is running and accessible at the configured URL');
          console.error(`[Gateway] Redis URL: ${redisUrl ? redisUrl.replace(/:[^:@]+@/, ':****@') : 'NOT SET'}`);
          // Redis Adapter는 필수이므로 초기화 실패 시 서버를 시작하지 않음
          // PM2 클러스터 모드에서 일부 인스턴스만 성공하는 것을 방지
          throw new Error(`Redis adapter initialization failed after ${maxRetries} attempts: ${errorMessage}`);
        }
      }
    }
  }

  async handleConnection(client: Socket, ...args: any[]) {
    // handleConnection 호출 확인 (환경 변수와 무관하게 항상 로그)
    const instanceId = process.env.NODE_APP_INSTANCE || process.env.INSTANCE_ID || process.pid;
    console.log(`[Gateway] handleConnection called - clientId: ${client.id} (Instance: ${instanceId}, PID: ${process.pid})`);
    
    // Socket.IO onAny를 사용한 이벤트 로깅 (socket.use() 대신)
    // socket.use()는 NestJS Gateway와 함께 사용할 때 제대로 작동하지 않을 수 있음
    const enableSocketLogging = process.env.ENABLE_SOCKET_LOGGING === 'true';
    
    if (enableSocketLogging) {
      const clientId = client.id;
      const timestamp = () => new Date().toISOString();
      
      // onAny는 모든 이벤트를 확실하게 캡처함
      client.onAny((eventName, ...eventArgs) => {
        try {
          const data = eventArgs.length > 0 ? eventArgs[0] : null;
          const hasCallback = eventArgs.length > 0 && typeof eventArgs[eventArgs.length - 1] === 'function';
          const dataStr = data 
            ? JSON.stringify(data).substring(0, 500)
            : 'no data';
          
          console.log(
            `[Socket Log] 📥 [${timestamp()}] Client: ${clientId} | Event: ${eventName} | Data: ${dataStr}${hasCallback ? ' | Has ACK callback' : ''}`
          );
        } catch (error) {
          console.log(`[Socket Log] 📥 [${timestamp()}] Client: ${clientId} | Event: ${eventName} | [Unable to log data]`);
        }
      });

      // 연결/종료 로깅
      console.log(
        `[Socket Log] ✅ CONNECT [${timestamp()}] Client: ${clientId} | IP: ${client.handshake.address} | Rooms: ${Array.from(client.rooms).join(', ')}`
      );
      
      client.on('disconnect', (reason) => {
        console.log(
          `[Socket Log] ❌ DISCONNECT [${timestamp()}] Client: ${clientId} | Reason: ${reason}`
        );
      });
    }
    
    await this.metaViewersRedisService.handleConnection(client, ...args);
  }

  handleDisconnect(client: Socket) {
    this.metaViewersRedisService.handleDisconnect(client);
  }

  // 서버 종료 시 정리
  onModuleDestroy() {
    this.metaViewersRedisService.onModuleDestroy();
  }

  /**
   * 클라이언트로부터 실시간 데이터 수신
   * 방별 큐에 저장하여 12ms마다 브로드캐스트
   * @emit 'roomBroadcast'
   */
  @SubscribeMessage(ClientToServerListenerType.ROOM_BROADCAST)
  handleRoomData(
    @MessageBody() data: { type: string; data: any },
    @ConnectedSocket() client: Socket,
  ) {
    return this.metaViewersRedisService.handleRoomData(data, client);
  }

  // 특정 소켓 정보 조회 메시지 핸들러
  @SubscribeMessage(ClientToServerListenerType.GET_SOCKET_INFO)
  getSocketInfo(@MessageBody() socketId: string) {
    return this.metaViewersRedisService.getSocketInfo(socketId);
  }

  // 모든 연결된 클라이언트 목록 반환 메시지 핸들러
  @SubscribeMessage(ClientToServerListenerType.GET_CONNECTED_CLIENTS)
  getConnectedClients() {
    return this.metaViewersRedisService.getConnectedClients();
  }

  // ===== 방(Room) 관리 기능 =====

  /**
   * 방입장
   * @emit 'userJoined'
   */
  @SubscribeMessage(ClientToServerListenerType.USER_JOINED)
  async joinRoom(
    @MessageBody() data: { roomId: string; sessionToken?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const clientId = client.id;
    const roomId = data?.roomId;
    const instanceId = process.env.NODE_APP_INSTANCE || process.env.INSTANCE_ID || process.pid;
    
    console.log(`[Gateway] joinRoom event received from client '${clientId}' for room '${roomId}' (Instance: ${instanceId})`);
    
    // 서비스 인스턴스 확인
    if (!this.metaViewersRedisService) {
      const errorMsg = `[Gateway] metaViewersRedisService is null or undefined (Instance: ${instanceId})`;
      console.error(errorMsg);
      return { success: false, message: 'Service not available', error: errorMsg };
    }
    
    // Redis Adapter 상태 확인
    const server = (this as any).server;
    if (!server || !server.adapter) {
      const errorMsg = `[Gateway] Socket.IO server or adapter not initialized (Instance: ${instanceId})`;
      console.error(errorMsg);
      return { success: false, message: 'Server not ready', error: errorMsg };
    }
    
    try {
      console.log(`[Gateway] Calling metaViewersRedisService.joinRoom for client '${clientId}' in room '${roomId}' (Instance: ${instanceId})`);
      const result = await this.metaViewersRedisService.joinRoom(data, client);
      console.log(`[Gateway] joinRoom completed successfully for client '${clientId}' in room '${roomId}' (Instance: ${instanceId})`);
      return result;
    } catch (error: any) {
      const errorMsg = `[Gateway] joinRoom failed for client '${clientId}' in room '${roomId}': ${error?.message || String(error)}`;
      console.error(errorMsg);
      console.error(`[Gateway] Error stack:`, error?.stack);
      
      // 클라이언트에 에러 전송
      try {
        client.emit('error', {
          type: 'JOIN_ROOM_ERROR',
          message: error?.message || 'Unknown error',
          roomId: roomId,
        });
      } catch (emitError) {
        console.error(`[Gateway] Failed to emit error to client '${clientId}':`, emitError);
      }
      
      return {
        success: false,
        message: `Failed to join room: ${error?.message || 'Unknown error'}`,
        error: errorMsg,
      };
    }
  }

  /**
   * 방나가기
   * @emit 'userLeft'
   */
  @SubscribeMessage(ClientToServerListenerType.USER_LEFT)
  leaveRoom(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    return this.metaViewersRedisService.leaveRoom(data, client);
  }

  // 현재 방 정보 조회
  @SubscribeMessage(ClientToServerListenerType.GET_ROOM_INFO)
  getRoomInfo(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    return this.metaViewersRedisService.getRoomInfo(client);
  }

  // 방 목록 조회
  @SubscribeMessage(ClientToServerListenerType.GET_ROOM_LIST)
  getRoomList() {
    return this.metaViewersRedisService.getRoomList();
  }

  // 같은 방 클라이언트들에게만 메시지 전송
  @SubscribeMessage(ClientToServerListenerType.SEND_TO_ROOM)
  sendToRoom(
    @MessageBody() data: { message: string },
    @ConnectedSocket() client: Socket,
  ) {
    return this.metaViewersRedisService.sendToRoom(data, client);
  }

  /**
   * 헬스체크 처리
   * 클라이언트가 30초마다 전송하여 연결 유효성 확인 및 TTL 갱신
   */
  @SubscribeMessage(ClientToServerListenerType.HEALTH_CHECK)
  handleHeartbeat(@ConnectedSocket() client: Socket) {
    return this.metaViewersRedisService.handleHeartbeat(client);
  }
}

