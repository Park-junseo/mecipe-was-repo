# Virtual Cafe WAS Monorepo

Nx 기반 모노레포로 관리되는 Virtual Cafe 백엔드 시스템입니다. 카페 마케팅을 위한 검색 기능, 어드민 페이지, Three.js 기반 웹 가상현실 환경을 제공하는 마이크로서비스 아키텍처입니다.

## 프로젝트 목표

Virtual Cafe는 카페 마케팅을 위한 통합 플랫폼을 제공합니다:

- **카페 검색**: Elasticsearch를 통한 빠른 카페 검색 기능
- **어드민 관리**: 카페, 카테고리, 이벤트 등록 및 관리
- **웹 가상현실**: Three.js 기반 3D 가상 공간 제공
- **멀티플레이 동기화**: Socket.IO를 통한 실시간 아바타 동기화

## 주요 기능

### 1. 카페 검색 및 관리
- 카페 정보 CRUD 작업
- 지역 카테고리 관리
- 상품 및 쿠폰 관리
- 이미지 업로드 및 관리 (썸네일, 가상 이미지, 실제 이미지)

### 2. 웹 가상현실 환경
- Three.js 기반 3D 가상 공간
- 실시간 멀티플레이어 지원
- 아바타 위치 및 상태 동기화
- 방(Room) 기반 공간 관리

### 3. 인증 및 권한 관리
- JWT 기반 인증
- 역할 기반 접근 제어 (RBAC)
- API Gateway를 통한 중앙 집중식 인증

### 4. 데이터 동기화
- PostgreSQL → Kafka → Elasticsearch 실시간 동기화
- CDC(Change Data Capture) 기반 데이터 파이프라인
- KSQLDB를 통한 데이터 조인 및 변환

## 기술 스택

- **모노레포 관리**: Nx
- **프레임워크**: NestJS 11.x
- **런타임**: Node.js 20.x
- **데이터베이스**: PostgreSQL 15
- **ORM**: Prisma 6.x
- **검색 엔진**: Elasticsearch
- **메시징**: Kafka, KSQLDB
- **캐시/중개**: Redis
- **CDC**: Debezium
- **웹 서버**: Nginx
- **SSL**: Let's Encrypt (Certbot)
- **컨테이너**: Docker & Docker Compose
- **오케스트레이션**: Kubernetes (Helm)
- **CI/CD**: GitHub Actions

## 시스템 아키텍처

이 프로젝트는 두 가지 아키텍처 모델을 지원합니다:

### Full-Model 아키텍처

**Helm 기반 쿠버네티스 클러스터 배포**

모든 인프라 컴포넌트를 포함한 완전한 마이크로서비스 아키텍처입니다.

**구성 요소:**
- **서비스**: place-api-service, api-gateway, meta-viewer-service, place-indexer-service
- **인프라**: Kafka, Elasticsearch, PostgreSQL, Debezium, KSQLDB, Redis, Nginx, Certbot

**특징:**
- Helm Chart를 통한 쿠버네티스 배포
- 모든 서비스 및 인프라 컴포넌트 포함
- 프로덕션 환경에 적합한 완전한 아키텍처

![Full-Model Architecture](./images/total-architecture.full-model.png)

**배포 방법:**
- Helm Chart: `infra/helm/` 디렉토리
- GitHub Actions: `.github/workflows/helm/` (현재 비활성화)

**참고**: 현재 2개의 클라우드 인스턴스(1GB 메모리, OCPU 1개) 환경에서는 Full-Model 배포가 리소스 제약으로 인해 어려워, 현실적인 목표로 Lightweight-Model을 채택했습니다.

### Lightweight-Model 아키텍처

**Docker Compose 기반 경량 배포**

실제 서비스 배포에 사용되는 경량 아키텍처입니다.

**구성 요소:**
- **서비스**: place-api-service, api-gateway, meta-viewer-service
- **인프라**: Redis, PostgreSQL, Nginx, Certbot

**특징:**
- Docker Compose를 통한 간단한 배포
- 최소한의 리소스로 운영 가능
- 2개의 인스턴스로 분산 배포 (Instance A, Instance B)

![Lightweight-Model Architecture](./images/total-architecture.lightweight-model.png)

**배포 방법:**
- Docker Compose: `docker-compose.minimal.instance-a.yml`, `docker-compose.minimal.instance-b.yml`
- GitHub Actions: `.github/workflows/deploy-self-hosted.minimal.yml`

**인스턴스 구성:**
- **Instance A**: place-api-service, api-gateway, PostgreSQL, Nginx, Certbot
- **Instance B**: meta-viewer-service, Redis

## 아키텍처 상세 설명

### Full-Model 아키텍처

```
Internet
    ↓
Nginx + Certbot (HTTPS)
    ↓
API Gateway
    ├── JWT 인증
    └── 라우팅 정책 관리
    ↓
┌─────────────────────────────────────┐
│  Application Services                │
│  ├── Place API Service              │
│  ├── Meta Viewer Service            │
│  └── Place Indexer Service          │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  Data Layer                         │
│  ├── PostgreSQL (Source)            │
│  ├── Debezium (CDC)                │
│  ├── Kafka (Message Queue)         │
│  ├── KSQLDB (Stream Processing)    │
│  ├── Elasticsearch (Search)        │
│  └── Redis (Cache/Pub-Sub)         │
└─────────────────────────────────────┘
```

**데이터 파이프라인:**

![CDC Pipeline Architecture](./images/place-indexer-service.cdc%20pipeline%20data%20sychronize.png)

1. PostgreSQL → Debezium CDC → Kafka Topic
2. Kafka Topic → KSQLDB (JOIN 연산)
3. KSQLDB → Kafka Topic (조인된 데이터)
4. Kafka Topic → Place Indexer Service
5. Place Indexer Service → Elasticsearch

### Lightweight-Model 아키텍처

```
Internet
    ↓
Nginx + Certbot (HTTPS)
    ↓
API Gateway (Instance A)
    ├── JWT 인증
    └── 라우팅 정책 관리
    ↓
Place API Service (Instance A)
    ├── GraphQL/REST API
    └── PostgreSQL
    ↓
Meta Viewer Service (Instance B)
    ├── Socket.IO Server
    └── Redis (Pub-Sub, Queue, Cache)
```

**특징:**
- Place Indexer Service 제외 (Elasticsearch 없이 운영)
- Kafka, KSQLDB, Debezium 제외
- 최소한의 인프라로 핵심 기능 제공

## 실행 방법

### 사전 요구사항

- Node.js 20.x 이상
- pnpm 9.x 이상
- Docker & Docker Compose (배포 시)
- PostgreSQL 15 (로컬 개발 시)

### 로컬 개발 환경

#### 1. 의존성 설치

```bash
# pnpm 설치 (없는 경우)
npm install -g pnpm

# 의존성 설치
pnpm install
```

#### 2. 환경 변수 설정

```bash
# 환경 변수 파일 복사
cp env.example .env

# .env 파일 편집
# - DATABASE_URL: PostgreSQL 연결 정보
# - JWT_SECRET: JWT 서명 키
# - 기타 필요한 환경 변수 설정
```

**참고**: Full-Model 기준으로 `env.example`을 참고하여 로컬 배포 환경을 구성할 수 있습니다. 이 환경 변수들은 GitHub Actions의 Secrets 및 Variables로 제공해야 합니다.

#### 3. 서비스별 실행

```bash
# Place API Service 실행
cd apps/place-api-service
pnpm start:dev

# API Gateway 실행
cd apps/api-gateway
pnpm start:dev

# Meta Viewer Service 실행
cd apps/meta-viewer-service
pnpm start:dev

# Place Indexer Service 실행
cd apps/place-indexer-service
pnpm start:dev
```

#### 4. 전체 빌드 및 테스트

```bash
# 모든 서비스 빌드
pnpm build

# 모든 서비스 테스트
pnpm test

# 모든 서비스 린트
pnpm lint

# 코드 포맷팅
pnpm format
```

### Docker Compose를 사용한 배포

#### Lightweight-Model 배포

```bash
# Instance A 배포
docker compose -f docker-compose.minimal.instance-a.yml up -d

# Instance B 배포
docker compose -f docker-compose.minimal.instance-b.yml up -d

# 로그 확인
docker compose -f docker-compose.minimal.instance-a.yml logs -f
docker compose -f docker-compose.minimal.instance-b.yml logs -f
```

#### 환경 변수 설정

배포 전에 `.env` 파일을 설정해야 합니다:

```bash
# .env 파일에 필요한 환경 변수 설정
# - DATABASE_URL
# - JWT_SECRET
# - REDIS_URL
# - DOMAIN_NAME
# - SSL_EMAIL
# 등등
```

### 라우팅 정책 수집

API Gateway의 라우팅 정책을 수집하려면:

```bash
# 통합 정책 생성
pnpm export:policy

# 서비스별 개별 파일 생성
pnpm export:policy:separate

# 통합 파일 생성 (명시적)
pnpm export:policy:merge
```

## 서비스 구성

이 모노레포는 다음과 같은 서비스들로 구성됩니다:

### 1. Place API Service

카페 정보, 사용자, 상품, 쿠폰 등 다양한 도메인 데이터를 관리하는 GraphQL 및 REST API 서비스입니다.

**주요 기능:**
- GraphQL API (Apollo Server)
- REST API
- Prisma ORM을 통한 타입 안전한 데이터베이스 접근
- 이미지 업로드 및 관리
- JWT 기반 인증

**자세한 내용**: [apps/place-api-service/README.md](./apps/place-api-service/README.md)

### 2. API Gateway

모든 클라이언트 요청의 단일 진입점 역할을 하는 서비스입니다.

**주요 기능:**
- JWT 인증 미들웨어
- 데코레이터 기반 라우팅 정책 수집
- 요청 프록시 및 라우팅
- 사용자 정보 헤더 전달

**자세한 내용**: [apps/api-gateway/README.md](./apps/api-gateway/README.md)

### 3. Meta Viewer Service

Redis를 중개로 사용하는 다중 소켓 서버로, 실시간 멀티플레이어 동기화를 제공합니다.

![Redis Socket Server Architecture](./images/meta-viewer-serivce.by-redis%20socket%20server.png)

**주요 기능:**
- Socket.IO 기반 WebSocket 서버
- Redis를 통한 다중 서버 간 통신
- 분산 락 기반 리더 선별 및 브로드캐스트
- 세션 기반 재연결 지원
- 방(Room) 기반 공간 관리

**자세한 내용**: [apps/meta-viewer-service/README.md](./apps/meta-viewer-service/README.md)

### 4. Place Indexer Service

PostgreSQL 데이터베이스의 변경사항을 Kafka를 통해 수신하고, KSQLDB에서 조인된 데이터를 컨슈밍하여 Elasticsearch에 인덱싱하는 서비스입니다.

**주요 기능:**
- Kafka Consumer
- Elasticsearch 인덱싱
- 자동 인덱스 생성
- 타입 안전한 인덱싱

**자세한 내용**: [apps/place-indexer-service/README.md](./apps/place-indexer-service/README.md)

### 5. Common Library

모든 서비스에서 공통으로 사용되는 유틸리티, 미들웨어, 가드, 데코레이터 등을 제공하는 공유 라이브러리입니다.

**주요 기능:**
- 인증 및 인가 모듈
- 라우팅 정책 수집 시스템
- Kafka 통합
- 로깅 미들웨어 및 인터셉터
- 공통 에러 처리

**자세한 내용**: [libs/common/README.md](./libs/common/README.md)

## HTTPS 및 리버스 프록시

이 프로젝트는 **Nginx와 Certbot을 통해서 직접적인 HTTPS 요청을 처리**합니다:

- **Nginx**: 리버스 프록시 및 SSL/TLS 종료
- **Certbot**: Let's Encrypt 인증서 자동 발급 및 갱신
- **자동 설정**: `DOMAIN_NAME` 환경 변수를 통해 자동으로 Nginx 설정 적용

모든 클라이언트 요청은 HTTPS로 암호화되어 Nginx를 통해 각 서비스로 프록시됩니다.

## 환경 변수

주요 환경 변수는 `env.example` 파일을 참조하세요.

### 필수 환경 변수

```env
# 도메인 설정
DOMAIN_NAME=your-domain.com
SSL_EMAIL=your-email@example.com

# 데이터베이스
DATABASE_URL=postgresql://user:pass@host:5432/db?schema=public

# JWT 인증
JWT_SECRET=your_jwt_secret_key
JWT_PUBLIC_KEY=base64_encoded_public_key

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password

# Elasticsearch (Full-Model)
ELASTICSEARCH_HOSTS=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your_password

# Kafka (Full-Model)
KAFKA_BROKERS=localhost:9092
KAFKA_GROUP_ID=your-group-id
KAFKA_CLIENT_ID=your-client-id
```

**참고**: Full-Model 기준으로 `env.example`을 참고하여 로컬 배포 환경을 구성할 수 있습니다. 이 환경 변수들은 GitHub Actions의 **Secrets 및 Variables**로 제공해야 합니다.

## 배포

### Lightweight-Model 배포 (현재 사용 중)

GitHub Actions를 통한 자동 배포:

1. **환경 변수 설정**: GitHub Secrets에 필요한 환경 변수 설정
2. **Self-Hosted Runner**: 인스턴스에 GitHub Actions Runner 설정
3. **자동 배포**: `main` 브랜치에 push 시 자동 배포

**워크플로우**: `.github/workflows/deploy-self-hosted.minimal.yml`

**Docker Compose 파일**:
- `docker-compose.minimal.instance-a.yml`: Instance A 구성
- `docker-compose.minimal.instance-b.yml`: Instance B 구성

### Full-Model 배포 (향후 계획)

Helm Chart를 통한 쿠버네티스 배포:

1. **Helm Chart**: `infra/helm/` 디렉토리
2. **배포 스크립트**: `.github/workflows/helm/` (현재 비활성화)
3. **리소스 요구사항**: 더 많은 메모리 및 CPU 필요

## 프로젝트 구조

```
virtualcafe-was-repo/
├── apps/
│   ├── place-api-service/      # Place API Service
│   ├── api-gateway/             # API Gateway
│   ├── meta-viewer-service/     # Meta Viewer Service
│   └── place-indexer-service/   # Place Indexer Service
├── libs/
│   └── common/                  # Common Library
├── infra/
│   └── helm/                    # Helm Charts (Full-Model)
├── nginx/                       # Nginx 설정
├── scripts/                     # 배포 및 유틸리티 스크립트
├── .github/
│   └── workflows/              # GitHub Actions 워크플로우
├── docker-compose.minimal.*.yml # Lightweight-Model 배포 파일
├── env.example                  # 환경 변수 예시
└── package.json                # 루트 패키지 설정
```

## 개발 가이드

### 새로운 서비스 추가하기

1. Nx를 사용하여 새 앱 생성:
   ```bash
   nx generate @nx/nest:application my-service
   ```

2. `apps/my-service/` 디렉토리에 서비스 구현

3. `package.json`의 빌드 스크립트에 추가

### 라우팅 정책 추가하기

1. 서비스의 컨트롤러에 `@Public()` 또는 `@RequireRole()` 데코레이터 추가
2. 정책 수집: `pnpm export:policy`
3. API Gateway에서 자동으로 정책 적용

### 데이터베이스 마이그레이션

```bash
# Place API Service 마이그레이션
cd apps/place-api-service
pnpm prisma:migrate

# 마이그레이션 생성
pnpm prisma migrate dev --name migration_name
```

## 테스트

```bash
# 모든 서비스 테스트
pnpm test

# 특정 서비스 테스트
nx test place-api-service

# 테스트 커버리지
pnpm test:cov
```

## 모니터링 및 로그

### Docker Compose 로그

```bash
# Instance A 로그
docker compose -f docker-compose.minimal.instance-a.yml logs -f

# Instance B 로그
docker compose -f docker-compose.minimal.instance-b.yml logs -f

# 특정 서비스 로그
docker compose -f docker-compose.minimal.instance-a.yml logs -f place-api-service
```

## 백업

데이터베이스 백업:

```bash
# 백업 실행
./scripts/backup-db.sh

# 백업 파일 위치
ls -lh backups/
```


5. Open a Pull Request

## 라이선스

이 프로젝트는 비공개 라이선스입니다.

## 참고 자료

- [NestJS Documentation](https://nestjs.com/)
- [Nx Documentation](https://nx.dev/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)

## 추가 문서

각 서비스의 상세한 문서는 해당 서비스의 README.md를 참조하세요:

- 📚 [Place API Service](./apps/place-api-service/README.md)
- 🚪 [API Gateway](./apps/api-gateway/README.md)
- 🎮 [Meta Viewer Service](./apps/meta-viewer-service/README.md)
- 🔍 [Place Indexer Service](./apps/place-indexer-service/README.md)
- 📦 [Common Library](./libs/common/README.md)
