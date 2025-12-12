# 테스트 환경 실행 가이드

이 가이드는 테스트 환경에서 모든 서비스를 한번에 실행하는 방법을 설명합니다.

## 빠른 시작

### 1. 모든 서비스 실행 (Nx 방식 - 추천)

```bash
# 모든 프로젝트의 테스트 환경 실행
pnpm test:env

# Watch 모드로 실행
pnpm test:env:watch
```

이 명령은 다음을 실행합니다:
- **place-indexer-service**: PostgreSQL, Kafka, Elasticsearch, Kibana, Kafka UI, KSQLDB, Debezium Connect + NestJS 앱
- **mecipe-was**: PostgreSQL + NestJS 앱

### 2. 특정 프로젝트만 실행

```bash
# place-indexer-service만
nx run place-indexer-service:test:env

# mecipe-was만
nx run mecipe-was:test:env

# Watch 모드
nx run place-indexer-service:test:env:watch
nx run mecipe-was:test:env:watch
```

## 고급 옵션

### 특정 서비스 제외

```bash
# Kafka 제외
pnpm test:env:start --exclude:kafka

# 여러 서비스 제외
pnpm test:env:start --exclude:kafka --exclude:elasticsearch

# mecipe-was는 실행하지 않고 place-indexer-service만
pnpm test:env:start --no-place-indexer
```

### 사용 가능한 exclude 옵션

- `--exclude:postgres` - PostgreSQL 제외
- `--exclude:kafka` - Kafka 제외
- `--exclude:debezium-connect` - Debezium Connect 제외
- `--exclude:kafka-ui` - Kafka UI 제외
- `--exclude:kibana` - Kibana 제외
- `--exclude:elasticsearch` - Elasticsearch 제외
- `--exclude:ksqldb` - KSQLDB 제외

## 개별 서비스 실행

### Nx 명령어 사용 (추천)

```bash
# place-indexer-service만
nx run place-indexer-service:test:env

# mecipe-was만
nx run mecipe-was:test:env
```

### 기존 스크립트 사용

```bash
# place-indexer-service만
cd apps/place-indexer-service
pnpm start:test --start-app

# mecipe-was만
cd mecipe-was
pnpm start:test --start-app
```

## 환경 변수

테스트 환경에서는 자동으로 Testcontainers를 사용하여 다음이 설정됩니다:

- **PostgreSQL**: `localhost:5432` (동적 포트)
- **Kafka**: `localhost:9092` (고정 포트)
- **Elasticsearch**: `http://localhost:9200` (고정 포트)
- **Kibana**: `http://localhost:5601` (동적 포트)
- **Kafka UI**: `http://localhost:8080` (동적 포트)
- **KSQLDB**: `http://localhost:8088` (동적 포트)
- **Debezium Connect**: `http://localhost:8083` (동적 포트)

## 문제 해결

### 포트 충돌

특정 포트가 이미 사용 중인 경우:

```bash
# 사용 중인 포트 확인
lsof -i :9092  # Linux/Mac
netstat -ano | findstr :9092  # Windows

# 해당 프로세스 종료 후 다시 실행
```

### 컨테이너 정리

테스트 종료 후 컨테이너가 남아있는 경우:

```bash
# 모든 Testcontainers 정리
docker ps -a | grep testcontainers | awk '{print $1}' | xargs docker rm -f

# 또는 네트워크 정리
docker network rm mecipe-network-test
```

### 로그 확인

각 서비스의 로그는 터미널에 직접 출력됩니다. 특정 서비스의 로그만 보고 싶다면 개별 실행을 사용하세요.

## 스크립트 구조

```
scripts/
└── test-env-start.ts          # 통합 테스트 환경 실행 스크립트

apps/place-indexer-service/scripts/
└── test-infra-setup.dev.ts    # place-indexer-service 인프라 설정

mecipe-was/scripts/prisma/
└── test-db-setup.dev.ts       # mecipe-was 데이터베이스 설정
```

## 주의사항

1. **Docker 필수**: Testcontainers를 사용하므로 Docker가 실행 중이어야 합니다.
2. **리소스**: 모든 서비스를 동시에 실행하면 상당한 메모리와 CPU를 사용합니다.
3. **포트**: 일부 포트는 고정되어 있으므로 충돌을 주의하세요.
4. **정리**: Ctrl+C로 종료하면 자동으로 모든 컨테이너가 정리됩니다.

## 예제

### 개발 중 빠른 테스트

```bash
# 인프라만 시작 (앱 없이)
cd apps/place-indexer-service
pnpm start:test

# 별도 터미널에서 앱 실행
pnpm start:dev
```

### 전체 통합 테스트

```bash
# 모든 서비스 watch 모드로 실행
pnpm test:env:start:all:watch
```

### 특정 서비스만 테스트

```bash
# Elasticsearch 없이 실행
pnpm test:env:start --exclude:elasticsearch
```

