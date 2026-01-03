# Microservices 아키텍처

## 개요

기존 `mecipe-was` monolith를 microservices로 분리한 아키텍처입니다.

## 서비스 구조

### 1. API Gateway (`apps/api-gateway`)

**역할**: 모든 클라이언트 요청의 진입점

- JWT 인증 및 검증
- Public 경로 관리
- 내부 서비스로 요청 라우팅
- User 정보를 헤더로 전달

### 2. Place API Service (`apps/place-api-service`)

**역할**: 장소(Place), 사용자(User), 상품(Product) 등 관리

**주요 기능**:
- 사용자 인증 및 JWT 발급
- 장소(카페) 정보 관리
- 상품 관리
- 사용자 관리

**데이터베이스**: 독립적인 PostgreSQL

### 3. Meta Viewer Service (`apps/meta-viewer-service`)

**역할**: 메타 뷰어 관련 기능

**주요 기능**:
- 메타 뷰어 정보 관리
- WebSocket 통신 (Socket.IO)
- Redis Socket Adapter (다중 인스턴스 지원)
- Redis Stream 기반 메시지 큐

**데이터베이스**: 독립적인 PostgreSQL

**특수 기능**:
- Redis를 통한 WebSocket 브로드캐스트
- Redis Stream 기반 메시지 큐

### 4. Place Indexer Service (`apps/place-indexer-service`)

**역할**: 검색 인덱싱

**주요 기능**:
- Kafka를 통한 이벤트 수신
- Elasticsearch 인덱싱

## 공통 모듈

### libs/common

모든 서비스에서 공유하는 모듈:

- **Auth**: `AuthorizationGuard`, `UserHeaderMiddleware`, `ServiceTokenGuard`
- **Kafka**: Kafka 클라이언트 모듈
- **Types**: 공통 타입 및 DTO
- **Utils**: 공통 유틸리티

## 통신 방식

### 1. HTTP (API Gateway → 내부 서비스)

```
Client → API Gateway → 내부 서비스
```

- Gateway가 JWT 검증 후 헤더로 user 정보 전달
- 내부 서비스는 헤더에서 user 정보 추출

### 2. WebSocket (Meta Viewer Service)

```
Client → Meta Viewer Service (Socket.IO)
```

- Redis Socket Adapter를 통한 다중 인스턴스 지원
- Redis Stream 기반 메시지 큐

### 3. Kafka (이벤트 기반 통신)

```
Place API Service → Kafka → Place Indexer Service
```

- 비동기 이벤트 처리
- 검색 인덱싱 등

## 데이터베이스

각 서비스는 독립적인 데이터베이스를 가집니다:

- `place-api-service`: Place, User, Product 등
- `meta-viewer-service`: MetaViewerInfo, MetaViewerMap 등
- `place-indexer-service`: Elasticsearch

## 배포

### Kubernetes

각 서비스는 독립적으로 배포되며, 여러 replica로 확장 가능합니다.

### Redis

- Meta Viewer Service의 WebSocket 브로드캐스트
- Meta Viewer Service의 메시지 큐

### Kafka

- Place Indexer Service의 이벤트 수신

## 마이그레이션 상태

### 완료

- ✅ Place API Service 분리
- ✅ Meta Viewer Service 분리
- ✅ API Gateway 구현
- ✅ 인증/인가 시스템 통합
- ✅ Redis Socket Adapter 통합
- ✅ Kafka 통합

### 기존 Monolith

- `mecipe-was`: 기존 방식 유지 (독립 운영)

## Redis 통합

### 용도

1. **WebSocket 브로드캐스트** (Meta Viewer Service)
   - Redis Socket Adapter를 통한 다중 인스턴스 간 소켓 통신
   - 여러 replica에서 동일한 방(room)으로 메시지 브로드캐스트

2. **메시지 큐** (Meta Viewer Service)
   - Redis Stream 기반 메시지 큐
   - 안정적인 메시지 전달 보장

### 설정

```typescript
// apps/meta-viewer-service/src/meta-veiwers/redis-adapter.config.ts
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

## Kafka 통신

### 용도

- Place API Service → Place Indexer Service
- 비동기 이벤트 처리 (검색 인덱싱 등)

### 설정

```typescript
// libs/common/src/kafka/kafka.module.ts
KafkaModule.forRoot({
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  clientId: 'service-name',
  groupId: 'service-group',
});
```

## 참고 문서

- 인증/인가: `documents/AUTHENTICATION_GUIDE.md`

