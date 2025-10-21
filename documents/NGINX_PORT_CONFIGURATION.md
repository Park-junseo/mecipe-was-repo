# Nginx 포트 설정 가이드

Nginx가 NestJS 애플리케이션으로 프록시할 때 사용하는 포트를 환경 변수로 관리하는 방법을 설명합니다.

## 개요

Nginx는 외부 요청을 받아서 내부 NestJS 컨테이너로 전달합니다. 이때 사용되는 포트를 환경 변수로 관리하면:

- ✅ 포트 변경이 쉬움 (.env 파일만 수정)
- ✅ 일관성 있는 포트 관리
- ✅ 환경별로 다른 포트 사용 가능
- ✅ 설정 파일을 하드코딩하지 않음

## 포트 설정 흐름

```
.env 파일
├── PORT=4000          (HTTP/API 포트)
└── SOCKET_PORT=4100   (WebSocket 포트)
    ↓
docker-compose.yml
├── app 서비스: PORT=${PORT}
├── nginx 서비스: APP_PORT=${PORT}, SOCKET_PORT=${SOCKET_PORT}
    ↓
nginx/docker-entrypoint.sh
├── envsubst로 변수 치환
    ↓
nginx/conf.d/default.conf (최종 생성)
├── location /api → proxy_pass http://app:4000
├── location /socket.io → proxy_pass http://app:4100
└── location / → proxy_pass http://app:4000
```

## 파일별 설정

### 1. `.env` 파일

```env
# 애플리케이션 포트
PORT=4000          # NestJS HTTP 서버 포트
SOCKET_PORT=4100   # WebSocket 서버 포트
```

**설명:**
- `PORT`: NestJS 메인 애플리케이션이 리슨하는 포트
- `SOCKET_PORT`: WebSocket (socket.io) 서버 포트

### 2. `docker-compose.yml`

#### app 서비스
```yaml
services:
  app:
    ports:
      - "${PORT:-4000}:${PORT:-4000}"
      - "${SOCKET_PORT:-4100}:${SOCKET_PORT:-4100}"
    environment:
      - PORT=${PORT:-4000}
      - SOCKET_PORT=${SOCKET_PORT:-4100}
```

#### nginx 서비스
```yaml
  nginx:
    environment:
      - DOMAIN_NAME=${DOMAIN_NAME}
      - APP_PORT=${PORT:-4000}        # NestJS HTTP 포트
      - SOCKET_PORT=${SOCKET_PORT:-4100}  # WebSocket 포트
```

**중요:**
- `APP_PORT`는 `.env`의 `PORT` 값을 사용
- Nginx는 이 포트로 NestJS에 프록시

### 3. `nginx/conf.d/default.conf.template`

```nginx
# API 요청
location /api {
    proxy_pass http://app:${APP_PORT};  # 환경 변수 사용
    # ...
}

# WebSocket
location /socket.io {
    proxy_pass http://app:${SOCKET_PORT};  # 환경 변수 사용
    # ...
}

# 기본 루트
location / {
    proxy_pass http://app:${APP_PORT};  # 환경 변수 사용
    # ...
}
```

### 4. `nginx/docker-entrypoint.sh`

```bash
#!/bin/sh
set -e

# 환경 변수 기본값 설정
export DOMAIN_NAME=${DOMAIN_NAME:-localhost}
export APP_PORT=${APP_PORT:-4000}
export SOCKET_PORT=${SOCKET_PORT:-4100}

echo "Configuring Nginx..."
echo "  Domain: $DOMAIN_NAME"
echo "  App Port: $APP_PORT"
echo "  Socket Port: $SOCKET_PORT"

# envsubst로 변수 치환
envsubst '${DOMAIN_NAME} ${APP_PORT} ${SOCKET_PORT}' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

nginx -t
exec "$@"
```

## 포트 변경 방법

### 시나리오 1: HTTP 포트만 변경 (4000 → 3000)

```bash
# .env 파일 수정
PORT=3000
SOCKET_PORT=4100  # 그대로 유지

# 재시작
docker compose down
docker compose up -d
```

결과:
- API 요청: `http://app:3000` ✅
- WebSocket: `http://app:4100` ✅
- 루트: `http://app:3000` ✅

### 시나리오 2: WebSocket 포트만 변경 (4100 → 8080)

```bash
# .env 파일 수정
PORT=4000         # 그대로 유지
SOCKET_PORT=8080

# 재시작
docker compose down
docker compose up -d
```

결과:
- API 요청: `http://app:4000` ✅
- WebSocket: `http://app:8080` ✅
- 루트: `http://app:4000` ✅

### 시나리오 3: 모든 포트 변경

```bash
# .env 파일 수정
PORT=5000
SOCKET_PORT=5100

# 재시작
docker compose down
docker compose up -d
```

## 환경별 포트 설정

### 개발 환경

```env
# .env.development
PORT=4000
SOCKET_PORT=4100
```

### 스테이징 환경

```env
# .env.staging
PORT=4000
SOCKET_PORT=4100
```

### 프로덕션 환경

```env
# .env.production
PORT=4000
SOCKET_PORT=4100
```

## NestJS 설정

NestJS에서도 동일한 환경 변수를 사용해야 합니다:

### main.ts

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // HTTP 서버
  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`HTTP Server running on port ${port}`);
  
  // WebSocket 서버 (선택사항 - 별도 포트)
  const socketPort = process.env.SOCKET_PORT || 4100;
  // Socket.io 설정...
}
```

### WebSocket Gateway

```typescript
@WebSocketGateway({
  port: parseInt(process.env.SOCKET_PORT || '4100'),
  cors: {
    origin: '*',
  },
})
export class EventsGateway {
  @WebSocketServer()
  server: Server;
  
  // ...
}
```

## 확인 방법

### 1. Docker Compose 설정 확인

```bash
# 변수 치환 결과 확인
docker compose config

# nginx 환경 변수 확인
docker compose config | grep -A 10 "nginx:"
```

### 2. 컨테이너 환경 변수 확인

```bash
# Nginx 컨테이너
docker compose exec nginx printenv | grep PORT

# 출력 예시:
# APP_PORT=4000
# SOCKET_PORT=4100

# App 컨테이너
docker compose exec app printenv | grep PORT

# 출력 예시:
# PORT=4000
# SOCKET_PORT=4100
```

### 3. Nginx 설정 파일 확인

```bash
# 생성된 실제 설정 파일 확인
docker compose exec nginx cat /etc/nginx/conf.d/default.conf

# proxy_pass 라인 확인
docker compose exec nginx cat /etc/nginx/conf.d/default.conf | grep proxy_pass

# 출력 예시:
# proxy_pass http://app:4000;
# proxy_pass http://app:4100;
```

### 4. 실제 연결 테스트

```bash
# HTTP API 테스트
curl https://your-domain.com/api/some-endpoint

# WebSocket 테스트 (wscat 사용)
npm install -g wscat
wscat -c wss://your-domain.com/socket.io

# Health check
curl https://your-domain.com/health
```

## 트러블슈팅

### 문제 1: 502 Bad Gateway

**원인**: Nginx가 잘못된 포트로 프록시 시도

**확인**:
```bash
# Nginx 로그 확인
docker compose logs nginx | grep "connect() failed"

# 예시:
# connect() failed (111: Connection refused) while connecting to upstream, 
# client: xxx, server: xxx, request: "GET /api HTTP/1.1", 
# upstream: "http://app:4000/"
```

**해결**:
1. `.env` 파일의 포트 확인
2. NestJS가 해당 포트에서 리스닝하는지 확인
```bash
docker compose exec app netstat -tln | grep 4000
```

### 문제 2: 환경 변수가 치환되지 않음

**원인**: `docker-entrypoint.sh`의 envsubst에 변수 누락

**해결**:
```bash
# docker-entrypoint.sh 확인
cat nginx/docker-entrypoint.sh | grep envsubst

# 다음과 같이 되어 있어야 함:
# envsubst '${DOMAIN_NAME} ${APP_PORT} ${SOCKET_PORT}' ...
```

### 문제 3: WebSocket 연결 실패

**원인**: WebSocket 포트가 올바르지 않음

**확인**:
```bash
# WebSocket 경로 확인
docker compose exec nginx cat /etc/nginx/conf.d/default.conf | grep -A 5 "location /socket.io"

# 출력에서 proxy_pass의 포트 확인
# proxy_pass http://app:4100;
```

**해결**:
1. `.env`의 `SOCKET_PORT` 확인
2. NestJS WebSocket Gateway 포트와 일치하는지 확인

### 문제 4: 포트 변경 후 적용 안 됨

**원인**: Nginx 설정이 재생성되지 않음

**해결**:
```bash
# Nginx 컨테이너 재빌드
docker compose down
docker compose up -d --force-recreate nginx

# 또는 전체 재빌드
docker compose down
docker compose build --no-cache nginx
docker compose up -d
```

## 고급 설정

### 포트 범위 동적 할당

여러 인스턴스를 실행할 때:

```bash
# 인스턴스 1
PORT=4000 SOCKET_PORT=4100 docker compose up -d

# 인스턴스 2
PORT=5000 SOCKET_PORT=5100 docker compose -p instance2 up -d

# 인스턴스 3
PORT=6000 SOCKET_PORT=6100 docker compose -p instance3 up -d
```

### 로드 밸런서와 함께 사용

```nginx
# nginx/conf.d/default.conf.template
upstream app_backend {
    server app1:${APP_PORT};
    server app2:${APP_PORT};
    server app3:${APP_PORT};
}

location /api {
    proxy_pass http://app_backend;
    # ...
}
```

## 베스트 프랙티스

### ✅ 권장

1. **일관된 포트 사용**
   - 모든 환경에서 동일한 포트 사용 (4000, 4100)
   - 필요시에만 변경

2. **환경 변수 검증**
   ```bash
   # deploy 전 확인
   if [ -z "$PORT" ]; then
     echo "Error: PORT not set"
     exit 1
   fi
   ```

3. **문서화**
   - `.env.example`에 기본값 명시
   - 포트 용도 주석으로 설명

4. **로깅**
   ```bash
   echo "Starting Nginx with:"
   echo "  App Port: $APP_PORT"
   echo "  Socket Port: $SOCKET_PORT"
   ```

### ❌ 피해야 할 것

1. 포트를 하드코딩
2. 환경별로 다른 포트 사용 (혼란 방지)
3. 특권 포트 사용 (1024 이하)
4. 다른 서비스와 포트 충돌

## 요약

| 항목 | 위치 | 역할 |
|------|------|------|
| `PORT` | `.env` | NestJS HTTP 포트 |
| `SOCKET_PORT` | `.env` | NestJS WebSocket 포트 |
| `APP_PORT` | docker-compose.yml (nginx) | Nginx가 사용하는 백엔드 포트 (=PORT) |
| `${APP_PORT}` | default.conf.template | Nginx 프록시 대상 포트 |
| `${SOCKET_PORT}` | default.conf.template | WebSocket 프록시 대상 포트 |

**핵심**: 
- `.env`에서 포트를 정의하면 모든 곳에서 자동으로 적용됩니다!
- Nginx 설정 파일을 직접 수정할 필요가 없습니다! 🎯

