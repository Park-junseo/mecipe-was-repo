# Kubernetes 배포 전략 및 Nx 도입 가이드

## 쿠버네티스 배포 개요

현재 프로젝트는 두 개의 인스턴스로 분리되어 배포됩니다:

### 인스턴스 A
- **Kafka**: 메시지 브로커
- **KSQLDB**: 스트림 처리 엔진
- **Kafka UI**: Kafka 관리 UI
- **place-indexer-service**: NestJS 기반 인덱서 서비스
- **mecipe-was**: NestJS 기반 메인 API 서버
- **Nginx**: 리버스 프록시 및 로드 밸런서
- **Certbot**: SSL 인증서 관리

### 인스턴스 B
- **PostgreSQL**: 메인 데이터베이스
- **Elasticsearch**: 검색 엔진
- **Kibana**: Elasticsearch 관리 UI
- **Debezium**: Change Data Capture (CDC)

## 헬스체크 및 폴백 메커니즘

인스턴스 B의 PostgreSQL과 Elasticsearch에 대해 헬스체크를 수행하며, 30초 이상 응답이 없으면 Docker로 폴백합니다.

### 헬스체크 스크립트

`scripts/healthcheck-and-fallback.sh` 스크립트가 다음을 수행합니다:

1. PostgreSQL 헬스체크 (`pg_isready`)
2. Elasticsearch 헬스체크 (`/_cluster/health`)
3. 응답이 없으면 Docker 컨테이너로 시작

### 환경 변수

- `POSTGRES_HOST`: PostgreSQL 호스트 (기본값: `postgresql.instance-b.svc.cluster.local`)
- `POSTGRES_PORT`: PostgreSQL 포트 (기본값: `5432`)
- `ELASTICSEARCH_HOST`: Elasticsearch 호스트 (기본값: `elasticsearch.instance-b.svc.cluster.local`)
- `ELASTICSEARCH_PORT`: Elasticsearch 포트 (기본값: `9200`)
- `TIMEOUT`: 타임아웃 (기본값: `30` 초)

## Nx 도입 가능 여부

### ✅ Nx 도입 가능

현재 프로젝트 구조는 Nx 도입에 적합합니다:

```
virtualcafe-was-repo/
├── apps/
│   └── place-indexer-service/    # 이미 앱 구조로 분리됨
├── mecipe-was/                    # 앱으로 변환 가능
└── nginx/                         # 앱으로 변환 가능
```

### Nx 도입 시 장점

1. **모노레포 관리**: 여러 앱과 라이브러리를 하나의 저장소에서 관리
2. **의존성 그래프**: 앱 간 의존성을 시각화하고 관리
3. **빌드 캐싱**: 변경된 부분만 빌드하여 빌드 시간 단축
4. **코드 공유**: 공통 라이브러리를 쉽게 공유
5. **병렬 실행**: 테스트와 빌드를 병렬로 실행

### Nx 도입 시 고려사항

#### 1. 프로젝트 구조 변경

현재:
```
virtualcafe-was-repo/
├── apps/place-indexer-service/
├── mecipe-was/
└── nginx/
```

Nx 도입 후:
```
virtualcafe-was-repo/
├── apps/
│   ├── place-indexer-service/
│   ├── mecipe-was/
│   └── nginx/
├── libs/
│   ├── common/              # 공통 유틸리티
│   ├── elasticsearch/       # Elasticsearch 클라이언트
│   ├── kafka/              # Kafka 클라이언트
│   └── prisma/             # Prisma 스키마 및 클라이언트
└── nx.json
```

#### 2. 빌드 및 배포 스크립트 수정

현재:
- 각 앱별로 독립적인 `package.json`과 빌드 스크립트

Nx 도입 후:
- `nx.json`에서 빌드 타겟 정의
- `nx build <app-name>`으로 빌드
- `nx test <app-name>`으로 테스트
- `nx run-many --target=build --projects=apps/*`로 모든 앱 빌드

#### 3. Dockerfile 수정

Nx 도입 시 Dockerfile도 수정이 필요합니다:

```dockerfile
# 예시: mecipe-was Dockerfile
FROM node:20-slim AS builder

WORKDIR /app

# Nx 설치 및 의존성 설치
COPY package*.json ./
COPY nx.json ./
RUN npm ci

# 전체 프로젝트 복사
COPY . .

# Nx로 빌드
RUN npx nx build mecipe-was

# 프로덕션 이미지
FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/dist/apps/mecipe-was ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
CMD ["node", "dist/main.js"]
```

#### 4. CI/CD 파이프라인 수정

GitHub Actions 워크플로우에서:

```yaml
- name: Build with Nx
  run: |
    npm ci
    npx nx build mecipe-was
    npx nx build place-indexer-service
```

#### 5. 의존성 관리

Nx는 프로젝트 간 의존성을 자동으로 감지하고 빌드 순서를 결정합니다.

예시:
```json
// apps/place-indexer-service/project.json
{
  "targets": {
    "build": {
      "dependsOn": ["^build"],
      "executor": "@nx/webpack:webpack"
    }
  }
}
```

### Nx 마이그레이션 단계

1. **Nx 설치**
   ```bash
   npx create-nx-workspace@latest virtualcafe-was-repo --preset=apps
   ```

2. **기존 프로젝트 통합**
   ```bash
   # 기존 앱을 Nx 워크스페이스로 이동
   mv mecipe-was apps/
   mv nginx apps/
   ```

3. **공통 라이브러리 추출**
   ```bash
   nx generate @nx/node:library common
   nx generate @nx/node:library elasticsearch
   ```

4. **프로젝트 설정**
   ```bash
   # 각 앱을 Nx 프로젝트로 등록
   nx generate @nx/node:application mecipe-was
   ```

5. **빌드 및 테스트 스크립트 수정**
   - `package.json`의 스크립트를 Nx 명령어로 변경
   - CI/CD 파이프라인 수정

### Nx 도입 시 주의사항

1. **학습 곡선**: 팀원들이 Nx 개념을 학습해야 함
2. **마이그레이션 시간**: 기존 프로젝트를 Nx로 마이그레이션하는 데 시간 소요
3. **의존성 관리**: 앱 간 의존성을 명확히 정의해야 함
4. **빌드 캐싱**: CI/CD 환경에서 캐시를 적절히 설정해야 함

### 결론

**Nx 도입은 가능하며 권장됩니다.** 특히:
- 여러 앱을 관리하는 경우
- 코드 공유가 필요한 경우
- 빌드 시간을 단축하고 싶은 경우
- 모노레포 구조를 체계적으로 관리하고 싶은 경우

다만, 마이그레이션은 단계적으로 진행하는 것이 좋습니다:
1. 먼저 Nx를 설치하고 기본 구조 설정
2. 하나의 앱부터 마이그레이션
3. 공통 라이브러리 추출
4. 나머지 앱 마이그레이션
5. CI/CD 파이프라인 업데이트

