import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { BroadcastSchedulerService } from './services/broadcast-scheduler.service';
import { BroadcastData, ClientMessage, RoomDataMessageType } from './interface/broadcast-data-type';
import { RoomManagerService } from './services/room-manager.service';
import { RoomDataQueueService } from './services/room-data-queue.service';
import SocketLogger from './utils/socket-logger';
import { ServerToClientListenerType } from './interface/socket-event-type';
import { CacheTypeFlag, MessageCacheService } from './services/message-cache.service';

@Injectable()
export class MetaVeiwersService {

    constructor(
        private readonly logger: SocketLogger,
        private readonly schedulerService: BroadcastSchedulerService,
        private readonly roomManagerService: RoomManagerService,
        private readonly queueService: RoomDataQueueService,
        private readonly messageCacheService: MessageCacheService,
    ) { }

    // 연결된 소켓들을 저장할 Map
    private connectedClients = new Map<string, Socket>();

    afterInit(server: Server) {
        this.logger.log(
            `Socket.IO 서버 초기화 ✅: ${Number(process.env.SOCKET_PORT) || 4100}`,
        );
        this.logger.log(`Server path: ${server.path()}`);

        // 브로드캐스트 스케줄러 설정 및 시작
        this.schedulerService.setServer(server);
        this.schedulerService.start();

        // Stateful 소켓 통신 메시지 캐시 타입 선언
        this.messageCacheService.declareCacheType(RoomDataMessageType.PLAYER_TRANSFORM, CacheTypeFlag.JOIN_EVENT); // 플레이어 입장 시, 룸에 있는 모든 플레이어의 가장 마지막 정보를 해당 플레이어에게 전송
    }

    handleDisconnect(client: Socket) {
        // 방에서 클라이언트 제거
        const currentRoom = this.roomManagerService.handleClientDisconnect(client);

        // 연결 해제된 클라이언트 제거
        this.connectedClients.delete(client.id);

        this.messageCacheService.clearMessageCache(client.id, currentRoom);

        this.logger.log(`Client Disconnected: ${client.id}`);
        this.logger.log(`현재 연결된 클라이언트 수: ${this.connectedClients.size}`);

        // 활성 방 목록 업데이트
        this.updateActiveRooms();
        this.printConnectedClients();
    }

    handleConnection(client: Socket, ...args: any[]) {
        // 새로 연결된 클라이언트 추가
        this.connectedClients.set(client.id, client);

        this.logger.log(`Client Connected: ${client.id}`);
        this.logger.log(`현재 연결된 클라이언트 수: ${this.connectedClients.size}`);

        this.printConnectedClients();
    }

    onModuleDestroy() {
        this.schedulerService.stop();
    }

    handleRoomData(data: { type: string; data: any }, client: Socket) {
        const currentRoom = this.roomManagerService.getClientRoom(client.id);

        if (!currentRoom) {
            return {
                success: false,
                message: 'You must be in a room to send realtime data.',
            };
        }

        const clientLetter: ClientMessage = {
            type: data.type,
            timestamp: Date.now(),
            data: data.data,
            clientId: client.id,
        };

        // 방별 큐에 데이터 추가 (같은 타입이면 덮어씀)
        this.queueService.enqueueData(currentRoom, clientLetter);

        // 메시지 캐시 저장
        this.messageCacheService.setMessageCache(client.id, currentRoom, data.type, clientLetter);

        return {
            success: true,
            message: `Data queued for room '${currentRoom}'`,
            dataType: data.type,
            roomId: currentRoom,
        };
    }

    getSocketInfo(socketId: string) {
        const client = this.connectedClients.get(socketId);

        if (!client) {
            return { error: `Socket ${socketId} not found` };
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
        const clients = Array.from(this.connectedClients.values()).map(
            (socket) => ({
                socketId: socket.id,
                connected: socket.connected,
                ip: socket.handshake.address,
                userAgent: socket.handshake.headers['user-agent'],
                connectedAt: socket.handshake.time,
            }),
        );

        this.logger.log(`클라이언트 목록 요청 - 총 ${clients.length}개`);

        return {
            total: clients.length,
            clients: clients,
        };
    }

    joinRoom(data: { roomId: string }, client: Socket) {
        const result = this.roomManagerService.joinRoom(client, data.roomId);

        // 활성 방 목록 업데이트
        this.updateActiveRooms();

        // 조인 이벤트 캐시 메시지 풀 전송
        this.messageCacheService.executeJoinClientEvent(client, data.roomId);

        console.log('joinRoom', result);

        return result;
    }

    leaveRoom(data: any, client: Socket) {
        const result = this.roomManagerService.leaveRoom(client);

        // 활성 방 목록 업데이트
        this.updateActiveRooms();

        // 리빌 이벤트 캐시 메시지 풀 전송
        this.messageCacheService.executeLeaveClientEvent(client, data.roomId);

        console.log('leaveRoom', result);

        return result;
    }

    getRoomInfo(client: Socket) {
        return this.roomManagerService.getCurrentRoomInfo(client.id);
    }

    getRoomList() {
        return this.roomManagerService.getAllRooms();
    }

    sendToRoom(data: { message: string }, client: Socket) {
        const currentRoom = this.roomManagerService.getClientRoom(client.id);

        if (!currentRoom) {
            return {
                success: false,
                message: 'You must be in a room to send messages.',
            };
        }

        // 같은 방의 다른 클라이언트들에게만 전송
        client.to(currentRoom).emit(ServerToClientListenerType.ROOM_MESSAGE, {
            from: client.id,
            message: data.message,
            roomId: currentRoom,
            timestamp: new Date().toISOString(),
        });

        this.logger.log(`Room message sent to ${currentRoom}: ${data.message}`);

        return {
            success: true,
            message: `Room '${currentRoom}' message sent.`,
            roomId: currentRoom,
        };
    }

    // ===== 유틸리티 메소드 =====

    /**
     * 활성 방 목록을 스케줄러에 업데이트
     */
    private updateActiveRooms(): void {
        const activeRooms = this.roomManagerService.getActiveRoomIds();
        this.schedulerService.updateActiveRooms(activeRooms);
    }

    // 연결된 모든 클라이언트 목록 출력
    private printConnectedClients() {
        this.logger.log('=== 연결된 클라이언트 목록 ===');

        if (this.connectedClients.size === 0) {
            this.logger.log('연결된 클라이언트가 없습니다.');
            return;
        }

        this.connectedClients.forEach((socket, socketId) => {
            this.logger.log(`📱 Socket ID: ${socketId}`);
            this.logger.log(`   - Connected: ${socket.connected}`);
            this.logger.log(`   - IP: ${socket.handshake.address}`);
            this.logger.log(
                `   - User Agent: ${socket.handshake.headers['user-agent']}`,
            );
            this.logger.log(`   - Connected At: ${new Date(socket.handshake.time)}`);
        });

        this.logger.log('================================');
    }
}
