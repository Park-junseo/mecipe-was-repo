export interface ClientMessage {
  type: string;
  timestamp: number;
  data: any;
  clientId: string;
}

export interface BroadcastData {
  roomId: string;
  timestamp: number;
  messages: ClientMessage[];
}

export enum RoomDataMessageType {
  // 게임 데이터 메시지
  PLAYER_TRANSFORM = 'playerTransform',
  PLAYER_ANIMATION = 'playerAnimation',
  CUSTOM_EVENT = 'customEvent',
  
  // 룸 이벤트 메시지 (브로드캐스트 큐로 처리하여 순서 보장)
  USER_JOINED = 'userJoined',
  USER_LEFT = 'userLeft',
  
  // 주기적 룸 멤버 목록 브로드캐스트 (정리 작업 후)
  READ_ROOM_MEMBER = 'readRoomMember',
}


