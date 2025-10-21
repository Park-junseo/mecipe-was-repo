import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { ServerToClientListenerType } from '../interface/socket-event-type';

export interface RoomInfo {
  roomId: string;
  clients: Set<string>;
  createdAt: Date;
  lastActivity: Date;
}

@Injectable()
export class RoomManagerService {
  private readonly logger = new Logger(RoomManagerService.name);

  private rooms = new Map<string, Set<string>>(); // roomId -> Set of socketIds
  private clientRooms = new Map<string, string>(); // socketId -> roomId
  private roomInfo = new Map<string, RoomInfo>(); // roomId -> RoomInfo
  private clientInfo = new Map<string, {roomId: string, joinAt: string}>(); // socketId -> {roomId, joinAt}

  /**
   * 클라이언트를 방에 입장시킴
   */
  joinRoom(
    client: Socket,
    roomId: string,
  ): {
    success: boolean;
    clientId: string;
    roomId: string;
    clientsInRoom: {socketId: string, joinAt: string}[];
    message: string;
  } {
    // 기존 방에서 제거
    this.removeClientFromRoom(client);

    // Socket.IO 방 입장
    client.join(roomId);

    // 방이 없으면 생성
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
      this.roomInfo.set(roomId, {
        roomId,
        clients: new Set(),
        createdAt: new Date(),
        lastActivity: new Date(),
      });
    }

    const joinAt = new Date().toISOString();

    // 클라이언트 추가
    this.rooms.get(roomId)!.add(client.id);
    this.clientRooms.set(client.id, roomId);
    this.clientInfo.set(client.id, {roomId: roomId, joinAt: joinAt});

    // 방 정보 업데이트
    const info = this.roomInfo.get(roomId)!;
    info.clients.add(client.id);
    info.lastActivity = new Date();

    this.logger.log(`Client ${client.id} joined room: ${roomId}`);
    this.printRoomStatus();

    // 방에 있는 다른 클라이언트들에게 알림
    client.to(roomId).emit(ServerToClientListenerType.USER_JOINED, {
      socketId: client.id,
      roomId: roomId,
      timestamp: joinAt,
    });

    return {
      success: true,
      clientId: client.id,
      roomId: roomId,
      clientsInRoom: Array.from(this.rooms.get(roomId) || []).map((socketId) => ({
        socketId: socketId,
        joinAt: this.clientInfo.get(socketId)!.joinAt,
      })),
      message: `Room '${roomId}' joined.`,
    };
  }

  /**
   * 클라이언트를 현재 방에서 나가게 함
   */
  leaveRoom(client: Socket): {
    success: boolean;
    clientId: string;
    leftRoom?: string;
    message: string;
  } {
    const currentRoom = this.clientRooms.get(client.id);

    if (currentRoom) {
      // 방에 있는 다른 클라이언트들에게 알림
      client.to(currentRoom).emit(ServerToClientListenerType.USER_LEFT, {
        socketId: client.id,
        roomId: currentRoom,
        timestamp: new Date().toISOString(),
      });

      this.removeClientFromRoom(client);

      this.logger.log(`Client ${client.id} left room: ${currentRoom}`);
      this.printRoomStatus();

      return {
        success: true,
        clientId: client.id,
        leftRoom: currentRoom,
        message: `Room '${currentRoom}' left.`,
      };
    }

    return {
      success: false,
      clientId: client.id,
      message: 'Currently not in any room.',
    };
  }

  /**
   * 클라이언트의 현재 방 정보 조회
   */
  getCurrentRoomInfo(clientId: string): {
    currentRoom: string | null;
    clientsInRoom?: number;
    clients?: string[];
    message?: string;
  } {
    const currentRoom = this.clientRooms.get(clientId);

    if (currentRoom) {
      const clientsInRoom = Array.from(this.rooms.get(currentRoom) || []);

      return {
        currentRoom: currentRoom,
        clientsInRoom: clientsInRoom.length,
        clients: clientsInRoom,
      };
    }

    return {
      currentRoom: null,
      message: 'Currently not in any room.',
    };
  }

  /**
   * 모든 방 목록 조회
   */
  getAllRooms(): {
    totalRooms: number;
    rooms: Array<{
      roomId: string;
      clientCount: number;
      clients: string[];
      createdAt: string;
      lastActivity: string;
    }>;
  } {
    const roomList = Array.from(this.rooms.entries()).map(
      ([roomId, clients]) => {
        const info = this.roomInfo.get(roomId)!;
        return {
          roomId: roomId,
          clientCount: clients.size,
          clients: Array.from(clients),
          createdAt: info.createdAt.toISOString(),
          lastActivity: info.lastActivity.toISOString(),
        };
      },
    );

    return {
      totalRooms: roomList.length,
      rooms: roomList,
    };
  }

  /**
   * 클라이언트가 속한 방 ID 조회
   */
  getClientRoom(clientId: string): string | null {
    return this.clientRooms.get(clientId) || null;
  }

  /**
   * 모든 활성 방 ID 목록 조회
   */
  getActiveRoomIds(): string[] {
    return Array.from(this.rooms.keys());
  }

  /**
   * 특정 방의 클라이언트 목록 조회
   */
  getRoomClients(roomId: string): string[] {
    return Array.from(this.rooms.get(roomId) || []);
  }

  /**
   * 클라이언트 연결 해제 처리
   */
  handleClientDisconnect(client: Socket): string {
    const currentRoom = this.removeClientFromRoom(client);
    this.logger.log(`Client ${client.id} disconnected and removed from rooms: ${currentRoom}`);

    return currentRoom;
  }

  /**
   * 방에서 클라이언트 제거 (내부 메소드)
   */
  private removeClientFromRoom(socket: Socket): string {
    const currentRoom = this.clientRooms.get(socket.id);

    if (currentRoom) {

      // 방에 있는 다른 클라이언트들에게 알림
      socket.to(currentRoom).emit(ServerToClientListenerType.USER_DISCONNECTED, {
        socketId: socket.id,
        roomId: currentRoom,
        timestamp: new Date().toISOString(),
      });
      // 내부 데이터 정리
      const roomClients = this.rooms.get(currentRoom);
      if (roomClients) {
        roomClients.delete(socket.id);

        // 방 정보 업데이트
        const info = this.roomInfo.get(currentRoom);
        if (info) {
          info.clients.delete(socket.id);
          info.lastActivity = new Date();
        }

        // 방이 비었으면 방 삭제
        if (roomClients.size === 0) {
          this.rooms.delete(currentRoom);
          this.roomInfo.delete(currentRoom);
          this.logger.log(`Room ${currentRoom} deleted (empty)`);
        }
      }

      this.clientRooms.delete(socket.id);
      this.clientInfo.delete(socket.id);

      return currentRoom;
    }
  }

  /**
   * 방 상태 출력
   */
  private printRoomStatus(): void {
    this.logger.log('=== Room Status ===');

    if (this.rooms.size === 0) {
      this.logger.log('No active rooms.');
      return;
    }

    this.rooms.forEach((clients, roomId) => {
      const info = this.roomInfo.get(roomId)!;
      this.logger.log(
        `🏠 Room: ${roomId} (${
          clients.size
        } clients, created: ${info.createdAt.toISOString()})`,
      );
      clients.forEach((clientId) => {
        this.logger.log(`   - Client: ${clientId}`);
      });
    });

    this.logger.log('================');
  }
}
