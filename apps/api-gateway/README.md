# API Gateway

API Gateway는 마이크로 서비스 아키텍처의 진입점으로, 모든 클라이언트 요청을 처리하고 적절한 내부 서비스로 라우팅합니다.

## 주요 기능

- **JWT 인증**: 모든 요청의 JWT 토큰 검증
- **요청 라우팅**: 경로에 따라 적절한 내부 서비스로 프록시
- **User 정보 전달**: 검증된 user 정보를 헤더로 내부 서비스에 전달
- **Public 경로 지원**: 인증이 필요 없는 경로 처리

## 아키텍처

```
Client
  ↓ JWT Token
API Gateway (JWT 검증)
  ↓ X-User-Id, X-User-Role 헤더
Internal Services (인가만 수행)
```

## 환경 변수

```bash
# Gateway 포트
PORT=3000

# JWT Secret
JWT_SECRET=your-secret-key

# 내부 서비스 URL (Kubernetes Service 이름 또는 URL)
PLACE_API_SERVICE_URL=http://place-api-service:3000
META_VIEWER_SERVICE_URL=http://meta-viewer-service:3000
```

## 실행

```bash
# 개발 모드
pnpm start:dev

# 프로덕션 빌드
pnpm build

# 프로덕션 실행
pnpm start:prod
```

## 라우팅 규칙

- `/meta-viewer-infos/*`, `/meta-viewers/*`, `/meta-veiwers/*` → Meta Viewer Service
- 그 외 모든 경로 → Place API Service

## Public 경로

인증이 필요 없는 경로:
- `/health`
- `/api/auth/login`
- `/api/auth/signup`

## 참고

- [MICROSERVICES_AUTH_ARCHITECTURE.md](../../documents/MICROSERVICES_AUTH_ARCHITECTURE.md)




