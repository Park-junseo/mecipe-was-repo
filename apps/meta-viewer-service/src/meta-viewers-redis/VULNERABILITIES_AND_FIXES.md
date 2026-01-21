# Meta Viewers Redis 모듈 허점 분석 및 개선 방안

## 🔴 발견된 주요 허점

### 1. **Socket 객체와 실제 연결 상태 불일치**
**문제:**
- `connectedClients` Map에 저장된 Socket 객체가 실제로 연결이 끊어졌는지 확인하지 않음
- `socket.connected` 상태를 주기적으로 확인하지 않음
- 메모리 누수 가능성: 끊어진 소켓이 Map에 남아있음

**영향:**
- 시간이 지나면서 `connectedClients`에 유효하지 않은 소켓이 누적됨
- `getSocketInfo()`, `getConnectedClients()`가 잘못된 정보 반환

**해결 방안:**
```typescript
// handleConnection에서 연결 상태 확인
if (!client.connected) {
  this.connectedClients.delete(clientId);
  return;
}

// 주기적으로 연결 상태 확인 및 정리
private cleanupDisconnectedClients() {
  for (const [clientId, client] of this.connectedClients.entries()) {
    if (!client.connected) {
      this.connectedClients.delete(clientId);
      this.logger.debug(`Removed disconnected client: ${clientId}`);
    }
  }
}
```

---

### 2. **Redis와 Socket.IO 룸 상태 불일치**
**문제:**
- Redis에는 룸 정보가 있지만 Socket.IO 룸에 클라이언트가 없는 경우 발생
- 서버 재시작, 네트워크 끊김, 예외 상황에서 발생
- 헬스체크에서 자동 재입장을 시도하지만, Socket 객체가 없으면 실패

**영향:**
- 클라이언트는 Redis에 룸 정보가 있어도 실제로 메시지를 받지 못함
- `USER_JOINED` 메시지가 브로드캐스트되지 않아 다른 클라이언트가 입장을 인지하지 못함

**해결 방안:**
```typescript
// handleHeartbeat에서 Socket.IO 룸 상태 확인 및 재입장
async handleHeartbeat(client: Socket): Promise<{ success: boolean; message: string }> {
  const clientId = client.id;
  const currentRoom = await this.roomService.getClientRoom(clientId);
  
  if (currentRoom) {
    const isInSocketIORoom = client.rooms.has(currentRoom);
    
    if (!isInSocketIORoom) {
      // Socket.IO 룸에 없으면 재입장
      await client.join(currentRoom);
      // USER_JOINED 메시지 재전송 필요
    }
  }
  
  return await this.roomService.handleHeartbeat(clientId);
}
```

---

### 3. **세션 토큰 만료 시 클라이언트와 서버 불일치**
**문제:**
- 서버에서 세션 토큰이 만료되면 새 토큰을 생성하지만, 클라이언트는 여전히 이전 토큰을 사용
- 클라이언트가 재연결할 때 만료된 토큰을 보내면 복원 실패
- 새 토큰을 생성하지만 클라이언트는 이를 받지 못함

**영향:**
- 클라이언트가 재연결해도 세션 복원 실패
- 클라이언트는 계속 이전 토큰을 사용하려고 시도

**해결 방안:**
```typescript
// handleConnection에서 토큰 만료 시 명확한 응답
if (providedToken) {
  const restoreResult = await this.roomService.restoreSessionByToken(providedToken, client);
  
  if (!restoreResult.restored) {
    // 토큰 만료 시 새 토큰 생성 및 클라이언트에 명확히 알림
    sessionToken = await this.roomService.createSessionToken(clientId);
    client.emit(ServerToClientListenerType.SESSION_TOKEN, {
      sessionToken,
      socketId: clientId,
      restored: false,
      roomId: null,
      reason: 'TOKEN_EXPIRED', // 만료 이유 명시
    });
  }
}
```

---

### 4. **클라이언트 재연결 시나리오 부족**
**문제:**
- 클라이언트가 재연결할 때 세션 토큰을 제대로 전달하지 않으면 복원 실패
- `auth` 또는 `query`에서 토큰을 가져오지만, 클라이언트가 재연결 시 토큰을 보내지 않을 수 있음
- 재연결 후 자동으로 룸에 재입장하지 않음

**영향:**
- 클라이언트가 재연결해도 이전 상태를 복원하지 못함
- 수동으로 다시 `joinRoom`을 호출해야 함

**해결 방안:**
- 클라이언트 측 재연결 로직 필요 (아래 클라이언트 설계 참조)

---

### 5. **정리 작업의 타이밍 문제**
**문제:**
- 60초마다 정리 작업을 실행하지만, 그 사이에 상태 불일치가 발생할 수 있음
- 헬스체크는 30초마다인데, 정리 작업은 60초마다 실행
- 정리 작업 중에 클라이언트가 재연결하면 문제 발생 가능

**영향:**
- 활성 클라이언트가 정리될 수 있음
- 정리 작업과 헬스체크 사이의 경쟁 조건

**해결 방안:**
```typescript
// 정리 작업 전에 헬스체크 시간 확인
const timeSinceLastActivity = Date.now() - lastActivity;
const safetyMargin = 10 * 1000; // 10초 여유

if (timeSinceLastActivity > (this.heartbeatTimeout * 1000 + safetyMargin)) {
  // 정리 대상
}
```

---

### 6. **USER_JOINED 메시지 중복 브로드캐스트 가능성**
**문제:**
- 헬스체크에서 자동 재입장 시 `USER_JOINED` 메시지가 다시 브로드캐스트될 수 있음
- 클라이언트가 이미 룸에 있는데도 `USER_JOINED`가 다시 전송됨

**영향:**
- 다른 클라이언트가 같은 클라이언트의 입장을 여러 번 받을 수 있음
- 클라이언트 목록 중복 표시

**해결 방안:**
```typescript
// 재입장 시 USER_JOINED 메시지 전송 여부 플래그 추가
await this.roomService.joinRoom(client, currentRoom, sessionToken, {
  skipJoinMessage: true, // 자동 재입장 시 메시지 스킵
});
```

---

### 7. **에러 처리 부족**
**문제:**
- Redis 연결 실패 시 조용히 실패하고 계속 진행
- 클라이언트는 에러를 인지하지 못함
- 부분 실패 시 상태 불일치 발생

**영향:**
- 클라이언트는 정상 동작하는 것처럼 보이지만 실제로는 메시지를 받지 못함
- 디버깅 어려움

**해결 방안:**
- 중요한 작업 실패 시 클라이언트에 에러 이벤트 전송
- 재시도 로직 개선

---

## 🟢 클라이언트 재연결 설계

### 클라이언트 측 재연결 전략

```typescript
// 클라이언트 코드 예시 (TypeScript/JavaScript)

class MetaViewerClient {
  private socket: Socket | null = null;
  private sessionToken: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // 1초부터 시작
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isReconnecting = false;

  connect(url: string) {
    // 로컬 스토리지에서 세션 토큰 복원
    this.sessionToken = localStorage.getItem('metaViewerSessionToken');
    
    this.socket = io(url, {
      path: '/meta-viewers',
      auth: this.sessionToken ? { sessionToken: this.sessionToken } : {},
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 5000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    // 연결 성공
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      this.startHeartbeat();
    });

    // 세션 토큰 수신 (서버에서 전송)
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
        console.log(`Session restored, rejoined room: ${data.roomId}`);
        // 세션이 복원되었고 룸이 있으면 자동으로 재입장됨
        // 추가 작업 필요 시 여기서 처리
      } else if (data.reason === 'TOKEN_EXPIRED') {
        console.log('Session token expired, new token received');
        // 토큰 만료 시 클라이언트 측 정리 작업
        this.handleTokenExpired();
      }
    });

    // 연결 끊김
    this.socket.on('disconnect', (reason: string) => {
      console.log(`Disconnected: ${reason}`);
      this.stopHeartbeat();
      
      if (reason === 'io server disconnect') {
        // 서버가 의도적으로 연결을 끊은 경우 (예: 인증 실패)
        // 재연결하지 않고 사용자에게 알림
        this.handleServerDisconnect();
      } else {
        // 네트워크 오류 등으로 인한 끊김
        this.isReconnecting = true;
      }
    });

    // 재연결 시도
    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log(`Reconnection attempt ${attemptNumber}`);
      this.reconnectAttempts = attemptNumber;
    });

    // 재연결 성공
    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log(`Reconnected after ${attemptNumber} attempts`);
      // 재연결 시 세션 토큰을 다시 전송
      if (this.sessionToken) {
        // Socket.IO는 자동으로 auth를 다시 전송하므로 추가 작업 불필요
        // 하지만 명시적으로 joinRoom을 다시 호출할 수도 있음
      }
    });

    // 재연결 실패
    this.socket.on('reconnect_failed', () => {
      console.error('Reconnection failed');
      this.handleReconnectFailed();
    });

    // 에러 수신
    this.socket.on('connect_error', (error: Error) => {
      console.error('Connection error:', error);
      this.handleConnectionError(error);
    });

    // 룸 브로드캐스트 수신
    this.socket.on('roomBroadcast', (data: BroadcastData) => {
      this.handleRoomBroadcast(data);
    });

    // 사용자 입장 알림
    this.socket.on('userJoined', (data: any) => {
      this.handleUserJoined(data);
    });

    // 사용자 퇴장 알림
    this.socket.on('userLeft', (data: any) => {
      this.handleUserLeft(data);
    });
  }

  // 헬스체크 시작 (30초마다)
  private startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('healthCheck');
      }
    }, 30000); // 30초
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // 룸 입장
  joinRoom(roomId: string) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('joinRoom', {
      roomId,
      sessionToken: this.sessionToken, // 세션 토큰 포함
    });
  }

  // 룸 퇴장
  leaveRoom() {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit('leaveRoom', {});
  }

  // 토큰 만료 처리
  private handleTokenExpired() {
    // 이전 세션 관련 데이터 정리
    // 필요 시 사용자에게 알림
  }

  // 서버 의도적 연결 끊김 처리
  private handleServerDisconnect() {
    // 세션 토큰 삭제
    localStorage.removeItem('metaViewerSessionToken');
    this.sessionToken = null;
    
    // 사용자에게 알림
    alert('서버와의 연결이 끊어졌습니다. 다시 연결해주세요.');
  }

  // 재연결 실패 처리
  private handleReconnectFailed() {
    // 사용자에게 알림
    alert('서버에 연결할 수 없습니다. 페이지를 새로고침해주세요.');
  }

  // 연결 에러 처리
  private handleConnectionError(error: Error) {
    // 에러 로깅 및 사용자 알림
    console.error('Connection error:', error);
  }

  // 정리
  disconnect() {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
```

### 클라이언트 재연결 플로우

```
1. 초기 연결
   ↓
2. 서버에서 sessionToken 수신 및 저장
   ↓
3. joinRoom 호출 (sessionToken 포함)
   ↓
4. 헬스체크 시작 (30초마다)
   ↓
5. 연결 끊김 감지
   ↓
6. Socket.IO 자동 재연결 시도
   ↓
7. 재연결 성공 시:
   - auth에 sessionToken 자동 전송
   - 서버에서 세션 복원 시도
   - sessionToken 이벤트 수신
   - restored=true면 자동으로 룸 재입장됨
   ↓
8. 재연결 실패 시:
   - 사용자에게 알림
   - 수동 재연결 또는 페이지 새로고침
```

---

## 🔧 권장 수정 사항

### 우선순위 1 (즉시 수정 필요)
1. ✅ Socket 객체 연결 상태 확인 및 정리
2. ✅ Redis와 Socket.IO 룸 상태 불일치 해결
3. ✅ 세션 토큰 만료 시 클라이언트 알림

### 우선순위 2 (중요)
4. ✅ 정리 작업 타이밍 개선
5. ✅ USER_JOINED 메시지 중복 방지

### 우선순위 3 (개선)
6. ✅ 에러 처리 개선
7. ✅ 클라이언트 재연결 로직 구현
