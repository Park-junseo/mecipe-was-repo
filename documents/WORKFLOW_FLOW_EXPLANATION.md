# GitHub Actions 워크플로우 흐름 설명

## 전체 워크플로우 구조

```
1. test (테스트)
   ↓
2. build_and_push_docker (Docker 이미지 빌드 및 푸시)
   ↓
3. healthcheck_instance_b (인스턴스 B 헬스체크 및 폴백) ✅
   ↓
4. deploy_instance_b (인스턴스 B Helm 배포)
   ↓
5. deploy_instance_a (인스턴스 A Helm 배포)
```

## 각 Job 상세 설명

### 1️⃣ test (테스트)
**실행 위치**: GitHub Actions Runner (ubuntu-latest)
**목적**: 코드 검증

- Node.js 의존성 설치
- Prisma Client 생성
- Linter 실행
- 테스트 실행
- 빌드 검증

**결과**: 테스트 통과 시 다음 단계로 진행

---

### 2️⃣ build_and_push_docker (Docker 이미지 빌드)
**실행 위치**: GitHub Actions Runner (ubuntu-latest)
**목적**: 애플리케이션 이미지 빌드 및 Docker Hub 푸시

**빌드하는 이미지:**
- `mecipe-api-server:latest` (mecipe-was)
- `place-indexer-service:latest`
- `mecipe-nginx:latest`

**결과**: Docker Hub에 이미지가 푸시됨

---

### 3️⃣ healthcheck_instance_b (헬스체크 및 폴백) ✅
**실행 위치**: Self-hosted Runner (instance-b 서버)
**목적**: **외부 인스턴스에 직접 설치된 PostgreSQL과 Elasticsearch가 동작하는지 확인**

#### ⚠️ 중요 제약사항:
- **PostgreSQL은 인스턴스에 직접 설치되어 있음** (Docker/Helm 아님)
- **Elasticsearch도 인스턴스에 직접 설치되어 있을 수 있음**
- Kubernetes Pod가 아닌 실제 서버의 서비스를 체크해야 함

#### 동작 방식:

1. **외부 인스턴스의 실제 호스트/IP로 헬스체크**
   ```bash
   # 환경 변수로 실제 호스트/IP 설정
   POSTGRES_HOST=localhost  # 또는 실제 IP 주소
   ELASTICSEARCH_HOST=localhost  # 또는 실제 IP 주소
   ```

2. **헬스체크 시도**
   ```bash
   # PostgreSQL 체크 (외부 인스턴스의 실제 서비스)
   pg_isready -h localhost -p 5432
   
   # Elasticsearch 체크 (외부 인스턴스의 실제 서비스)
   curl -f http://localhost:9200/_cluster/health
   ```

3. **응답이 없으면 (30초 타임아웃)**
   ```bash
   # Docker로 임시 폴백 컨테이너 띄우기
   docker run -d --name postgresql-fallback ...
   docker run -d --name elasticsearch-fallback ...
   ```

#### 왜 이 단계가 필요한가?

- **외부 인스턴스의 PostgreSQL/Elasticsearch가 다운되었을 때**
- **배포가 실패하지 않도록 임시로 Docker로 띄워서 배포 진행 가능하게 함**
- **폴백 메커니즘으로 안정성 확보**

---

### 4️⃣ deploy_instance_b (인스턴스 B Helm 배포)
**실행 위치**: Self-hosted Runner (instance-b 서버)
**목적**: Elasticsearch, Kibana, Debezium을 Kubernetes에 배포

#### 배포하는 서비스:
- ~~PostgreSQL~~: **비활성화** (`postgresql.enabled=false`) - 외부 인스턴스 사용
- **Elasticsearch**: Kubernetes Pod로 배포 (또는 외부 인스턴스 사용)
- **Kibana**: Elasticsearch 시각화 도구
- **Debezium Connect**: CDC (Change Data Capture) - 외부 PostgreSQL 연결

#### ⚠️ 중요한 설정:

```yaml
# Helm 배포 시
--set postgresql.enabled=false  # 외부 인스턴스의 PostgreSQL 사용
--set debezium.connector.database.hostname="localhost"  # 외부 PostgreSQL 호스트
```

#### 배포 후 작업:
1. Elasticsearch 사용자 설정 (kibana_system 비밀번호)
2. Debezium Connector 설정 (외부 PostgreSQL 연결)
3. 헬스체크

#### 3번째 단계와의 관계:

**정상 흐름:**
1. 3번째: 외부 인스턴스의 PostgreSQL이 동작 중 ✅
2. 4번째: Helm 배포 시 `postgresql.enabled=false`로 설정
3. Debezium이 외부 PostgreSQL에 연결

**폴백 흐름:**
1. 3번째: 외부 인스턴스의 PostgreSQL이 다운됨 ❌
2. 3번째: Docker로 임시 PostgreSQL 띄움 (postgresql-fallback)
3. 4번째: Helm 배포 시 `postgresql.enabled=false`로 설정
4. Debezium이 Docker 폴백 PostgreSQL에 연결

---

### 5️⃣ deploy_instance_a (인스턴스 A Helm 배포)
**실행 위치**: Self-hosted Runner (instance-a 서버)
**목적**: 애플리케이션 서비스 배포

#### 배포하는 서비스:
- **mecipe-was**: 메인 API 서버
- **place-indexer-service**: 인덱싱 서비스
- **nginx**: 리버스 프록시
- **Kafka**: 스트리밍 플랫폼 (선택사항)

#### 배포 후 작업:
1. Prisma 마이그레이션 실행 (외부 PostgreSQL에 연결)
2. 헬스체크

---

## 전체 흐름 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│ GitHub Actions Runner (ubuntu-latest)                       │
├─────────────────────────────────────────────────────────────┤
│ 1. test                                                     │
│    ├─ 코드 검증                                             │
│    └─ 빌드 테스트                                           │
│                                                             │
│ 2. build_and_push_docker                                   │
│    ├─ mecipe-api-server 이미지 빌드                        │
│    ├─ place-indexer-service 이미지 빌드                    │
│    ├─ mecipe-nginx 이미지 빌드                             │
│    └─ Docker Hub에 푸시                                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Self-hosted Runner (instance-b 서버)                        │
│                                                             │
│ ⚠️ 외부 인스턴스에 직접 설치된 PostgreSQL/Elasticsearch   │
├─────────────────────────────────────────────────────────────┤
│ 3. healthcheck_instance_b ✅                               │
│    ├─ 외부 인스턴스의 PostgreSQL 체크 (localhost:5432)    │
│    │  └─ 실패 시 → Docker로 띄움 (postgresql-fallback)  │
│    └─ 외부 인스턴스의 Elasticsearch 체크 (localhost:9200) │
│       └─ 실패 시 → Docker로 띄움 (elasticsearch-fallback) │
│                                                             │
│ 4. deploy_instance_b                                       │
│    ├─ Helm으로 PostgreSQL 배포 ❌ (postgresql.enabled=false)│
│    ├─ Helm으로 Elasticsearch 배포 (또는 외부 사용)         │
│    ├─ Helm으로 Kibana 배포                                  │
│    ├─ Helm으로 Debezium 배포                               │
│    ├─ Debezium이 외부 PostgreSQL에 연결                    │
│    ├─ Elasticsearch 사용자 설정                            │
│    └─ Debezium Connector 설정                              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Self-hosted Runner (instance-a 서버)                        │
├─────────────────────────────────────────────────────────────┤
│ 5. deploy_instance_a                                       │
│    ├─ Helm으로 mecipe-was 배포                              │
│    │  └─ 외부 PostgreSQL에 연결 (DATABASE_URL)            │
│    ├─ Helm으로 place-indexer-service 배포                  │
│    │  └─ 외부 Elasticsearch에 연결                          │
│    ├─ Helm으로 nginx 배포                                   │
│    ├─ Prisma 마이그레이션 실행                              │
│    └─ 헬스체크                                              │
└─────────────────────────────────────────────────────────────┘
```

## 핵심 포인트

### ✅ 3단계가 필요한 이유

1. **외부 인스턴스의 PostgreSQL/Elasticsearch가 다운되었을 때**
   - 배포가 실패하지 않도록 임시로 Docker로 띄움
   - 폴백 메커니즘으로 안정성 확보

2. **배포 전 사전 검증**
   - 외부 서비스가 동작하는지 확인
   - 문제가 있으면 조기 발견

### ⚠️ 주의사항

1. **환경 변수 설정**
   - `POSTGRES_HOST`: 외부 인스턴스의 실제 호스트/IP (기본값: localhost)
   - `ELASTICSEARCH_HOST`: 외부 인스턴스의 실제 호스트/IP (기본값: localhost)
   - Kubernetes 서비스 이름이 아닌 실제 호스트/IP 사용

2. **Helm 배포 설정**
   - `postgresql.enabled=false`: 외부 인스턴스의 PostgreSQL 사용
   - Debezium Connector가 외부 PostgreSQL에 연결하도록 설정

3. **포트 충돌 가능성**
   - 3번째에서 Docker 폴백을 띄우면 포트 5432, 9200 사용
   - 외부 인스턴스의 서비스와 충돌하지 않도록 주의

### 🔧 환경 변수 설정 예시

GitHub Secrets에 다음을 설정:

```yaml
# 외부 인스턴스의 실제 호스트/IP
POSTGRES_HOST: "192.168.1.100"  # 또는 "localhost"
ELASTICSEARCH_HOST: "192.168.1.100"  # 또는 "localhost"

# 포트 (기본값 사용 가능)
POSTGRES_PORT: "5432"
ELASTICSEARCH_PORT: "9200"

# 인증 정보
POSTGRES_USER: "postgres"
POSTGRES_PASSWORD: "your-password"
ELASTICSEARCH_USERNAME: "elastic"
ELASTICSEARCH_PASSWORD: "your-password"
```

## 요약

1. **1-2단계**: 코드 테스트 및 Docker 이미지 빌드 (GitHub Runner)
2. **3단계**: 외부 인스턴스의 PostgreSQL/Elasticsearch 헬스체크 및 폴백 ✅
3. **4단계**: 인스턴스 B Helm 배포 (PostgreSQL 제외, 외부 사용)
4. **5단계**: 인스턴스 A Helm 배포 (외부 PostgreSQL/Elasticsearch 연결)

**3단계는 외부 인스턴스의 서비스를 체크하고, 문제가 있으면 Docker 폴백을 제공하는 중요한 단계입니다.**
