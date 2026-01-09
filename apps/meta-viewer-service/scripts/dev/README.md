# Meta Viewer Service 개발 환경 스크립트

이 스크립트는 테스트 컨테이너로 Redis를 실행하고, PM2를 사용하여 `meta-viewer-service`를 개발 환경에서 실행합니다.

## 기능

- ✅ **Testcontainers를 사용한 Redis 컨테이너 자동 실행**
- ✅ **PM2를 사용한 meta-viewer-service 프로세스 관리**
- ✅ **환경 변수 자동 설정** (REDIS_URL, SOCKET_PORT 등)
- ✅ **자동 정리 기능** (Ctrl+C 시 Redis 컨테이너 및 PM2 프로세스 정리)

## 사전 요구사항

1. **Docker**가 설치되어 있고 실행 중이어야 합니다.
2. **Node.js** 20.x 이상
3. **pnpm** 9.x 이상
4. 프로젝트 의존성이 설치되어 있어야 합니다:
   ```bash
   pnpm install
   ```

## 사용법

### 기본 실행

```bash
# 프로젝트 루트에서 실행
pnpm tsx apps/meta-viewer-service/scripts/dev/start-meta-viewer-dev.ts

# 또는 ts-node 사용
ts-node apps/meta-viewer-service/scripts/dev/start-meta-viewer-dev.ts
```

### 환경 변수 설정

스크립트 실행 전에 환경 변수를 설정할 수 있습니다:

```bash
# Socket Port 변경 (기본값: 4100)
export SOCKET_PORT=5000
pnpm tsx apps/meta-viewer-service/scripts/dev/start-meta-viewer-dev.ts
```

## 동작 방식

1. **Redis 컨테이너 시작**
   - Testcontainers를 사용하여 Redis 7.2-alpine 컨테이너를 시작
   - 동적 포트 매핑으로 호스트 포트 할당
   - Redis URL 자동 생성

2. **Meta Viewer Service 빌드**
   - 빌드 파일이 없으면 자동으로 빌드 실행
   - `dist/apps/meta-viewer-service/main.js` 경로 사용

3. **PM2로 서비스 시작**
   - 기존 프로세스가 있으면 자동으로 중지 및 삭제
   - 환경 변수 자동 설정:
     - `REDIS_URL`: Redis 컨테이너 URL
     - `SOCKET_PORT`: Socket.IO 포트 (기본값: 4100)
     - `NODE_ENV`: development
     - `INSTANCE_ID`: 고유 인스턴스 ID

4. **로그 관리**
   - PM2 로그는 `apps/meta-viewer-service/logs/` 디렉토리에 저장됩니다:
     - `meta-viewer-service-error.log`
     - `meta-viewer-service-out.log`

## 유용한 명령어

### PM2 명령어

```bash
# 로그 확인
pm2 logs meta-viewer-service-dev

# 상태 확인
pm2 status

# 서비스 중지
pm2 stop meta-viewer-service-dev

# 서비스 재시작
pm2 restart meta-viewer-service-dev

# 서비스 삭제
pm2 delete meta-viewer-service-dev
```

### 수동 정리

스크립트가 정상적으로 종료되지 않은 경우:

```bash
# PM2 프로세스 중지 및 삭제
pm2 stop meta-viewer-service-dev
pm2 delete meta-viewer-service-dev

# Redis 컨테이너 확인 및 중지
docker ps | grep redis
docker stop <container-id>
docker rm <container-id>
```

## 문제 해결

### Redis 컨테이너가 시작되지 않는 경우

- Docker가 실행 중인지 확인: `docker ps`
- Docker 권한 확인
- 포트 충돌 확인

### PM2 프로세스가 시작되지 않는 경우

- 빌드가 완료되었는지 확인: `pnpm build meta-viewer-service`
- `dist/apps/meta-viewer-service/main.js` 파일이 존재하는지 확인
- 기존 PM2 프로세스 확인: `pm2 list`

### 포트 충돌

- 다른 프로세스가 4100 포트를 사용 중인지 확인
- `SOCKET_PORT` 환경 변수로 다른 포트 사용

## 스크립트 종료

- **Ctrl+C**를 누르면 자동으로 정리됩니다:
  1. PM2 프로세스 중지 및 삭제
  2. Redis 컨테이너 중지

## 참고사항

- 이 스크립트는 **개발 환경 전용**입니다.
- 프로덕션 환경에서는 사용하지 마세요.
- Redis 컨테이너는 스크립트 종료 시 자동으로 삭제됩니다.
- PM2 프로세스는 스크립트 종료 시 자동으로 삭제됩니다.



