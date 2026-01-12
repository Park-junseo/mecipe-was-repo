# 로컬 Docker Compose 배포 가이드

실제 환경 배포 전 로컬에서 전체 스택을 테스트하기 위한 가이드입니다.

## 사전 요구사항

- Docker 및 Docker Compose 설치
- PostgreSQL (로컬 또는 Docker)
- 필요한 포트가 사용 가능해야 함:
  - 4000: API Gateway
  - 4100: Meta Viewer Service
  - 5432: PostgreSQL (로컬인 경우)
  - 5601: Kibana
  - 8080: Kafka UI
  - 8083: Debezium Connect
  - 8088: KSQLDB
  - 9200: Elasticsearch

## 사용 방법

### 1. 환경 변수 파일 생성

```bash
# 예시 파일을 복사
cp .env.local.compose.example .env.local.compose

# 환경 변수 편집
nano .env.local.compose  # 또는 원하는 에디터 사용
```

### 2. 필수 환경 변수 설정

`.env.local.compose` 파일에서 다음 변수들을 반드시 설정해야 합니다:

#### 데이터베이스 설정
```bash
POSTGRES_HOST=localhost          # 또는 db (Docker 사용 시)
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=mecipe_db
```

#### JWT 및 인증
```bash
JWT_SECRET=your_jwt_secret_key_here
SECRET_LOGIN_CRYPTO=your_login_crypto_secret_here
```

#### Elasticsearch
```bash
ELASTICSEARCH_SUPERUSER_PASSWORD=your_elasticsearch_superuser_password
ELASTICSEARCH_KIBANA_PASSWORD=your_elasticsearch_kibana_password
ELASTICSEARCH_PRODUCER_USER_PASS=your_elasticsearch_producer_password
ELASTICSEARCH_APP_USER_PASS=your_elasticsearch_app_password
```

### 3. 배포 스크립트 실행

```bash
# 스크립트 실행 권한 부여 (Linux/Mac)
chmod +x scripts/dev/local-compose-deploy.sh

# 배포 실행
./scripts/dev/local-compose-deploy.sh
```

## 배포 순서

스크립트는 다음 순서로 배포를 진행합니다:

1. **Docker 이미지 빌드**
   - place-api-service
   - api-gateway
   - meta-viewer-service
   - place-indexer-service
   - nginx

2. **인스턴스 B - Elasticsearch 배포**
   - Elasticsearch 컨테이너 시작
   - Elasticsearch 사용자 초기화

3. **인스턴스 A 배포**
   - Zookeeper → Kafka → Schema Registry → Connect → KSQLDB
   - KSQLDB 쿼리 초기화
   - place-api-service, api-gateway 배포
   - kafka-ui 배포
   - Nginx 배포 (HTTP only, SSL 없음)

4. **인스턴스 B - 나머지 서비스 배포**
   - Redis 배포
   - Kibana 배포
   - Debezium 배포 및 connector 초기화
   - meta-viewer-service, place-indexer-service 배포

5. **헬스 체크**
   - 모든 서비스 상태 확인

## 접속 정보

배포 완료 후 다음 URL로 접속할 수 있습니다:

- **API Gateway**: http://localhost
- **Kafka UI**: http://localhost:8080
- **KSQLDB**: http://localhost:8088
- **Kibana**: http://localhost:5601
- **Elasticsearch**: http://localhost:9200

## 서비스 관리

### 서비스 상태 확인

```bash
# 인스턴스 A
docker compose -f docker-compose.instance-a.yml ps

# 인스턴스 B
docker compose -f docker-compose.instance-b.yml ps
```

### 로그 확인

```bash
# 인스턴스 A
docker compose -f docker-compose.instance-a.yml logs -f

# 인스턴스 B
docker compose -f docker-compose.instance-b.yml logs -f

# 특정 서비스만
docker compose -f docker-compose.instance-a.yml logs -f place-api-service
```

### 서비스 중지

```bash
# 인스턴스 A 중지
docker compose -f docker-compose.instance-a.yml down

# 인스턴스 B 중지
docker compose -f docker-compose.instance-b.yml down

# 모든 서비스 중지 및 볼륨 삭제
docker compose -f docker-compose.instance-a.yml down -v
docker compose -f docker-compose.instance-b.yml down -v
```

### 서비스 재시작

```bash
# 특정 서비스 재시작
docker compose -f docker-compose.instance-a.yml restart place-api-service

# 모든 서비스 재시작
docker compose -f docker-compose.instance-a.yml restart
docker compose -f docker-compose.instance-b.yml restart
```

## 주의사항

1. **SSL 없음**: 로컬 테스트용이므로 SSL 인증서 설정을 생략합니다. Nginx는 HTTP만 사용합니다.

2. **도메인**: `DOMAIN_NAME=localhost`로 설정되어 있습니다.

3. **네트워크**: 로컬에서는 두 인스턴스가 같은 Docker 네트워크를 사용하므로 서비스 이름으로 직접 접근 가능합니다.

4. **데이터베이스**: 로컬 PostgreSQL을 사용하거나 Docker PostgreSQL을 별도로 실행해야 합니다.

5. **포트 충돌**: 이미 사용 중인 포트가 있으면 배포가 실패할 수 있습니다. 포트를 확인하고 필요시 변경하세요.

## 트러블슈팅

### Elasticsearch 초기화 실패

```bash
# Elasticsearch 로그 확인
docker compose -f docker-compose.instance-b.yml logs elasticsearch

# 수동으로 사용자 초기화
export ELASTICSEARCH_HOSTS="http://localhost:9200"
./scripts/prod/init-elasticsearch-users.sh
```

### Kafka 연결 실패

```bash
# Kafka 로그 확인
docker compose -f docker-compose.instance-a.yml logs kafka

# Kafka 상태 확인
docker compose -f docker-compose.instance-a.yml ps kafka
```

### 데이터베이스 연결 실패

```bash
# PostgreSQL 연결 테스트
psql -h localhost -p 5432 -U postgres -d mecipe_db

# 또는 Docker PostgreSQL인 경우
docker compose -f docker-compose.instance-b.yml exec postgres psql -U postgres -d mecipe_db
```

## 다음 단계

로컬 배포가 성공적으로 완료되면:

1. 모든 서비스가 정상 동작하는지 확인
2. API 엔드포인트 테스트
3. Kafka 메시지 전송/수신 테스트
4. Elasticsearch 인덱싱 테스트
5. 실제 환경 배포 준비
