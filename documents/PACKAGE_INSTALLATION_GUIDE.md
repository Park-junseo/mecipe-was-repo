# 패키지 설치 가이드

## 요약

### 1. `@nestjs/microservices` (Kafka 모듈용)

**설치 위치**: `libs/common`의 KafkaModule을 사용하는 **모든 서비스**

**이유**: `libs/common/src/kafka/kafka.module.ts`에서 `@nestjs/microservices`의 `ClientsModule`을 사용합니다.

**현재 상태**:
- ✅ `meta-viewer-service`: 이미 설치됨 (line 48)
- ✅ `place-api-service`: 이미 설치됨 (line 51)

**추가 설치 필요**: 없음 (이미 모두 설치됨)

---

### 2. Redis

**설치 위치**: Redis를 사용하는 **각 서비스**

#### meta-viewer-service
- ✅ **이미 설치됨**
- 용도: Socket.IO Redis Adapter (여러 replica 간 WebSocket 통신 동기화)
- 패키지: `@socket.io/redis-adapter`, `redis`

#### place-api-service
- ✅ **추가 완료**
- 용도: 캐싱 또는 기타 용도 (사용자 요구사항)
- 패키지: `redis`

---

## 패키지 설치 현황

### meta-viewer-service
```json
{
  "dependencies": {
    "@nestjs/microservices": "^11.1.8",  // ✅ Kafka Consumer용
    "@socket.io/redis-adapter": "^8.2.0", // ✅ Socket Adapter용
    "redis": "^4.6.0",                   // ✅ Socket Adapter용
    "kafkajs": "^2.2.4"                  // ✅ Kafka용
  }
}
```

### place-api-service
```json
{
  "dependencies": {
    "@nestjs/microservices": "^11.1.8",  // ✅ Kafka Producer용
    "redis": "^4.6.0",                   // ✅ 추가됨 (캐싱 등)
    "kafkajs": "^2.2.4"                  // ✅ Kafka용
  }
}
```

---

## 설치 명령어

### meta-viewer-service
```bash
cd apps/meta-viewer-service
pnpm install
```
**상태**: 이미 모든 패키지가 package.json에 포함되어 있음

### place-api-service
```bash
cd apps/place-api-service
pnpm install
```
**상태**: Redis 패키지가 방금 추가됨

---

## libs/common의 의존성

`libs/common`은 **라이브러리**이므로 자체 package.json에 의존성을 선언하지 않습니다.

대신, `libs/common`을 사용하는 **각 서비스**에서 필요한 패키지를 설치해야 합니다.

### libs/common이 사용하는 패키지

1. **`@nestjs/microservices`**
   - 사용 위치: `libs/common/src/kafka/kafka.module.ts`
   - 설치 위치: `libs/common`을 사용하는 모든 서비스
   - 현재: `meta-viewer-service`, `place-api-service` 모두 설치됨 ✅

2. **기타 NestJS 패키지**
   - `@nestjs/common`: 루트 package.json에 있음 (모든 서비스에서 사용)
   - `@nestjs/core`: 루트 package.json에 있음

---

## 패키지 설치 체크리스트

### ✅ 완료된 항목
- [x] `meta-viewer-service`에 `@nestjs/microservices` 설치
- [x] `meta-viewer-service`에 Redis 관련 패키지 설치
- [x] `place-api-service`에 `@nestjs/microservices` 설치
- [x] `place-api-service`에 Redis 패키지 추가

### 📝 다음 단계
1. **패키지 설치 실행**
   ```bash
   # 루트에서 실행 (모든 서비스 동시 설치)
   pnpm install
   
   # 또는 각 서비스별로 실행
   cd apps/meta-viewer-service && pnpm install
   cd apps/place-api-service && pnpm install
   ```

2. **환경 변수 설정**
   - `meta-viewer-service`: `REDIS_URL` (Socket Adapter용)
   - `place-api-service`: `REDIS_URL` (캐싱 등)

---

## FAQ

### Q: libs/common에 패키지를 설치해야 하나요?
**A**: 아니요. `libs/common`은 라이브러리이므로, 이를 사용하는 각 서비스에서 패키지를 설치해야 합니다.

### Q: 왜 각 서비스에 패키지를 설치해야 하나요?
**A**: 
- Nx monorepo에서는 각 앱이 독립적으로 빌드/배포됩니다
- 각 서비스는 자신이 사용하는 패키지만 포함합니다
- 공통 모듈(`libs/common`)은 코드만 공유하고, 의존성은 각 서비스에서 관리합니다

### Q: `@nestjs/microservices`는 어디에 설치해야 하나요?
**A**: `libs/common`의 KafkaModule을 사용하는 모든 서비스에 설치해야 합니다.
- `meta-viewer-service`: ✅ 설치됨
- `place-api-service`: ✅ 설치됨

### Q: Redis는 어디에 설치해야 하나요?
**A**: Redis를 사용하는 각 서비스에 설치합니다.
- `meta-viewer-service`: ✅ 설치됨 (Socket Adapter용)
- `place-api-service`: ✅ 추가됨 (캐싱 등)

---

## 참고 자료

- [MICROSERVICES_MIGRATION_PLAN.md](./MICROSERVICES_MIGRATION_PLAN.md)
- [MICROSERVICES_IMPLEMENTATION_GUIDE.md](./MICROSERVICES_IMPLEMENTATION_GUIDE.md)
- [REDIS_INSTALLATION_GUIDE.md](./REDIS_INSTALLATION_GUIDE.md)





