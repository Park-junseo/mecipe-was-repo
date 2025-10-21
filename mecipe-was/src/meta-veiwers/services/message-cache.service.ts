import { Injectable, Logger } from "@nestjs/common";
import { MessageCache } from "../utils/message-cache";
import { Socket } from "socket.io";
import { BroadcastData, ClientMessage } from "../interface/broadcast-data-type";
import { ServerToClientListenerType } from "../interface/socket-event-type";

@Injectable()
export class MessageCacheService {
    private readonly logger = new Logger(MessageCacheService.name);
    private readonly roomMessageCache = new Map<string, MessageCache>(); // key: roomId, value: MessageCache
    private readonly cacheTypeMap = new Map<string, CacheTypeFlag>(); // 타입 별 캐시 타입 지정: type -> CacheTypeFlag

    constructor() {
        this.logger.log('MessageCacheService initialized');
    }

    /*
     * 캐시 타입 선언
     * @param type 캐시 타입
     * @param options 캐시 타입 옵션
     * @returns this 빌드 패턴 적용
     */
    declareCacheType(type: string, options: CacheTypeFlag) {
        this.cacheTypeMap.set(type, options);
        return this;
    }

    /*
     * 메시지 캐시 저장
     * @param clientId 클라이언트 ID
     * @param roomId 방 ID
     * @param type 메시지 타입
     * @param data 메시지 데이터
     */
    setMessageCache(clientId: string, roomId: string, type: string, data: ClientMessage) {
        const cacheType = this.cacheTypeMap.get(type);
        if (cacheType === undefined) return;
        if (!this.roomMessageCache.has(roomId)) {
            this.roomMessageCache.set(roomId, new MessageCache());
        }
        this.roomMessageCache.get(roomId)?.setMessageCache(
            clientId,
            type,
            data,
            // 모든 레코드 기록 모드가 아닌 경우 덮어쓰기
            !(cacheType & CacheTypeFlag.RECORD_EVERY) ? true : false
        );
    }

    /* 
     * 메시지 캐시 제거
     * @param clientId 클라이언트 ID
     * @param roomId 방 ID
     * @description 모든 캐시 타입에 대해 메시지 캐시 제거
     */
    clearMessageCache(clientId: string, roomId: string) {
        this.cacheTypeMap.forEach((cacheType, type) => {
            this.clearMessageCacheWithCacheType(clientId, roomId, type, cacheType);
        });
    }

    /*
     * 방 입장한 클라이언트에게 메시지 풀 전송
     * @param socket 소켓, 해당 소켓에 들어갈 이벤트 결정
     * @param roomId 방 ID
     */
    executeJoinClientEvent(socket: Socket, roomId: string) {
        const messagePool: ClientMessage[] = [];
        this.cacheTypeMap.forEach((cacheType, type) => {
            messagePool.push(...this.getJoinClientEventByTypeMessagePool(roomId, type, cacheType));
        });

        const broadcastData: BroadcastData = {
            roomId,
            timestamp: Date.now(),
            messages: messagePool
        };

        // 캐시타입이 등록된 타입에 한하여 메시지 풀 브로드캐스트 전송
        socket.emit(ServerToClientListenerType.INITIALIZE_ENV, broadcastData);

        this.logRoomMessagePoolInfo(roomId, messagePool.length);
    }

    /*
     * 방 퇴장한 클라이언트에게 메시지 풀 전송
     * @param socket 소켓, 해당 소켓에 들어갈 이벤트 결정
     * @param roomId 방 ID
     */
    executeLeaveClientEvent(socket: Socket, roomId: string) {
        const messagePool: ClientMessage[] = [];
        this.cacheTypeMap.forEach((cacheType, type) => {
            messagePool.push(...this.getLeaveClientEventByTypeMessagePool(roomId, type, cacheType));
            this.clearMessageCacheWithCacheType(socket.id, roomId, type, cacheType);
        });

        const broadcastData: BroadcastData = {
            roomId,
            timestamp: Date.now(),
            messages: messagePool
        };

        // 캐시타입이 등록된 타입에 한하여 메시지 풀 브로드캐스트 전송
        socket.emit(ServerToClientListenerType.INITIALIZE_ENV, broadcastData);

        this.logRoomMessagePoolInfo(roomId, messagePool.length);
    }

    /*
     * 방 입장한 클라이언트에게 메시지 풀 전송
     * @param roomId 방 ID
     * @param type 메시지 타입
     * @param typesCacheType 캐시 타입
     * @returns 메시지 풀
     */
    private getJoinClientEventByTypeMessagePool(roomId: string, type: string, typesCacheType: CacheTypeFlag) {
        const messagePool = this.getRoomMessagePool(roomId, type, typesCacheType, CacheTypeFlag.JOIN_EVENT);
        if (messagePool === null) return;

        return messagePool;
    }

    /*
     * 방 퇴장한 클라이언트에게 메시지 풀 전송
     * @param roomId 방 ID
     * @param type 메시지 타입
     * @param typesCacheType 캐시 타입, 선언한 캐시 타입이 존재하지 않으면 패스
     * @returns 메시지 풀
     */
    private getLeaveClientEventByTypeMessagePool(roomId: string, type: string, typesCacheType: CacheTypeFlag) {
        const messagePool = this.getRoomMessagePool(roomId, type, typesCacheType, CacheTypeFlag.LEAVE_EVENT);
        if (messagePool === null) return;

        return messagePool;
    }

    private clearMessageCacheWithCacheType(clientId: string, roomId: string, type: string, typesCacheType: CacheTypeFlag) {
        if (typesCacheType & CacheTypeFlag.NON_VOLATILE) {
            this.logger.warn(`The message pool still was maintained: ${type}`);
        } else {
            this.roomMessageCache.get(roomId)?.clearMessageCache(clientId, type);
        }
    }

    /*
     * 방 메시지 풀 정보 조회
     * @param roomId 방 ID
     * @param type 메시지 타입
     * @param targetCacheType 작동할 캐시 타입
     * @returns 메시지 풀풀
     */
    private getRoomMessagePool(roomId: string, type: string, typesCacheType: CacheTypeFlag, targetCacheType: CacheTypeFlag) {
        // 타입에 해당하는 캐시타입이 작동할 캐시타입에 포함되지 않으면 패스
        if (!(typesCacheType & targetCacheType)) return null;

        if (!this.roomMessageCache.has(roomId)) {
            this.roomMessageCache.set(roomId, new MessageCache());
        }

        return this.roomMessageCache.get(roomId)?.getAllClientMessageCache(type) ?? [];
    }

    private logRoomMessagePoolInfo(roomId: string, messagePoolSize: number) {
        this.logger.log(`Room message pool (${messagePoolSize}) sent: ${roomId}`);
        const cacheTypes = [...this.cacheTypeMap.entries()].filter(([_, cacheType]) => cacheType & (CacheTypeFlag.RECORD_EVERY | CacheTypeFlag.NON_VOLATILE));
        if(cacheTypes.length > 0) {
            this.logger.warn(`The Type of Room message pool (${messagePoolSize}) can be very heavy: ${cacheTypes.map(([type, _]) => type).join(', ')} ${roomId}`);
        }
    }


}

export enum CacheTypeFlag {
    JOIN_EVENT = 1, // 방 입장 시 전송될 이벤트
    LEAVE_EVENT = 1 << 2, // 방 퇴장 시 전송될 이벤트
    RECORD_EVERY = 1 << 3, // 모든 레코드 기록 모드
    NON_VOLATILE = 1 << 4, // 비휘발성 모드
}

export function getCacheTypeFlag(...flags: CacheTypeFlag[]): CacheTypeFlag {
    return flags.reduce((acc, flag) => acc | flag, 0);
}