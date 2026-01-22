# 클라이언트 재연결 가이드

## 개요

이 문서는 `meta-viewer-service`와 통신하는 클라이언트가 안정적으로 재연결하는 방법을 설명합니다.

## 핵심 개념

### 1. 세션 토큰 (Session Token)
- 서버가 클라이언트에게 발급하는 임시 토큰
- 재연결 시 이전 상태를 복원하는 데 사용
- 로컬 스토리지에 저장하여 유지
- TTL: 10분 (서버 설정)

### 2. 자동 재연결
- Socket.IO가 자동으로 재연결을 시도
- 재연결 시 `auth` 객체의 `sessionToken`이 자동으로 전송됨
- 서버가 세션을 복원하고 이전 룸에 자동 재입장

### 3. 헬스체크
- 클라이언트가 30초마다 `healthCheck` 이벤트 전송
- 서버가 연결 상태를 확인하고 TTL 갱신
- 연결이 끊어졌다가 재연결된 경우 자동으로 룸 재입장

## 구현 예시

### TypeScript/JavaScript

```typescript
import { io, Socket } from 'socket.io-client';

class MetaViewerClient {
  private socket: Socket | null = null;
  private sessionToken: string | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private currentRoomId: string | null = null;

  constructor(private serverUrl: string) {
    // 로컬 스토리지에서 세션 토큰 복원
    this.sessionToken = localStorage.getItem('metaViewerSessionToken');
  }

  connect(): void {
    // Socket.IO v4.5+ 권장 방식: 단일 객체로 전달
    this.socket = io({
      url: this.serverUrl,
      path: '/meta-viewers',
      auth: this.sessionToken ? { sessionToken: this.sessionToken } : {},
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // 연결 성공
    this.socket.on('connect', () => {
      console.log('✅ Connected to server');
      this.startHeartbeat();
    });

    // 세션 토큰 수신 (서버에서 자동 전송)
    this.socket.on('sessionToken', (data: {
      sessionToken: string;
      socketId: string;
      restored: boolean;
      roomId: string | null;
      reason?: string;
    }) => {
      // 세션 토큰 저장
      this.sessionToken = data.sessionToken;
      localStorage.setItem('metaViewerSessionToken', this.sessionToken);

      if (data.restored && data.roomId) {
        console.log(`✅ Session restored, rejoined room: ${data.roomId}`);
        this.currentRoomId = data.roomId;
        // 세션이 복원되었고 룸이 있으면 자동으로 재입장됨
        this.onRoomJoined(data.roomId);
      } else if (data.reason === 'TOKEN_EXPIRED') {
        console.log('⚠️ Session token expired, new token received');
        // 토큰 만료 시 처리
        this.onTokenExpired();
      } else {
        console.log('ℹ️ New session token received');
      }
    });

    // 연결 끊김
    this.socket.on('disconnect', (reason: string) => {
      console.log(`❌ Disconnected: ${reason}`);
      this.stopHeartbeat();

      if (reason === 'io server disconnect') {
        // 서버가 의도적으로 연결을 끊은 경우
        this.handleServerDisconnect();
      }
      // 네트워크 오류 등으로 인한 끊김은 Socket.IO가 자동 재연결
    });

    // 재연결 시도
    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}`);
    });

    // 재연결 성공
    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
      // 재연결 시 auth에 sessionToken이 자동으로 포함됨
      // 서버가 세션을 복원하고 룸에 재입장시킴
    });

    // 재연결 실패
    this.socket.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed');
      this.handleReconnectFailed();
    });

    // 연결 에러
    this.socket.on('connect_error', (error: Error) => {
      console.error('❌ Connection error:', error);
    });

    // 룸 브로드캐스트 수신
    this.socket.on('roomBroadcast', (data: any) => {
      this.handleRoomBroadcast(data);
    });

    // 사용자 입장 알림 (USER_JOINED 메시지)
    this.socket.on('roomBroadcast', (data: any) => {
      if (data.messages) {
        for (const message of data.messages) {
          if (message.type === 'userJoined') {
            this.handleUserJoined(message.data);
          } else if (message.type === 'userLeft') {
            this.handleUserLeft(message.data);
          }
        }
      }
    });
  }

  // 헬스체크 시작 (30초마다)
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('healthCheck');
      }
    }, 30000); // 30초
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // 룸 입장
  joinRoom(roomId: string): void {
    if (!this.socket?.connected) {
      console.error('❌ Socket not connected');
      return;
    }

    this.socket.emit('joinRoom', {
      roomId,
      sessionToken: this.sessionToken, // 세션 토큰 포함
    });

    this.currentRoomId = roomId;
  }

  // 룸 퇴장
  leaveRoom(): void {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit('leaveRoom', {});
    this.currentRoomId = null;
  }

  // 룸 데이터 브로드캐스트
  broadcastRoomData(type: string, data: any): void {
    if (!this.socket?.connected) {
      console.error('❌ Socket not connected');
      return;
    }

    this.socket.emit('broadcastRoomData', {
      type,
      data,
    });
  }

  // 이벤트 핸들러 (사용자 정의)
  private onRoomJoined(roomId: string): void {
    // 룸 입장 시 처리
    console.log(`Joined room: ${roomId}`);
  }

  private onTokenExpired(): void {
    // 토큰 만료 시 처리
    // 필요 시 사용자에게 알림
  }

  private handleServerDisconnect(): void {
    // 서버 의도적 연결 끊김 처리
    // 세션 토큰 삭제
    localStorage.removeItem('metaViewerSessionToken');
    this.sessionToken = null;
    this.currentRoomId = null;

    // 사용자에게 알림
    alert('서버와의 연결이 끊어졌습니다. 페이지를 새로고침해주세요.');
  }

  private handleReconnectFailed(): void {
    // 재연결 실패 처리
    alert('서버에 연결할 수 없습니다. 페이지를 새로고침해주세요.');
  }

  private handleRoomBroadcast(data: any): void {
    // 룸 브로드캐스트 처리
    console.log('Room broadcast:', data);
  }

  private handleUserJoined(data: any): void {
    // 사용자 입장 처리
    console.log('User joined:', data);
  }

  private handleUserLeft(data: any): void {
    // 사용자 퇴장 처리
    console.log('User left:', data);
  }

  // 연결 해제
  disconnect(): void {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// 사용 예시
const client = new MetaViewerClient('http://localhost:4100');
client.connect();

// 룸 입장
client.joinRoom('cafe-leo');

// 룸 데이터 브로드캐스트
client.broadcastRoomData('playerTransform', {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
});
```

## 재연결 플로우

```
1. 초기 연결
   ├─ sessionToken이 있으면 auth에 포함
   └─ 없으면 빈 auth로 연결

2. 서버에서 sessionToken 이벤트 수신
   ├─ restored=true: 이전 룸에 자동 재입장됨
   └─ restored=false: 새 세션, 수동으로 joinRoom 호출 필요

3. 헬스체크 시작 (30초마다)
   └─ healthCheck 이벤트 전송

4. 연결 끊김 감지
   ├─ 네트워크 오류: Socket.IO 자동 재연결
   └─ 서버 의도적 끊김: 수동 처리 필요

5. 재연결 성공
   ├─ auth에 sessionToken 자동 포함
   ├─ 서버가 세션 복원 시도
   └─ sessionToken 이벤트 수신

6. 재연결 실패
   └─ 사용자에게 알림 및 수동 재연결 유도
```

## 주의사항

1. **세션 토큰 저장**: 반드시 로컬 스토리지에 저장하여 유지
2. **헬스체크**: 30초마다 전송하여 연결 상태 유지
3. **재연결 실패 처리**: 사용자에게 명확한 피드백 제공
4. **토큰 만료**: `TOKEN_EXPIRED` 이유를 받으면 새 토큰으로 처리
5. **룸 상태 동기화**: `roomBroadcast` 이벤트로 룸 상태 동기화

## 에러 처리

### 일반적인 에러 시나리오

1. **네트워크 끊김**
   - Socket.IO가 자동 재연결 시도
   - 재연결 성공 시 세션 자동 복원

2. **서버 재시작**
   - 클라이언트가 재연결 시도
   - 세션 토큰이 유효하면 세션 복원
   - 세션 토큰이 만료되면 새 토큰 발급

3. **세션 토큰 만료**
   - 서버가 `TOKEN_EXPIRED` 이유와 함께 새 토큰 전송
   - 클라이언트는 새 토큰을 저장하고 수동으로 룸 재입장

4. **재연결 실패**
   - 사용자에게 알림
   - 페이지 새로고침 또는 수동 재연결 유도
