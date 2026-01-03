# Debezium CDC를 통한 CafeInfo Read Model 동기화

## 제안된 방식

### 구조

```
place-api-service (PostgreSQL)
  ↓ Database 변경 (INSERT/UPDATE/DELETE)
Debezium Connector (CDC)
  ↓ Change Events
Kafka Topic (cafe-info-changes)
  ↓
meta-viewer-service (Kafka Consumer)
  ↓
CafeInfo Read Model 업데이트
```

## Debezium CDC 방식의 특징

### 장점 ✅

1. **자동 동기화**
   - 데이터베이스 변경사항을 자동으로 캡처
   - 애플리케이션 코드 수정 불필요
   - `place-api-service`에서 이벤트 발행 코드 불필요

2. **완전한 변경 이력**
   - 모든 변경사항 자동 캡처
   - 누락 없음
   - 트랜잭션 로그 기반

3. **낮은 애플리케이션 부하**
   - 애플리케이션 코드에 영향 없음
   - 데이터베이스 레벨에서 처리
   - 성능 오버헤드 최소화

4. **초기 데이터 동기화**
   - Snapshot 기능으로 기존 데이터 자동 동기화
   - 초기 마이그레이션 불필요

5. **스키마 변경 추적**
   - 테이블 스키마 변경도 자동 추적
   - 컬럼 추가/삭제 자동 반영

### 단점 ❌

1. **인프라 복잡도**
   - Debezium Connector 설정 필요
   - Kafka Connect 필요
   - 데이터베이스 설정 (WAL, binlog 등)

2. **데이터베이스 부하**
   - 트랜잭션 로그 읽기
   - WAL/Binlog 활성화 필요
   - 데이터베이스 성능 영향 가능

3. **이벤트 형식**
   - Debezium 이벤트 형식 (복잡)
   - 스키마 레지스트리 필요할 수 있음
   - 이벤트 변환 로직 필요

4. **디버깅 어려움**
   - 데이터베이스 레벨에서 처리
   - 추적이 어려움
   - 문제 해결 복잡

5. **의존성 증가**
   - Debezium, Kafka Connect 의존성
   - 데이터베이스 설정 의존성
   - 인프라 관리 복잡도 증가

## 현재 방식과 비교

### 현재 방식 (애플리케이션 레벨 이벤트)

```
place-api-service
  ├─ CafeInfo 변경
  └─ Kafka 이벤트 발행 (수동)
        ↓
Kafka
        ↓
meta-viewer-service
  └─ Consumer 수신
```

**특징:**
- ✅ 애플리케이션에서 명시적 제어
- ✅ 이벤트 형식 커스터마이징 가능
- ❌ 애플리케이션 코드 수정 필요
- ❌ 이벤트 발행 누락 가능

### Debezium 방식 (데이터베이스 레벨 CDC)

```
place-api-service (PostgreSQL)
  └─ CafeInfo 변경 (자동 감지)
        ↓
Debezium Connector
  └─ Change Events (자동 생성)
        ↓
Kafka
        ↓
meta-viewer-service
  └─ Consumer 수신
```

**특징:**
- ✅ 자동 동기화 (누락 없음)
- ✅ 애플리케이션 코드 수정 불필요
- ✅ 초기 데이터 자동 동기화
- ❌ 인프라 복잡도 증가
- ❌ 데이터베이스 부하

## 구현 예시

### 1. Debezium Connector 설정

```json
{
  "name": "cafe-info-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgres",
    "database.port": "5432",
    "database.user": "postgres",
    "database.password": "password",
    "database.dbname": "place_api_db",
    "database.server.name": "place-api",
    "table.include.list": "public.CafeInfo",
    "topic.prefix": "place-api",
    "plugin.name": "pgoutput"
  }
}
```

### 2. Kafka Consumer 수정

```typescript
// apps/meta-viewer-service/src/kafka/cafe-info.consumer.ts
import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, KafkaContext } from '@nestjs/microservices';
import { PrismaService } from '../global/prisma.service';

/**
 * Debezium CDC 이벤트 형식
 */
interface DebeziumEvent {
  before: CafeInfo | null;  // 변경 전
  after: CafeInfo | null;   // 변경 후
  source: {
    table: string;
    db: string;
  };
  op: 'c' | 'u' | 'd';  // create, update, delete
}

@Controller()
export class CafeInfoConsumer {
  private readonly logger = new Logger(CafeInfoConsumer.name);

  constructor(private readonly prisma: PrismaService) {}

  @EventPattern('place-api.public.CafeInfo')
  async handleCafeInfoChange(
    @Payload() event: DebeziumEvent,
    @Ctx() context: KafkaContext,
  ) {
    try {
      if (event.op === 'c') {
        // Create
        await this.prisma.cafeInfo.upsert({
          where: { id: event.after.id },
          create: {
            id: event.after.id,
            name: event.after.name,
            code: event.after.code,
            isDisable: event.after.isDisable,
            createdAt: new Date(event.after.createdAt),
          },
          update: {
            name: event.after.name,
            code: event.after.code,
            isDisable: event.after.isDisable,
          },
        });
      } else if (event.op === 'u') {
        // Update
        await this.prisma.cafeInfo.update({
          where: { id: event.after.id },
          data: {
            name: event.after.name,
            code: event.after.code,
            isDisable: event.after.isDisable,
          },
        });
      } else if (event.op === 'd') {
        // Delete
        await this.prisma.cafeInfo.delete({
          where: { id: event.before.id },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to sync CafeInfo:`, error);
      throw error;
    }
  }
}
```

## 장단점 종합 비교

| 항목 | 현재 방식 (App Event) | Debezium CDC | ID만 저장 |
|------|----------------------|--------------|-----------|
| **복잡도** | 중간 | 높음 | 낮음 |
| **자동화** | 수동 (코드 필요) | 자동 | 불필요 |
| **누락 방지** | ❌ (코드 누락 가능) | ✅ (자동) | 불필요 |
| **인프라** | Kafka만 | Kafka + Debezium + Connect | 없음 |
| **DB 부하** | 없음 | 있음 (WAL 읽기) | 없음 |
| **디버깅** | 쉬움 | 어려움 | 쉬움 |
| **초기 동기화** | 수동 필요 | 자동 (Snapshot) | 불필요 |
| **애플리케이션 영향** | 있음 (코드 수정) | 없음 | 없음 |

## 권장 사항

### 시나리오별 권장 방안

#### 1. 이미 Debezium을 사용 중인 경우 ⭐⭐⭐⭐

**권장: Debezium CDC 사용**

**이유:**
- 인프라가 이미 구축되어 있음
- 추가 비용 최소화
- 자동 동기화의 이점 활용

#### 2. Debezium을 새로 도입하는 경우 ⭐⭐

**권장: ID만 저장 방식**

**이유:**
- Debezium 도입 비용이 큼
- 인프라 복잡도 증가
- 단순한 요구사항에는 과함

#### 3. 여러 테이블 동기화가 필요한 경우 ⭐⭐⭐⭐

**권장: Debezium CDC**

**이유:**
- 여러 테이블을 한 번에 처리
- 일관된 동기화 방식
- 확장성

#### 4. 단일 테이블만 동기화하는 경우 ⭐⭐⭐⭐⭐

**권장: ID만 저장**

**이유:**
- 가장 간단
- 인프라 불필요
- 유지보수 용이

## 현재 프로젝트 상황 분석

### 현재 상태

1. **Kafka 사용 중**: `place-indexer-service`에서 사용
2. **단일 테이블**: `CafeInfo`만 동기화 필요
3. **간단한 요구사항**: Read Model에 최소한의 정보만 필요

### 권장 방안

**ID만 저장 방식 (방안 1)을 권장합니다.**

**이유:**
1. **단순함**: 가장 간단한 해결책
2. **인프라 불필요**: Debezium 도입 불필요
3. **유지보수 용이**: 복잡도 최소화
4. **충분한 기능**: 현재 요구사항 충족

### Debezium을 사용해야 하는 경우

다음 조건이 모두 충족되면 Debezium 고려:

1. ✅ 여러 테이블 동기화 필요
2. ✅ 실시간 동기화 필수
3. ✅ 이벤트 누락 방지 필수
4. ✅ Debezium 인프라 구축 가능
5. ✅ 데이터베이스 부하 감수 가능

## 결론

### Debezium CDC 방식 평가

**장점:**
- ✅ 자동 동기화 (누락 없음)
- ✅ 애플리케이션 코드 수정 불필요
- ✅ 초기 데이터 자동 동기화

**단점:**
- ❌ 인프라 복잡도 증가
- ❌ 데이터베이스 부하
- ❌ 디버깅 어려움
- ❌ 단일 테이블에는 과함

### 최종 권장사항

**현재 프로젝트에는 ID만 저장 방식 (방안 1)을 권장합니다.**

**이유:**
1. 단일 테이블만 동기화 필요
2. 간단한 요구사항
3. 인프라 복잡도 최소화
4. 유지보수 용이

**Debezium은 다음 경우에 고려:**
- 여러 테이블 동기화 필요
- 실시간 동기화 필수
- 이벤트 누락 방지 필수
- 이미 Debezium 인프라가 있는 경우



