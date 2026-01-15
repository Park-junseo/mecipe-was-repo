# Place Indexer Service

Place Indexer Service는 PostgreSQL 데이터베이스의 변경사항을 Kafka를 통해 수신하고, KSQLDB에서 조인된 데이터를 컨슈밍하여 Elasticsearch에 인덱싱하는 서비스입니다.

## 개요

이 서비스는 다음과 같은 데이터 파이프라인을 구현합니다:

1. **PostgreSQL** → Debezium CDC → **Kafka Topic**
2. **Kafka Topic** → **KSQLDB** (JOIN 연산)
3. **KSQLDB** → **Kafka Topic** (조인된 데이터)
4. **Kafka Topic** → **Place Indexer Service** (컨슈밍)
5. **Place Indexer Service** → **Elasticsearch** (인덱싱)

## 아키텍처

### 데이터 파이프라인 흐름

```
PostgreSQL (Source)
    ↓ (Debezium CDC)
Kafka Topic (Raw Data)
    ↓
KSQLDB (JOIN with RegionCategory)
    ↓
Kafka Topic (mv_cafe_info_with_region)
    ↓
Place Indexer Service (Consumer)
    ↓
Elasticsearch (Indexed Data)
```

### CDC 파이프라인 아키텍처 다이어그램

![CDC Pipeline Data Synchronize](../../images/place-indexer-service.cdc%20pipeline%20data%20sychronize.png)

## 주요 기능

1. **자동 인덱스 생성**: 서비스 시작 시 Elasticsearch 인덱스가 없으면 자동으로 생성
2. **타입 안전성**: TypeScript와 데코레이터를 사용한 타입 안전한 인덱싱
3. **자동 매핑 생성**: 엔티티 클래스에서 Elasticsearch 매핑 자동 생성
4. **메시지 변환**: Kafka 메시지를 엔티티 클래스로 자동 변환
5. **에러 핸들링**: 상세한 로깅 및 에러 처리

## 실행 방법

### 기본 실행 (개발 모드)

```bash
pnpm start:dev
```

개발 모드로 서비스를 실행합니다. 파일 변경 시 자동으로 재시작됩니다.

### 테스트 컨테이너 실행

```bash
pnpm start:test
```

테스트 환경을 위한 컨테이너(Kafka, Elasticsearch, PostgreSQL)를 실행합니다.

### PM2를 사용한 프로덕션 실행

```bash
pnpm daemon
```

PM2를 사용하여 프로덕션 모드로 서비스를 실행합니다. 빌드 후 PM2로 프로세스를 시작합니다.

#### PM2 관련 명령어

- **재시작**: `pnpm daemon:re` - 서비스를 중지하고 다시 시작합니다.
- **중지**: `pnpm daemon:stop` - PM2로 실행 중인 서비스를 중지합니다.
- **로그 확인**: `pnpm daemon:log` - 최근 1000줄의 로그를 확인합니다.

## 모듈 구조

### 1. App Module (`app.module.ts`)

애플리케이션의 루트 모듈입니다. 다음 모듈들을 통합합니다:
- `ConfigModule`: 환경 변수 및 설정 관리
- `ElasticsearchModule`: Elasticsearch 연동
- `CafeInfoModule`: 카페 정보 인덱싱 로직

**주요 기능:**
- HTTP 엔드포인트 제공 (Health Check)
- Kafka 마이크로서비스 설정 및 연결

### 2. Cafe Info Module (`cafe-info/`)

카페 정보를 Elasticsearch에 인덱싱하는 핵심 모듈입니다.

#### CafeInfoController (`cafe-info.controller.ts`)
- Kafka 토픽 `mv_cafe_info_with_region`에서 메시지를 수신
- Kafka 메시지의 key를 Elasticsearch document ID로 사용
- payload가 null인 경우 삭제, 그렇지 않으면 인덱싱 수행

#### CafeInfoService (`cafe-info.service.ts`)
- Elasticsearch 인덱스 생성 (서비스 초기화 시)
- 카페 정보 인덱싱 및 삭제 로직 제공

#### Entity (`cafe-info/entity/`)
- `CafeInfo`: 카페 정보 엔티티 클래스
  - Elasticsearch 필드 타입 정의 (`@ElasticsearchField`)
  - 중첩 객체 `RegionCategory` 포함
  - 타임스탬프 변환 로직 포함
- `ICafeInfo`: 카페 정보 인터페이스

#### Pipes (`cafe-info/pipes/`)
- `TransformCafeInfoPipe`: 카페 정보 메시지 변환 파이프

### 3. Elasticsearch Module (`elasticsearch/`)

Elasticsearch와의 연동을 담당하는 모듈입니다.

#### ElasticsearchService (`elasticsearch.service.ts`)
- 인덱스 생성 및 존재 여부 확인
- 문서 인덱싱 (`indexDocument`)
- 문서 삭제 (`deleteDocument`)

#### Indices (`elasticsearch/libs/indices/`)
- `cafe-info.index.ts`: 카페 정보 인덱스 이름 정의 (`cafe-info-index`)

#### Mappings (`elasticsearch/libs/mappings/`)
- `cafe-info.mapping.ts`: 카페 정보 인덱스 매핑 정의
- 엔티티 클래스에서 자동으로 매핑 생성

#### Decorators (`elasticsearch/libs/decorators/`)
- `@ElasticsearchIndex`: 인덱스 이름 지정 데코레이터
- `@ElasticsearchField`: 필드 타입 및 속성 정의 데코레이터
- `@ElasticsearchNested`: 중첩 객체 정의 데코레이터

#### Utils (`elasticsearch/libs/utils/`)
- `convert-document.ts`: 문서 변환 유틸리티
- `extract-entity-fields.util.ts`: 엔티티 필드 추출 유틸리티
- `generate-mapping.util.ts`: 엔티티에서 매핑 자동 생성
- `index.type.ts`: 인덱스 타입 정의

### 4. Kafka Module (`kafka/`)

Kafka 설정 및 토픽 정의를 담당합니다.

#### Kafka Config (`kafka.config.ts`)
- Kafka 클라이언트 설정
- Consumer 그룹 설정
- 브로커 연결 설정

#### Topics (`kafka/topics/`)
- `CAFEINFO_WITH_REGIONCATEGORY_TOPIC`: 조인된 카페 정보 토픽 이름 (`mv_cafe_info_with_region`)

### 5. Common Module (`common/`)

공통 유틸리티를 제공합니다.

#### DebeziumUtil (`debezium.util.ts`)
- Debezium CDC 메시지 언래핑 유틸리티
- `op` (operation), `after`, `before`, `source` 추출

### 6. Util Module (`util/`)

설정 및 파이프 유틸리티를 제공합니다.

#### Config (`config.ts`)
- 환경 변수에서 설정값 추출
- `KAFKA_BROKERS`, `KAFKA_GROUP_ID`, `KAFKA_CLIENT_ID`
- `ELASTICSEARCH_HOSTS`, `ELASTICSEARCH_USERNAME`, `ELASTICSEARCH_PASSWORD`

#### Pipes (`util/pipes/`)
- `TransformMessagePipe`: Kafka 메시지를 엔티티 클래스로 변환하는 범용 파이프
- `class-transformer`를 사용하여 타입 변환 및 필드 추출

### 7. Test Utils (`test-utils/`)

테스트를 위한 유틸리티 및 모듈을 제공합니다.

- `mocks/`: Elasticsearch 서비스 모킹
- `test-modules/`: 테스트용 모듈 정의
- `setup.ts`: 테스트 환경 설정

## 환경 변수

다음 환경 변수를 설정해야 합니다:

### Kafka 설정

- `KAFKA_BROKERS`: Kafka 브로커 주소 (예: `localhost:9092` 또는 `broker1:9092,broker2:9092`)
- `KAFKA_GROUP_ID`: Consumer 그룹 ID (기본값: `place-indexer-service`)
- `KAFKA_CLIENT_ID`: Kafka 클라이언트 ID (기본값: `place-indexer-client`)

### Elasticsearch 설정

- `ELASTICSEARCH_HOSTS`: Elasticsearch 호스트 주소 (기본값: `http://localhost:9200`)
- `ELASTICSEARCH_USERNAME`: Elasticsearch 사용자명 (선택)
- `ELASTICSEARCH_PASSWORD`: Elasticsearch 비밀번호 (선택)

### 기타 설정

- `PORT`: HTTP 서버 포트 (기본값: `3000`)

## 의존성

### 주요 의존성

- `@nestjs/core`, `@nestjs/common`: NestJS 프레임워크
- `@nestjs/microservices`: Kafka 마이크로서비스 지원
- `@nestjs/elasticsearch`: Elasticsearch 연동
- `@nestjs/config`: 환경 변수 관리
- `kafkajs`: Kafka 클라이언트
- `@elastic/elasticsearch`: Elasticsearch 클라이언트
- `class-transformer`, `class-validator`: 데이터 변환 및 검증

### 개발 의존성

- `@testcontainers/kafka`, `@testcontainers/elasticsearch`, `@testcontainers/postgresql`: 테스트 컨테이너
- `jest`, `ts-jest`: 테스트 프레임워크
- `pm2`: 프로세스 관리

## 개발 가이드

### 새로운 인덱스 타입 추가하기

1. `elasticsearch/libs/indices/`에 인덱스 이름 정의
2. `elasticsearch/libs/mappings/`에 매핑 정의
3. 엔티티 클래스에 `@ElasticsearchIndex` 데코레이터 추가
4. 필드에 `@ElasticsearchField` 데코레이터 추가
5. 컨트롤러에서 Kafka 토픽 구독 및 인덱싱 로직 추가

### 테스트 실행

```bash
# 단위 테스트
pnpm test

```

## 라이선스

UNLICENSED
