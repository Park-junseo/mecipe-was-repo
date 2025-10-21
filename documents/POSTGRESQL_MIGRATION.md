# PostgreSQL 마이그레이션 가이드

이 문서는 기존 MySQL 데이터베이스에서 PostgreSQL로 마이그레이션하는 방법을 설명합니다.

## 개요

이 프로젝트는 PostgreSQL 15를 사용하도록 설정되어 있습니다. Prisma ORM을 사용하므로 데이터베이스 전환이 비교적 간단합니다.

## PostgreSQL vs MySQL 주요 차이점

| 항목 | MySQL | PostgreSQL |
|------|-------|------------|
| 포트 | 3306 | 5432 |
| URL 스키마 | mysql:// | postgresql:// |
| 환경 변수 | MYSQL_* | POSTGRES_* |
| 덤프 명령어 | mysqldump | pg_dump |
| 복원 명령어 | mysql | psql |
| 기본 인코딩 | utf8mb4 | UTF8 |

## 마이그레이션 단계

### 1. 기존 데이터 백업 (MySQL 사용 중인 경우)

```bash
# MySQL 데이터 백업
docker compose exec db mysqldump \
  -u${MYSQL_USER} \
  -p${MYSQL_PASSWORD} \
  ${MYSQL_DATABASE} > backup_mysql.sql
```

### 2. Prisma Schema 확인

`prisma/schema.prisma` 파일에서 provider를 확인하세요:

```prisma
datasource db {
  provider = "postgresql"  // MySQL에서 PostgreSQL로 변경
  url      = env("DATABASE_URL")
}
```

### 3. DATABASE_URL 변경

`.env` 파일에서 DATABASE_URL을 PostgreSQL 형식으로 변경:

```env
# 이전 (MySQL)
# DATABASE_URL="mysql://mecipe_user:password@db:3306/mecipe_db"

# 새로운 (PostgreSQL)
DATABASE_URL="postgresql://mecipe_user:password@db:5432/mecipe_db?schema=public"
```

### 4. 환경 변수 업데이트

```env
# MySQL 환경 변수 제거
# MYSQL_ROOT_PASSWORD=...
# MYSQL_DATABASE=...
# MYSQL_USER=...
# MYSQL_PASSWORD=...

# PostgreSQL 환경 변수 추가
POSTGRES_DB=mecipe_db
POSTGRES_USER=mecipe_user
POSTGRES_PASSWORD=your_password_here
```

### 5. Docker Compose 재시작

```bash
# 기존 컨테이너 중지 및 제거
docker compose down -v

# 새로운 PostgreSQL 컨테이너 시작
docker compose up -d db

# 데이터베이스 준비 대기
sleep 10
```

### 6. Prisma 마이그레이션 실행

```bash
# Prisma Client 재생성
docker compose exec app npx prisma generate

# 마이그레이션 실행
docker compose exec app npx prisma migrate deploy

# 또는 개발 환경에서
docker compose exec app npx prisma migrate dev
```

### 7. 데이터 마이그레이션 (선택사항)

MySQL에서 PostgreSQL로 데이터를 이전하려면:

#### 옵션 A: pgloader 사용 (권장)

```bash
# pgloader 설치 (Ubuntu)
sudo apt-get install pgloader

# MySQL에서 PostgreSQL로 데이터 마이그레이션
pgloader mysql://user:pass@localhost:3306/mecipe_db \
         postgresql://user:pass@localhost:5432/mecipe_db
```

#### 옵션 B: 수동 마이그레이션

1. MySQL 데이터를 CSV로 내보내기
2. PostgreSQL에서 COPY 명령으로 가져오기
3. 시퀀스 재설정

```sql
-- PostgreSQL에서 시퀀스 재설정
SELECT setval('user_id_seq', (SELECT MAX(id) FROM "User"));
SELECT setval('board_id_seq', (SELECT MAX(id) FROM "Board"));
-- 기타 테이블에 대해서도 반복
```

## PostgreSQL 특화 기능

### 1. JSON/JSONB 타입

PostgreSQL은 네이티브 JSON 지원이 뛰어납니다:

```prisma
model MetaViewerMap {
  id          Int      @id @default(autoincrement())
  worldData   Json?    // JSON 데이터 저장
  metadata    Json?
}
```

### 2. 배열 타입

```prisma
model Product {
  id           Int      @id @default(autoincrement())
  tags         String[]  // 배열 타입
  redirectUrls String[]
}
```

### 3. Full-Text Search

```sql
-- Full-text search 인덱스 생성
CREATE INDEX idx_board_title_search ON "Board" USING GIN (to_tsvector('english', title));

-- 검색 쿼리
SELECT * FROM "Board" WHERE to_tsvector('english', title) @@ to_tsquery('english', 'cafe');
```

### 4. UUID 타입

```prisma
model User {
  id   String @id @default(uuid()) @db.Uuid
  // ...
}
```

## Prisma 설정 최적화

### Connection Pool

```env
DATABASE_URL="postgresql://user:pass@db:5432/mydb?schema=public&connection_limit=10&pool_timeout=30"
```

### 연결 옵션

```env
# SSL 연결 (프로덕션 권장)
DATABASE_URL="postgresql://user:pass@db:5432/mydb?sslmode=require"

# 타임아웃 설정
DATABASE_URL="postgresql://user:pass@db:5432/mydb?connect_timeout=10"
```

## 성능 최적화

### 1. 인덱스 추가

```prisma
model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  name  String
  
  @@index([email])
  @@index([name])
}
```

### 2. EXPLAIN ANALYZE 사용

```sql
EXPLAIN ANALYZE SELECT * FROM "User" WHERE email = 'test@example.com';
```

### 3. Connection Pooling

PgBouncer를 사용하여 연결 풀링 최적화 (선택사항):

```yaml
# docker-compose.yml에 추가
pgbouncer:
  image: pgbouncer/pgbouncer
  environment:
    - DATABASES_HOST=db
    - DATABASES_PORT=5432
    - DATABASES_USER=${POSTGRES_USER}
    - DATABASES_PASSWORD=${POSTGRES_PASSWORD}
    - DATABASES_DBNAME=${POSTGRES_DB}
    - PGBOUNCER_POOL_MODE=transaction
    - PGBOUNCER_MAX_CLIENT_CONN=1000
  ports:
    - "6432:5432"
```

## 백업 및 복원

### 백업

```bash
# 전체 백업
./scripts/backup-db.sh

# 또는 수동으로
docker compose exec -T db pg_dump -U $POSTGRES_USER -d $POSTGRES_DB > backup.sql

# 압축 백업
docker compose exec -T db pg_dump -U $POSTGRES_USER -d $POSTGRES_DB | gzip > backup.sql.gz
```

### 복원

```bash
# 압축 해제 후 복원
gunzip backup.sql.gz
docker compose exec -T db psql -U $POSTGRES_USER -d $POSTGRES_DB < backup.sql

# 또는 압축된 상태로 복원
gunzip -c backup.sql.gz | docker compose exec -T db psql -U $POSTGRES_USER -d $POSTGRES_DB
```

## 트러블슈팅

### 연결 오류

```bash
# PostgreSQL 상태 확인
docker compose exec db pg_isready -U $POSTGRES_USER

# 로그 확인
docker compose logs db

# 연결 테스트
docker compose exec db psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT version();"
```

### 권한 문제

```sql
-- 사용자에게 권한 부여
GRANT ALL PRIVILEGES ON DATABASE mecipe_db TO mecipe_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mecipe_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mecipe_user;
```

### 마이그레이션 충돌

```bash
# 마이그레이션 상태 확인
docker compose exec app npx prisma migrate status

# 마이그레이션 리셋 (주의: 데이터 손실)
docker compose exec app npx prisma migrate reset

# 특정 마이그레이션으로 롤백
docker compose exec app npx prisma migrate resolve --rolled-back "migration_name"
```

## PostgreSQL 모니터링

### 활성 연결 확인

```sql
SELECT * FROM pg_stat_activity WHERE datname = 'mecipe_db';
```

### 테이블 크기 확인

```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 느린 쿼리 확인

```sql
-- postgresql.conf에서 설정
-- log_min_duration_statement = 1000  # 1초 이상 걸리는 쿼리 로깅

-- 또는 pg_stat_statements 확장 사용
CREATE EXTENSION pg_stat_statements;
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;
```

## 참고 자료

- [PostgreSQL 공식 문서](https://www.postgresql.org/docs/)
- [Prisma PostgreSQL 가이드](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [pgloader 문서](https://pgloader.readthedocs.io/)
- [PostgreSQL vs MySQL](https://www.postgresql.org/about/featurematrix/)

## 추가 권장사항

1. **정기 VACUUM**: PostgreSQL은 VACUUM을 통해 디스크 공간을 회수합니다.
   ```sql
   VACUUM ANALYZE;
   ```

2. **pg_stat_statements 활성화**: 쿼리 성능 모니터링을 위해

3. **적절한 인덱스 전략**: EXPLAIN을 사용하여 쿼리 계획 분석

4. **Connection Pooling**: 많은 동시 연결이 필요한 경우 PgBouncer 사용

5. **정기 백업**: 자동화된 백업 스크립트 실행

