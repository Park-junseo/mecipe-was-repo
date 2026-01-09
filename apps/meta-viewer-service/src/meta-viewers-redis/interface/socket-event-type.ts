export enum ServerToClientListenerType {
  ROOM_BROADCAST = 'roomBroadcast',
  ROOM_MESSAGE = 'roomMessage',
  USER_DISCONNECTED = 'userDisconnected',
  ROOM_DATA = 'roomData',

  CONNECT_ERROR = 'connectError',

  CONNECT = 'connect',
  DISCONNECT = 'disconnect',

  INITIALIZE_ENV = 'initializeEnviroment',
  
  // 세션 토큰 전송 (connect 이벤트 후 자동으로 전송됨)
  SESSION_TOKEN = 'sessionToken',
}

export enum ClientToServerListenerType {
  ROOM_BROADCAST = 'broadcastRoomData',
  USER_JOINED = 'joinRoom',
  USER_LEFT = 'leaveRoom',
  SEND_TO_ROOM = 'sendToRoom',

  GET_SOCKET_INFO = 'getSocketInfo',
  GET_CONNECTED_CLIENTS = 'getConnectedClients',
  GET_ROOM_INFO = 'getRoomInfo',
  GET_ROOM_LIST = 'getRoomList',

  INITIALIZE_ENV = 'initializeEnviroment',
  
  // 헬스체크 (30초마다 클라이언트가 전송)
  HEALTH_CHECK = "healthCheck",
}


