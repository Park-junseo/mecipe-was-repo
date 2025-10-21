# 외부 데이터베이스 사용 가이드

이 프로젝트는 외부 PostgreSQL 데이터베이스 서버를 사용하도록 기본 설정되어 있습니다.

## 개요

기본 `docker-compose.yml`은 데이터베이스 컨테이너를 포함하지 않습니다. 이는 다음과 같은 경우에 유용합니다:

- ✅ 관리형 데이터베이스 사용 (AWS RDS, Azure Database, Google Cloud SQL)
- ✅ 기존에 설치된 PostgreSQL 서버 사용
- ✅ 별도의 데이터베이스 서버 사용
- ✅ 여러 환경에서 동일한 데이터베이스 공유

## 외부 데이터베이스 연결

### 1. DATABASE_URL 설정

`.env` 파일에서 외부 데이터베이스 URL을 설정하세요:

```env
# 기본 형식
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"

# 예시: 로컬 PostgreSQL
DATABASE_URL="postgresql://mecipe_user:mypassword@localhost:5432/mecipe_db?schema=public"

# 예시: AWS RDS
DATABASE_URL="postgresql://admin:mypassword@mydb.xxxxx.ap-northeast-2.rds.amazonaws.com:5432/mecipe_db?schema=public"

# 예시: Azure Database for PostgreSQL
DATABASE_URL="postgresql://admin@myserver:mypassword@myserver.postgres.database.azure.com:5432/mecipe_db?schema=public&sslmode=require"

# 예시: Google Cloud SQL
DATABASE_URL="postgresql://postgres:mypassword@34.xxx.xxx.xxx:5432/mecipe_db?schema=public"
```

### 2. 연결 옵션

#### SSL 연결 (권장)
```env
DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public&sslmode=require"
```

#### Connection Pool 설정
```env
DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public&connection_limit=10&pool_timeout=30"
```

#### 타임아웃 설정
```env
DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public&connect_timeout=10&statement_timeout=30000"
```

### 3. 애플리케이션 시작

```bash
# 환경 변수 확인
cat .env | grep DATABASE_URL

# Docker Compose 시작
docker compose up -d

# 연결 테스트
docker compose exec app npx prisma db pull
```

## 관리형 데이터베이스 설정

### AWS RDS (PostgreSQL)

#### 1. RDS 인스턴스 생성
- AWS Console > RDS > Create database
- Engine: PostgreSQL 15
- Template: Production (또는 Dev/Test)
- DB instance identifier: `mecipe-db`
- Master username: `mecipe_admin`
- Master password: 강력한 비밀번호 설정
- DB instance class: db.t4g.micro (또는 적절한 사이즈)
- Storage: 20GB (Auto Scaling 활성화)
- VPC: 기본 VPC (또는 커스텀 VPC)
- Public access: Yes (배포 서버에서 접근하려면)
- VPC security group: PostgreSQL 포트(5432) 허용

#### 2. 보안 그룹 설정
```
Inbound Rules:
- Type: PostgreSQL
- Protocol: TCP
- Port: 5432
- Source: 배포 서버 IP 또는 VPC CIDR
```

#### 3. DATABASE_URL 설정
```env
DATABASE_URL="postgresql://mecipe_admin:YOUR_PASSWORD@mecipe-db.xxxxx.ap-northeast-2.rds.amazonaws.com:5432/mecipe_db?schema=public&sslmode=require"
```

### Azure Database for PostgreSQL

#### 1. Azure 데이터베이스 생성
```bash
# Azure CLI로 생성
az postgres flexible-server create \
  --name mecipe-db \
  --resource-group myResourceGroup \
  --location koreacentral \
  --admin-user mecipe_admin \
  --admin-password YOUR_PASSWORD \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 15
```

#### 2. 방화벽 규칙 추가
```bash
# 배포 서버 IP 허용
az postgres flexible-server firewall-rule create \
  --resource-group myResourceGroup \
  --name mecipe-db \
  --rule-name AllowDeployServer \
  --start-ip-address YOUR_SERVER_IP \
  --end-ip-address YOUR_SERVER_IP
```

#### 3. DATABASE_URL 설정
```env
DATABASE_URL="postgresql://mecipe_admin@mecipe-db:YOUR_PASSWORD@mecipe-db.postgres.database.azure.com:5432/postgres?schema=public&sslmode=require"
```

### Google Cloud SQL

#### 1. Cloud SQL 인스턴스 생성
```bash
# gcloud CLI로 생성
gcloud sql instances create mecipe-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-northeast3
```

#### 2. 사용자 생성
```bash
gcloud sql users create mecipe_admin \
  --instance=mecipe-db \
  --password=YOUR_PASSWORD
```

#### 3. 데이터베이스 생성
```bash
gcloud sql databases create mecipe_db \
  --instance=mecipe-db
```

#### 4. DATABASE_URL 설정
```env
# Public IP 사용
DATABASE_URL="postgresql://mecipe_admin:YOUR_PASSWORD@34.xxx.xxx.xxx:5432/mecipe_db?schema=public"

# Cloud SQL Proxy 사용 (권장)
DATABASE_URL="postgresql://mecipe_admin:YOUR_PASSWORD@localhost:5432/mecipe_db?schema=public"
```

## 로컬 Docker PostgreSQL 사용

외부 서버 대신 로컬에서 PostgreSQL을 Docker로 실행하고 싶다면:

### 방법 1: docker-compose.with-db.yml 사용

```bash
# 두 파일을 함께 사용
docker compose -f docker-compose.yml -f docker-compose.with-db.yml up -d

# 환경 변수 설정 (.env)
POSTGRES_DB=mecipe_db
POSTGRES_USER=mecipe_user
POSTGRES_PASSWORD=your_password
DATABASE_URL="postgresql://mecipe_user:your_password@db:5432/mecipe_db?schema=public"
```

### 방법 2: docker-compose.yml 수정

`docker-compose.yml`에 다음 내용을 추가:

```yaml
services:
  app:
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    container_name: mecipe-db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres-data:
```

## 연결 테스트

### 1. 데이터베이스 연결 확인

```bash
# psql로 직접 연결
psql "postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

# Docker 컨테이너에서 연결
docker compose exec app npx prisma db pull

# 또는
docker compose exec app node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$queryRaw\`SELECT version();\`.then(console.log).catch(console.error).finally(() => prisma.\$disconnect());
"
```

### 2. Prisma 마이그레이션

```bash
# 마이그레이션 상태 확인
docker compose exec app npx prisma migrate status

# 마이그레이션 실행
docker compose exec app npx prisma migrate deploy

# 개발 환경에서 새 마이그레이션 생성
docker compose exec app npx prisma migrate dev --name init
```

## 네트워크 설정

### Docker 컨테이너에서 호스트 머신의 데이터베이스 접근

#### Linux/Mac
```env
# host.docker.internal 사용
DATABASE_URL="postgresql://user:pass@host.docker.internal:5432/db?schema=public"
```

#### Linux (host.docker.internal이 없는 경우)
```env
# 호스트 IP 사용
DATABASE_URL="postgresql://user:pass@172.17.0.1:5432/db?schema=public"
```

#### docker-compose.yml에 extra_hosts 추가
```yaml
services:
  app:
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

### 방화벽 설정

PostgreSQL 서버에서 외부 연결 허용:

#### postgresql.conf
```conf
listen_addresses = '*'
```

#### pg_hba.conf
```conf
# TYPE  DATABASE        USER            ADDRESS                 METHOD
host    all             all             0.0.0.0/0               md5
host    all             all             ::/0                    md5
```

#### 방화벽 포트 오픈
```bash
# Ubuntu/Debian
sudo ufw allow 5432/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=5432/tcp
sudo firewall-cmd --reload
```

## 보안 권장사항

### 1. SSL/TLS 사용
```env
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
```

### 2. 강력한 비밀번호
```bash
# 32자 랜덤 비밀번호 생성
openssl rand -base64 32
```

### 3. IP 화이트리스트
- 데이터베이스는 필요한 IP에서만 접근 가능하도록 설정

### 4. 최소 권한 원칙
```sql
-- 애플리케이션용 제한된 권한 사용자 생성
CREATE USER mecipe_app WITH PASSWORD 'strong_password';
GRANT CONNECT ON DATABASE mecipe_db TO mecipe_app;
GRANT USAGE ON SCHEMA public TO mecipe_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mecipe_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO mecipe_app;
```

### 5. 연결 풀 제한
```env
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10"
```

## 백업

외부 데이터베이스를 사용할 때 백업 방법:

### 원격 백업
```bash
# pg_dump로 원격 백업
pg_dump "postgresql://USER:PASSWORD@HOST:PORT/DATABASE" > backup.sql

# 압축 백업
pg_dump "postgresql://USER:PASSWORD@HOST:PORT/DATABASE" | gzip > backup.sql.gz
```

### 관리형 데이터베이스 자동 백업

#### AWS RDS
- Automated backups (retention: 7-35일)
- Manual snapshots

#### Azure Database
- Automatic backups (retention: 7-35일)
- On-demand backups

#### Google Cloud SQL
- Automated backups (retention: 1-365일)
- On-demand backups

## 트러블슈팅

### 연결 실패

```bash
# 1. 네트워크 연결 확인
ping your-db-host

# 2. 포트 연결 확인
telnet your-db-host 5432
# 또는
nc -zv your-db-host 5432

# 3. psql로 직접 테스트
psql "postgresql://user:pass@host:5432/db"

# 4. Docker 컨테이너에서 테스트
docker compose exec app sh
apk add postgresql-client
psql "postgresql://user:pass@host:5432/db"
```

### SSL 오류

```bash
# SSL 모드 변경
sslmode=disable    # SSL 사용 안 함 (개발만)
sslmode=prefer     # 가능하면 SSL 사용
sslmode=require    # SSL 필수 (권장)
sslmode=verify-ca  # CA 검증
sslmode=verify-full # 전체 검증
```

### 타임아웃 오류

```env
# 타임아웃 증가
DATABASE_URL="postgresql://user:pass@host:5432/db?connect_timeout=30&statement_timeout=60000"
```

## 모니터링

### Connection Pool 상태
```sql
SELECT * FROM pg_stat_activity WHERE datname = 'mecipe_db';
```

### 느린 쿼리
```sql
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

## 참고 자료

- [Prisma Connection URLs](https://www.prisma.io/docs/reference/database-reference/connection-urls)
- [PostgreSQL Connection Parameters](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-PARAMKEYWORDS)
- [AWS RDS PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [Azure Database for PostgreSQL](https://docs.microsoft.com/azure/postgresql/)
- [Google Cloud SQL for PostgreSQL](https://cloud.google.com/sql/docs/postgres)

