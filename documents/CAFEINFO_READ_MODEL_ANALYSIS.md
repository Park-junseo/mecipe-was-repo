# CafeInfo Read Model 방식 분석

## 현재 구조

```
place-api-service (Source of Truth)
  ├─ CafeInfo 생성/수정/삭제
  └─ Kafka 이벤트 발행
        ↓
Kafka
        ↓
meta-viewer-service
  ├─ CafeInfoConsumer 수신
  ├─ CafeInfo Read Model 업데이트
  └─ MetaViewerInfo가 CafeInfo 참조
```

## 문제점 분석

### 1. 데이터 일관성 문제 ⚠️

#### 문제
- **이벤트 지연**: Kafka 이벤트가 지연되면 Read Model이 최신 상태가 아님
- **이벤트 손실**: Kafka 이벤트가 실패하거나 손실되면 동기화 실패
- **순서 문제**: 이벤트 순서가 보장되지 않으면 데이터 불일치

#### 시나리오
```typescript
// place-api-service에서
1. CafeInfo 생성 (id: 1)
2. MetaViewerInfo 생성 시도 (cafeInfoId: 1)
   → Read Model에 아직 동기화 안 됨 ❌
   → NotFoundException 발생
```

### 2. 초기 데이터 동기화 문제 ⚠️

#### 문제
- **기존 CafeInfo**: Read Model에 동기화되지 않음
- **서비스 재시작**: Kafka Consumer가 재시작 전 이벤트를 놓칠 수 있음
- **초기 마이그레이션**: 기존 데이터를 Read Model로 복사하는 작업 필요

#### 해결 필요
```typescript
// 초기 동기화 스크립트 필요
// place-api-service의 모든 CafeInfo를 Kafka로 재발행
// 또는 직접 DB에서 복사
```

### 3. 복잡도 증가 ⚠️

#### 문제
- **추가 인프라**: Kafka 필요
- **추가 코드**: Consumer, Producer, 이벤트 타입 정의
- **디버깅 어려움**: 이벤트 기반이므로 추적이 어려움
- **테스트 복잡**: Kafka Mock 필요

### 4. 중복 데이터 저장 ⚠️

#### 문제
- **데이터 중복**: 같은 데이터를 두 서비스에 저장
- **저장 공간**: 불필요한 중복
- **동기화 오버헤드**: 네트워크, 처리 비용

### 5. 의존성 증가 ⚠️

#### 문제
- **Kafka 의존성**: Kafka가 다운되면 동기화 불가
- **서비스 간 결합**: `place-api-service` 변경 시 `meta-viewer-service` 영향
- **이벤트 스키마 변경**: 이벤트 구조 변경 시 양쪽 수정 필요

### 6. 트랜잭션 문제 ⚠️

#### 문제
- **분산 트랜잭션 불가**: 두 서비스 간 원자성 보장 불가
- **롤백 어려움**: `MetaViewerInfo` 생성 후 `CafeInfo` 삭제 이벤트 수신 시?

## 대체 방안

### 방안 1: Foreign Key 제거 + ID만 저장 (권장 ⭐)

**구조:**
```prisma
// meta-viewer-service/prisma/schema.prisma
model MetaViewerInfo {
  id              Int       @id @default(autoincrement())
  cafeInfoId      Int       // Foreign Key 제거, ID만 저장
  // CafeInfo 관계 제거
}
```

**장점:**
- ✅ 데이터 중복 없음
- ✅ 동기화 불필요
- ✅ Kafka 의존성 없음
- ✅ 간단하고 명확

**단점:**
- ❌ `CafeInfo` 조회 시 HTTP API 호출 필요
- ❌ 조인 불가 (Prisma relation 사용 불가)

**구현:**
```typescript
// meta-viewer-service
async findOne(id: number) {
  const metaViewerInfo = await this.prisma.metaViewerInfo.findUnique({
    where: { id },
  });
  
  // 필요 시 place-api-service에서 CafeInfo 조회
  if (includeCafeInfo) {
    const cafeInfo = await this.placeApiClient.getCafeInfo(
      metaViewerInfo.cafeInfoId
    );
    return { ...metaViewerInfo, cafeInfo };
  }
  
  return metaViewerInfo;
}
```

### 방안 2: HTTP API 직접 호출

**구조:**
```typescript
// meta-viewer-service에서 필요 시 호출
const cafeInfo = await this.httpService.get(
  `${PLACE_API_URL}/places/${cafeInfoId}`
);
```

**장점:**
- ✅ 실시간 데이터 (항상 최신)
- ✅ 데이터 중복 없음
- ✅ Kafka 불필요

**단점:**
- ❌ 네트워크 지연
- ❌ `place-api-service` 의존성
- ❌ 서비스 다운 시 실패

### 방안 3: 캐싱 + HTTP API

**구조:**
```typescript
// Redis 캐싱
const cafeInfo = await this.redis.get(`cafe:${id}`) 
  || await this.fetchAndCache(id);
```

**장점:**
- ✅ 성능 향상 (캐싱)
- ✅ 데이터 중복 최소화
- ✅ 실시간 데이터 (TTL 설정)

**단점:**
- ❌ 캐시 무효화 관리 필요
- ❌ Redis 의존성

### 방안 4: Event Sourcing (고급)

**구조:**
```
모든 CafeInfo 변경을 이벤트로 저장
→ 이벤트 스토어에서 재생하여 Read Model 구축
```

**장점:**
- ✅ 완전한 감사 추적
- ✅ 시간 여행 가능
- ✅ 이벤트 재생 가능

**단점:**
- ❌ 복잡도 매우 높음
- ❌ 구현 비용 큼
- ❌ 오버엔지니어링 가능

### 방안 5: Saga Pattern

**구조:**
```
MetaViewerInfo 생성 시
1. place-api-service에 CafeInfo 존재 확인
2. 존재하면 MetaViewerInfo 생성
3. 실패 시 보상 트랜잭션
```

**장점:**
- ✅ 분산 트랜잭션 처리
- ✅ 일관성 보장

**단점:**
- ❌ 복잡도 높음
- ❌ 구현 비용 큼

## 권장 방안 비교

| 방안 | 복잡도 | 성능 | 일관성 | 권장도 |
|------|--------|------|--------|--------|
| **현재 (Read Model)** | 높음 | 높음 | 중간 | ⭐⭐ |
| **방안 1: ID만 저장** | 낮음 | 높음 | 높음 | ⭐⭐⭐⭐⭐ |
| **방안 2: HTTP API** | 낮음 | 중간 | 높음 | ⭐⭐⭐ |
| **방안 3: 캐싱 + HTTP** | 중간 | 높음 | 높음 | ⭐⭐⭐⭐ |
| **방안 4: Event Sourcing** | 매우 높음 | 중간 | 높음 | ⭐ |
| **방안 5: Saga** | 높음 | 중간 | 높음 | ⭐⭐ |

## 권장 사항

### 단기: 방안 1 (ID만 저장) ⭐⭐⭐⭐⭐

**이유:**
1. 가장 간단하고 명확
2. 데이터 중복 없음
3. 동기화 불필요
4. Kafka 의존성 제거

**구현:**
```prisma
// schema.prisma 수정
model MetaViewerInfo {
  id              Int       @id @default(autoincrement())
  cafeInfoId      Int       // Foreign Key 제거
  // CafeInfo 관계 제거
}
```

```typescript
// 필요 시 HTTP API 호출
async findOne(id: number, includeCafeInfo = false) {
  const metaViewerInfo = await this.prisma.metaViewerInfo.findUnique({
    where: { id },
  });
  
  if (includeCafeInfo) {
    const cafeInfo = await this.placeApiClient.getCafeInfo(
      metaViewerInfo.cafeInfoId
    );
    return { ...metaViewerInfo, cafeInfo };
  }
  
  return metaViewerInfo;
}
```

### 중기: 방안 3 (캐싱 + HTTP API) ⭐⭐⭐⭐

**이유:**
1. 성능 최적화
2. 실시간 데이터
3. 데이터 중복 최소화

**구현:**
```typescript
// Redis 캐싱
async getCafeInfo(id: number) {
  const cacheKey = `cafe:${id}`;
  const cached = await this.redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const cafeInfo = await this.placeApiClient.getCafeInfo(id);
  await this.redis.setex(cacheKey, 3600, JSON.stringify(cafeInfo));
  
  return cafeInfo;
}
```

## 마이그레이션 전략

### 현재 → 방안 1 (ID만 저장)

1. **스키마 수정**
   ```prisma
   // Foreign Key 제거
   model MetaViewerInfo {
     cafeInfoId Int  // 관계 제거
   }
   ```

2. **코드 수정**
   ```typescript
   // CafeInfo 조회 제거
   // 필요 시 HTTP API 호출로 변경
   ```

3. **Kafka Consumer 제거**
   - `CafeInfoConsumer` 삭제
   - Kafka 모듈 정리

4. **검증 로직 변경**
   ```typescript
   // Before: Read Model에서 조회
   const cafeInfo = await this.prisma.cafeInfo.findUnique(...);
   
   // After: HTTP API로 검증 (선택적)
   // 또는 검증 생략 (cafeInfoId만 저장)
   ```

## 실제 구현 상태 확인

### 현재 상태

1. **Kafka Producer**: `apps/place-api-service/src/kafka/cafe-info.producer.ts` 존재
2. **Kafka Consumer**: `apps/meta-viewer-service/src/kafka/cafe-info.consumer.ts` 존재
3. **Read Model**: `apps/meta-viewer-service/prisma/schema.prisma`에 정의됨

### ⚠️ 현재 상태 확인

**Kafka Producer 구현 상태:**
- ✅ `CafeInfoProducer` 클래스 존재
- ❓ `places.service.ts`에서 실제 사용 여부 확인 필요
- ❓ `createPlaceByAdmin`, `updatePlaceByAdmin`, `deletePlaceByAdmin`에서 이벤트 발행하는지 확인 필요

**만약 이벤트 발행이 구현되지 않았다면:**
- Read Model은 동기화되지 않음
- `MetaViewerInfo` 생성 시 `CafeInfo`를 찾을 수 없음
- **즉시 마이그레이션 필요**

## 결론

### 현재 Read Model 방식의 문제점

1. **데이터 일관성 문제** ⚠️
   - 이벤트 지연으로 인한 동기화 지연
   - 이벤트 손실 가능성
   - 순서 보장 문제

2. **초기 동기화 필요** ⚠️
   - 기존 CafeInfo 데이터 동기화 필요
   - 서비스 재시작 시 이벤트 손실 가능

3. **복잡도 증가** ⚠️
   - Kafka 인프라 필요
   - Consumer/Producer 코드 유지보수
   - 디버깅 어려움

4. **중복 데이터 저장** ⚠️
   - 같은 데이터를 두 서비스에 저장
   - 저장 공간 낭비

5. **Kafka 의존성** ⚠️
   - Kafka 다운 시 동기화 불가
   - 서비스 간 결합도 증가

### 권장 대체 방안

#### 방안 1: ID만 저장 (가장 권장) ⭐⭐⭐⭐⭐

**구조:**
```prisma
model MetaViewerInfo {
  id              Int       @id @default(autoincrement())
  cafeInfoId      Int       // Foreign Key 제거, ID만 저장
  // CafeInfo 관계 제거
}
```

**장점:**
- ✅ 가장 간단
- ✅ 데이터 중복 없음
- ✅ 동기화 불필요
- ✅ Kafka 의존성 제거

**단점:**
- ❌ `CafeInfo` 조회 시 HTTP API 호출 필요
- ❌ Prisma relation 사용 불가

**구현 예시:**
```typescript
// meta-viewer-service
async findOne(id: number, includeCafeInfo = false) {
  const metaViewerInfo = await this.prisma.metaViewerInfo.findUnique({
    where: { id },
  });
  
  if (includeCafeInfo) {
    // 필요 시에만 HTTP API 호출
    const cafeInfo = await this.placeApiClient.getCafeInfo(
      metaViewerInfo.cafeInfoId
    );
    return { ...metaViewerInfo, cafeInfo };
  }
  
  return metaViewerInfo;
}

// 생성 시 검증 (선택적)
async createMetaViewerInfo(createDto: CreateMetaViewerInfoDto) {
  // 옵션 1: 검증 생략 (cafeInfoId만 저장)
  // 옵션 2: HTTP API로 검증
  const cafeInfo = await this.placeApiClient.getCafeInfo(createDto.cafeInfoId);
  if (!cafeInfo) {
    throw new NotFoundException('CafeInfo not found');
  }
  
  // MetaViewerInfo 생성
  return this.prisma.metaViewerInfo.create({
    data: {
      code: createDto.code,
      cafeInfoId: createDto.cafeInfoId, // ID만 저장
      // ...
    },
  });
}
```

#### 방안 2: 캐싱 + HTTP API ⭐⭐⭐⭐

**구조:**
```typescript
// Redis 캐싱으로 성능 최적화
async getCafeInfo(id: number) {
  const cacheKey = `cafe:${id}`;
  const cached = await this.redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const cafeInfo = await this.placeApiClient.getCafeInfo(id);
  await this.redis.setex(cacheKey, 3600, JSON.stringify(cafeInfo));
  
  return cafeInfo;
}
```

**장점:**
- ✅ 실시간 데이터 (항상 최신)
- ✅ 성능 최적화 (캐싱)
- ✅ 데이터 중복 최소화

**단점:**
- ❌ 캐시 무효화 관리 필요
- ❌ Redis 의존성

### 마이그레이션 전략

#### Step 1: 스키마 수정

```prisma
// apps/meta-viewer-service/prisma/schema.prisma
model MetaViewerInfo {
  id              Int       @id @default(autoincrement())
  cafeInfoId      Int       // Foreign Key 제거
  // CafeInfo 관계 제거
  // ...
}
```

#### Step 2: 코드 수정

```typescript
// CafeInfo 조회 제거
// 필요 시 HTTP API 호출로 변경
```

#### Step 3: Kafka 제거

- `CafeInfoConsumer` 삭제
- `CafeInfoProducer` 사용 제거 (또는 삭제)
- Kafka 모듈 정리

#### Step 4: HTTP Client 추가 (필요 시)

```typescript
// libs/common/src/clients/place-api.client.ts
@Injectable()
export class PlaceApiClient {
  constructor(private readonly httpService: HttpService) {}
  
  async getCafeInfo(id: number) {
    const response = await this.httpService.get(
      `${PLACE_API_URL}/places/${id}`
    );
    return response.data;
  }
}
```

## 핵심 원칙

1. **마이크로서비스 독립성**: 각 서비스는 독립적인 데이터베이스
2. **데이터 중복 최소화**: 필요한 경우에만 중복 저장
3. **단순함 우선**: 복잡한 동기화보다 단순한 HTTP 호출
4. **필요 시 최적화**: 성능 문제가 있을 때만 캐싱 도입

