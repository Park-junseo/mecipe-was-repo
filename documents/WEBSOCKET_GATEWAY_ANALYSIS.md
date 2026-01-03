# WebSocket API Gateway 통과 가능성 분석

## 현재 구조 분석

### 1. API Gateway 구조

```typescript
// apps/api-gateway/src/gateway/gateway.service.ts
// HttpService (Axios)를 사용한 HTTP 프록시만 지원
async proxyToMetaViewer(path, method, headers, body) {
  const response = await firstValueFrom(
    this.httpService.request({
      method: method as any,
      url: `${this.metaViewerServiceUrl}${path}`,
      // ...
    }),
  );
  return response.data;
}
```

**문제점:**
- ❌ HTTP 요청만 프록시
- ❌ WebSocket Upgrade 요청 미지원
- ❌ 양방향 스트리밍 미지원

### 2. Meta Viewer Service WebSocket 설정

```typescript
// apps/meta-viewer-service/src/meta-veiwers/meta-veiwers.gateway.ts
@WebSocketGateway(Number(process.env.SOCKET_PORT) || 4100, {
  cors: { origin: '*' },
  path: '/meta-viewers',
})
```

**현재 설정:**
- 포트: `4100` (별도 포트)
- 경로: `/meta-viewers`
- 직접 접근 가능

## WebSocket 동작 원리

### 1. WebSocket 핸드셰이크 과정

```
1. 클라이언트 → 서버: HTTP Upgrade 요청
   GET /meta-viewers/?EIO=4&transport=websocket HTTP/1.1
   Host: api-gateway:3000
   Upgrade: websocket
   Connection: Upgrade
   Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
   Sec-WebSocket-Version: 13

2. 서버 → 클라이언트: 101 Switching Protocols
   HTTP/1.1 101 Switching Protocols
   Upgrade: websocket
   Connection: Upgrade
   Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=

3. 이후: 양방향 바이너리/텍스트 프레임 통신
```

### 2. 현재 API Gateway의 한계

**현재 구조:**
```
Client
  ↓ HTTP Upgrade 요청
API Gateway (NestJS + Express)
  ↓ HttpService (Axios) - HTTP만 지원
Meta Viewer Service
  ↓ WebSocket Gateway
```

**문제:**
- `HttpService`는 HTTP 요청/응답 모델만 지원
- WebSocket Upgrade 요청을 프록시할 수 없음
- 연결 후 양방향 통신 불가

## 장애 가능성 분석

### ⚠️ 장애 1: WebSocket 연결 실패

**원인:**
- API Gateway가 WebSocket Upgrade 요청을 처리하지 못함
- `HttpService`가 WebSocket 프로토콜을 지원하지 않음

**증상:**
```javascript
// 클라이언트에서
const socket = io('http://api-gateway:3000/meta-viewers');
// ❌ 연결 실패: 404 또는 500 에러
```

**확인 방법:**
```bash
# API Gateway를 통해 WebSocket 연결 시도
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  http://api-gateway:3000/meta-viewers

# 예상 결과: 404 또는 500 (WebSocket 미지원)
```

### ⚠️ 장애 2: 멀티 레플리카 환경에서의 라우팅 문제

**시나리오:**
```
Client
  ↓
API Gateway (Load Balancer)
  ↓
Meta Viewer Service (Replica 1) ← WebSocket 연결
Meta Viewer Service (Replica 2)
Meta Viewer Service (Replica 3)
```

**문제:**
- WebSocket은 **Stateful** 연결
- 연결 후 모든 메시지는 같은 인스턴스로 가야 함
- Load Balancer가 Sticky Session을 지원해야 함

**해결책:**
- Redis Socket Adapter 사용 (이미 구현됨)
- Sticky Session 설정

### ⚠️ 장애 3: 인증 문제

**현재 구조:**
```
Client
  ↓ JWT 토큰
API Gateway (JWT 검증)
  ↓ x-user-id, x-user-role 헤더
Meta Viewer Service
```

**WebSocket 연결 시:**
- WebSocket은 HTTP 헤더로 인증 정보 전달
- API Gateway를 거치면 JWT 검증 후 헤더 추가 필요
- **하지만 현재 API Gateway는 WebSocket을 지원하지 않음**

### ⚠️ 장애 4: 타임아웃 및 연결 끊김

**문제:**
- HTTP 프록시는 요청/응답 모델
- WebSocket은 지속적인 연결
- 중간에 프록시가 있으면 타임아웃 가능

## 해결 방안

### 방안 1: API Gateway에서 WebSocket 직접 지원 (권장 ⭐⭐⭐⭐)

**구조:**
```
Client
  ↓ WebSocket Upgrade
API Gateway (WebSocket Gateway)
  ↓ WebSocket 연결 유지
Meta Viewer Service (WebSocket Gateway)
```

**구현:**

```typescript
// apps/api-gateway/src/gateway/websocket-gateway.ts
import { WebSocketGateway, WebSocketServer, OnGatewayConnection } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';

@WebSocketGateway({
  port: 3000, // API Gateway 포트
  path: '/meta-viewers',
  cors: { origin: '*' },
})
export class WebSocketGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private metaViewerServiceUrl: string;

  async handleConnection(client: Socket) {
    // JWT 검증 (쿼리 파라미터 또는 헤더에서)
    const token = client.handshake.auth.token || 
                  client.handshake.query.token;
    
    // JWT 검증 로직
    const user = await this.validateJWT(token);
    
    // Meta Viewer Service로 프록시
    // Socket.IO Client를 사용하여 백엔드 연결
    const backendSocket = io(this.metaViewerServiceUrl, {
      auth: { userId: user.id, role: user.role },
    });

    // 메시지 전달
    client.on('*', (event, ...args) => {
      backendSocket.emit(event, ...args);
    });

    backendSocket.on('*', (event, ...args) => {
      client.emit(event, ...args);
    });
  }
}
```

**장점:**
- ✅ API Gateway를 통한 통일된 인증
- ✅ 모든 트래픽이 Gateway를 거침
- ✅ 중앙 집중식 관리

**단점:**
- ❌ 복잡도 증가
- ❌ Gateway가 WebSocket 연결을 유지해야 함
- ❌ 성능 오버헤드

### 방안 2: WebSocket은 직접 접근, HTTP만 Gateway (현실적 ⭐⭐⭐⭐⭐)

**구조:**
```
Client
  ├─ HTTP 요청 → API Gateway → Meta Viewer Service
  └─ WebSocket → Meta Viewer Service (직접)
```

**구현:**

```typescript
// 클라이언트에서
const httpClient = axios.create({
  baseURL: 'http://api-gateway:3000', // HTTP는 Gateway
});

const socket = io('http://meta-viewer-service:4100/meta-viewers', {
  // WebSocket은 직접 접근
  auth: { token: jwtToken }, // JWT 토큰 전달
});
```

**Meta Viewer Service에서 JWT 검증:**

```typescript
// apps/meta-viewer-service/src/meta-veiwers/meta-veiwers.gateway.ts
@WebSocketGateway(Number(process.env.SOCKET_PORT) || 4100, {
  cors: { origin: '*' },
  path: '/meta-viewers',
})
export class MetaVeiwersGateway {
  async handleConnection(client: Socket) {
    // JWT 검증
    const token = client.handshake.auth.token;
    const user = await this.validateJWT(token);
    
    // 인증 실패 시 연결 거부
    if (!user) {
      client.disconnect();
      return;
    }
    
    // user 정보를 socket에 저장
    client.data.user = user;
    
    // 기존 로직 계속
    this.metaVeiwersService.handleConnection(client);
  }
}
```

**장점:**
- ✅ 구현 간단
- ✅ 성능 최적화 (Gateway 우회)
- ✅ WebSocket 특성에 맞음

**단점:**
- ❌ 인증 로직 중복 (Gateway + Service)
- ❌ 두 개의 엔드포인트 (HTTP: Gateway, WS: Service)

### 방안 3: Nginx/Reverse Proxy를 통한 WebSocket 프록시 (운영 환경 ⭐⭐⭐⭐)

**구조:**
```
Client
  ↓
Nginx (Reverse Proxy)
  ├─ HTTP → API Gateway → Services
  └─ WebSocket → Meta Viewer Service (직접)
```

**Nginx 설정:**

```nginx
# HTTP 요청은 API Gateway로
location /api/ {
    proxy_pass http://api-gateway:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

# WebSocket은 Meta Viewer Service로 직접
location /meta-viewers/ {
    proxy_pass http://meta-viewer-service:4100;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    
    # WebSocket 타임아웃 설정
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
}
```

**장점:**
- ✅ 운영 환경에서 검증된 방식
- ✅ Nginx가 WebSocket을 잘 지원
- ✅ 로드 밸런싱 및 헬스 체크 가능

**단점:**
- ❌ 추가 인프라 필요
- ❌ 설정 복잡도

## 현재 상태 확인

### 테스트 시나리오

**1. API Gateway를 통한 WebSocket 연결 시도:**

```javascript
// ❌ 실패 예상
const socket = io('http://api-gateway:3000/meta-viewers', {
  auth: { token: jwtToken }
});
// 예상: 연결 실패 또는 404
```

**2. 직접 접근:**

```javascript
// ✅ 성공 예상
const socket = io('http://meta-viewer-service:4100/meta-viewers', {
  auth: { token: jwtToken }
});
// 예상: 정상 연결
```

## 권장 사항

### 단기: 방안 2 (WebSocket 직접 접근) ⭐⭐⭐⭐⭐

**이유:**
1. 구현 간단
2. 성능 최적화
3. WebSocket 특성에 맞음
4. 현재 구조 변경 최소화

**구현:**
- WebSocket은 `meta-viewer-service:4100`에 직접 접근
- JWT 검증은 `meta-viewer-service`에서 수행
- HTTP 요청만 API Gateway를 거침

### 중기: 방안 3 (Nginx Reverse Proxy) ⭐⭐⭐⭐

**이유:**
1. 운영 환경에서 검증된 방식
2. 단일 엔드포인트 제공 가능
3. 로드 밸런싱 및 헬스 체크

### 장기: 방안 1 (API Gateway WebSocket 지원) ⭐⭐⭐

**이유:**
1. 완전한 중앙 집중식 관리
2. 통일된 인증
3. 하지만 복잡도가 높음

## 결론

### 현재 상태

**❌ API Gateway를 통한 WebSocket 연결은 불가능합니다.**

**이유:**
1. API Gateway가 HTTP 프록시만 지원
2. WebSocket Upgrade 요청 처리 불가
3. 양방향 통신 미지원

### 권장 방안

**WebSocket은 직접 접근, HTTP만 Gateway를 거치도록 구성:**

```
HTTP 요청: Client → API Gateway → Meta Viewer Service
WebSocket: Client → Meta Viewer Service (직접)
```

**구현:**
1. WebSocket 연결은 `meta-viewer-service:4100`에 직접
2. JWT 검증은 `meta-viewer-service`에서 수행
3. HTTP 요청만 API Gateway를 거침

**운영 환경에서는 Nginx를 통한 프록시를 고려하되, 현재는 직접 접근이 가장 현실적입니다.**



