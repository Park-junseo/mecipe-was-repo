# 문서 목록

## 주요 가이드

### 1. [인증 및 인가 가이드](./AUTHENTICATION_GUIDE.md)
API Gateway 기반 인증/인가 시스템에 대한 종합 가이드
- JWT 검증 흐름
- Role 기반 접근 제어
- Public 경로 관리
- Decorator 사용법

### 2. [Microservices 아키텍처](./MICROSERVICES_ARCHITECTURE.md)
전체 microservices 구조 및 통신 방식
- 서비스 구조
- 통신 방식 (HTTP, WebSocket, Kafka)
- 데이터베이스 분리
- Redis 통합

## 기타 문서

### 배포 관련
- `DEPLOYMENT.md` - 배포 가이드
- `KUBERNETES_DEPLOYMENT.md` - Kubernetes 배포
- `DOCKER_HUB_SETUP.md` - Docker Hub 설정

### 환경 설정
- `ENVIRONMENT_VARIABLES.md` - 환경 변수 가이드
- `NX_QUICK_START.md` - Nx 모노레포 시작하기

### 문제 해결
- `TROUBLESHOOTING_DEPLOY.md` - 배포 문제 해결
- `TROUBLESHOOTING_K3S.md` - K3s 문제 해결

## 빠른 참조

### 인증/인가
- Gateway에서 JWT 검증 → 헤더로 user 정보 전달
- 내부 서비스는 `@RequireRole('ADMIN')` 데코레이터 사용
- Public 경로는 각 서비스의 `config/public-paths.config.ts`에서 관리

### 서비스 구조
- `place-api-service`: Place, User, Product 관리
- `meta-viewer-service`: Meta Viewer + WebSocket
- `api-gateway`: JWT 검증 및 라우팅
- `place-indexer-service`: 검색 인덱싱

### 공통 모듈
- `libs/common`: 공통 타입, Auth, Kafka 클라이언트



