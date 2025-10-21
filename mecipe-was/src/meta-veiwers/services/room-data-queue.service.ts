import { Injectable, Logger } from '@nestjs/common';
import {
  RoomDataQueue,
} from '../interface/socket-data-queue';
import { ClientMessage } from '../interface/broadcast-data-type';

@Injectable()
export class RoomDataQueueService {
  private readonly logger = new Logger(RoomDataQueueService.name);
  private roomQueues: RoomDataQueue = {};

  /**
   * 방별 데이터 큐에 데이터 추가
   * 같은 타입의 데이터가 있으면 최신 데이터로 덮어씀
   */
  enqueueData(roomId: string, data: ClientMessage): void {
    // 방 큐가 없으면 생성
    if (!this.roomQueues[roomId]) {
      this.roomQueues[roomId] = [];
    }


    this.roomQueues[roomId].push(data);

    this.logger.debug(`Data queued for room ${roomId}, type: ${data.type}`);
  }

  /**
   * 특정 방의 모든 큐 데이터를 가져오고 큐를 비움
   */
  dequeueAllData(roomId: string): ClientMessage[] {
    const roomQueue = this.roomQueues[roomId];

    if (!roomQueue || Object.keys(roomQueue).length === 0) {
      return [];
    }

    // 모든 데이터를 배열로 변환
    const dataArray = roomQueue;

    // 큐 비우기
    this.roomQueues[roomId] = [];

    this.logger.debug(
      `Dequeued ${dataArray.length} data items from room ${roomId}`,
    );

    return dataArray;
  }

  /**
   * 특정 방에 큐된 데이터가 있는지 확인
   */
  hasQueuedData(roomId: string): boolean {
    const roomQueue = this.roomQueues[roomId];
    return roomQueue && Object.keys(roomQueue).length > 0;
  }

  /**
   * 특정 방의 큐 상태 조회
   */
  getRoomQueueStatus(roomId: string): { dataTypes: string[]; count: number } {
    const roomQueue = this.roomQueues[roomId];

    if (!roomQueue) {
      return { dataTypes: [], count: 0 };
    }

    const dataTypes = Object.keys(roomQueue);
    return {
      dataTypes,
      count: dataTypes.length,
    };
  }

  /**
   * 모든 방의 큐 상태 조회
   */
  getAllRoomQueueStatus(): {
    [roomId: string]: { dataTypes: string[]; count: number };
  } {
    const status: { [roomId: string]: { dataTypes: string[]; count: number } } =
      {};

    Object.keys(this.roomQueues).forEach((roomId) => {
      status[roomId] = this.getRoomQueueStatus(roomId);
    });

    return status;
  }

  /**
   * 빈 방의 큐 정리
   */
  cleanupEmptyRooms(activeRooms: string[]): void {
    const queuedRooms = Object.keys(this.roomQueues);

    queuedRooms.forEach((roomId) => {
      if (!activeRooms.includes(roomId)) {
        delete this.roomQueues[roomId];
        this.logger.debug(`Cleaned up queue for inactive room: ${roomId}`);
      }
    });
  }

  /**
   * 전체 큐 초기화
   */
  clearAllQueues(): void {
    this.roomQueues = {};
    this.logger.log('All room queues cleared');
  }
}
