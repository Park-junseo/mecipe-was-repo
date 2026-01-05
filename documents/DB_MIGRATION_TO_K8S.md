# 레거시 DB에서 Kubernetes DB로 데이터 마이그레이션 가이드

이 문서는 로컬이나 도커에 설치된 PostgreSQL 데이터베이스를 쿠버네티스에 배포된 PostgreSQL로 데이터를 복제하는 방법을 설명합니다.

## 개요

레거시 아키텍처에서 쿠버네티스로 마이그레이션하는 과정에서 기존 데이터베이스의 데이터를 새로운 환경으로 옮겨야 합니다. 이 가이드는 다음과 같은 시나리오를 지원합니다:

- 로컬에 설치된 PostgreSQL → Kubernetes PostgreSQL
- Docker 컨테이너의 PostgreSQL → Kubernetes PostgreSQL
- 원격 PostgreSQL 서버 → Kubernetes PostgreSQL

## 중요한 선택: 스키마 유지 vs 스키마 대체

**두 가지 모드가 있습니다:**

1. **기본 모드 (--clean 사용)**: 타겟 DB의 스키마를 삭제하고 소스 DB의 스키마로 대체합니다.
   - Prisma 마이그레이션으로 생성한 스키마가 덮어씌워질 수 있습니다.
   - 소스 DB의 스키마와 데이터를 그대로 복사합니다.

2. **데이터만 모드 (--data-only)**: 타겟 DB의 스키마를 유지하고 데이터만 복사합니다.
   - Prisma 마이그레이션으로 생성한 스키마를 보존합니다.
   - 타겟 DB에 스키마가 이미 존재해야 합니다.

**권장**: Prisma를 사용하는 경우, 먼저 Prisma 마이그레이션을 실행한 후 `--data-only` 옵션으로 데이터만 복사하세요.

## 사전 요구사항

1. **도구 설치**
   - `kubectl`: Kubernetes 클러스터 접근
   - `pg_dump`, `pg_restore`, `psql`: PostgreSQL 클라이언트 도구
   - Bash shell (Linux, Mac, 또는 WSL/Git Bash on Windows)

2. **접근 권한**
   - Kubernetes 클러스터 접근 권한
   - 소스 데이터베이스 접근 권한
   - 타겟 데이터베이스 접근 권한 (비밀번호 필요)

3. **Kubernetes PostgreSQL 배포 확인**
   ```bash
   # 네임스페이스 확인
   kubectl get ns data-storage
   
   # PostgreSQL Pod 확인
   kubectl get pods -n data-storage
   
   # PostgreSQL Service 확인
   kubectl get svc -n data-storage
   ```

## 마이그레이션 방법

### 방법 1: 자동화 스크립트 사용 (권장)

프로젝트에 포함된 `migrate-db-to-k8s.sh` 스크립트를 사용하면 자동으로 데이터를 복제할 수 있습니다.

#### 1-1. 로컬 PostgreSQL에서 복제 (스키마 + 데이터)

```bash
./scripts/dev/migrate-db-to-k8s.sh \
  --source local \
  --source-host localhost \
  --source-port 5432 \
  --source-db mydb \
  --source-user postgres \
  --source-password mypassword \
  --target-ns data-storage \
  --target-service postgres \
  --target-db mydb \
  --target-user postgres \
  --target-password k8s_password
```

#### 1-1-1. 데이터만 복제 (스키마 유지, 권장)

타겟 DB에 이미 Prisma 마이그레이션으로 스키마가 있는 경우, 데이터만 복사:

```bash
./scripts/dev/migrate-db-to-k8s.sh \
  --source local \
  --source-db mydb \
  --source-user postgres \
  --source-password mypassword \
  --target-ns data-storage \
  --target-service postgres \
  --target-db mydb \
  --target-password k8s_password \
  --data-only
```

**주의**: `--data-only` 옵션은 타겟 DB에 스키마가 이미 존재해야 합니다. Prisma 마이그레이션을 먼저 실행하세요.

#### 1-2. Docker 컨테이너에서 복제

```bash
# Docker 컨테이너 확인
docker ps | grep postgres

# 마이그레이션 실행
./scripts/dev/migrate-db-to-k8s.sh \
  --source docker \
  --source-container my-db-container \
  --source-db mydb \
  --source-user postgres \
  --source-password mypassword \
  --target-ns data-storage \
  --target-service postgres \
  --target-db mydb \
  --target-password k8s_password
```

#### 1-3. URL로 직접 연결

```bash
./scripts/dev/migrate-db-to-k8s.sh \
  --source url \
  --source-url "postgresql://user:password@host:5432/database" \
  --target-ns data-storage \
  --target-service postgres \
  --target-db mydb \
  --target-password k8s_password
```

#### 1-4. 환경 변수 사용

비밀번호를 환경 변수로 제공할 수도 있습니다:

```bash
SOURCE_DB_PASSWORD="source_password" \
TARGET_DB_PASSWORD="k8s_password" \
./scripts/dev/migrate-db-to-k8s.sh \
  --source local \
  --source-db mydb \
  --target-ns data-storage \
  --target-db mydb
```

### 방법 2: 수동 마이그레이션

스크립트를 사용하지 않고 수동으로 마이그레이션하는 방법입니다.

#### 2-1. 소스 DB 덤프 생성

```bash
# 로컬 PostgreSQL에서 덤프
pg_dump -h localhost -p 5432 -U postgres -d mydb \
  --format=custom \
  --no-owner \
  --no-privileges \
  -f db_dump.dump

# Docker 컨테이너에서 덤프
docker exec my-db-container pg_dump -U postgres -d mydb \
  --format=custom \
  --no-owner \
  --no-privileges > db_dump.dump
```

#### 2-2. Kubernetes 포트 포워딩 설정

```bash
# 백그라운드에서 포트 포워딩 시작
kubectl port-forward -n data-storage svc/postgres 5433:5432 &

# 포트 포워딩 PID 저장 (나중에 종료하기 위해)
PORT_FORWARD_PID=$!
```

#### 2-3. 타겟 DB에 복원

**스키마 + 데이터 복원 (기존 스키마 삭제)**:
```bash
# 포트 포워딩을 통해 복원
pg_restore -h localhost -p 5433 -U postgres -d mydb \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  db_dump.dump
```

**데이터만 복원 (스키마 유지)**:
```bash
# --data-only 옵션 사용 (--clean 없음)
pg_restore -h localhost -p 5433 -U postgres -d mydb \
  --data-only \
  --no-owner \
  --no-privileges \
  db_dump_data_only.dump
```

**SQL 형식 덤프인 경우**:
```bash
psql -h localhost -p 5433 -U postgres -d mydb < db_dump.sql
```

#### 2-4. 포트 포워딩 종료

```bash
# 포트 포워딩 프로세스 종료
kill $PORT_FORWARD_PID
```

## Kubernetes PostgreSQL 비밀번호 확인

Kubernetes Secret에서 비밀번호를 확인할 수 있습니다:

```bash
# Secret 확인
kubectl get secrets -n data-storage

# 비밀번호 확인 (Secret 이름: postgres-secrets)
kubectl get secret postgres-secrets -n data-storage -o jsonpath='{.data.postgres-password}' | base64 -d
echo
```

## 마이그레이션 전 확인 사항

### 1. 소스 DB 확인

```bash
# 연결 테스트
psql -h localhost -p 5432 -U postgres -d mydb -c "SELECT version();"

# 테이블 목록 확인
psql -h localhost -p 5432 -U postgres -d mydb -c "\dt"

# 데이터 크기 확인
psql -h localhost -p 5432 -U postgres -d mydb -c "
SELECT 
    pg_size_pretty(pg_database_size('mydb')) AS database_size;
"
```

### 2. 타겟 DB 확인

```bash
# Kubernetes 포트 포워딩 설정
kubectl port-forward -n data-storage svc/postgres 5433:5432 &

# 연결 테스트
psql -h localhost -p 5433 -U postgres -d mydb -c "SELECT version();"

# 기존 데이터 확인
psql -h localhost -p 5433 -U postgres -d mydb -c "\dt"
```

## 주의사항

### 1. 스키마 변경 여부

**기본 동작 (--clean 사용)**:
- 타겟 DB의 기존 스키마가 **삭제**되고 소스 DB의 스키마로 **대체**됩니다.
- Prisma 마이그레이션으로 생성한 스키마가 덮어씌워질 수 있습니다.

**--data-only 옵션 사용 시**:
- 타겟 DB의 스키마가 **유지**되고 데이터만 복사됩니다.
- Prisma 마이그레이션으로 생성한 스키마를 보존하고 싶다면 이 옵션을 사용하세요.
- 단, 타겟 DB에 스키마가 이미 존재해야 합니다.

### 2. 기존 데이터 덮어쓰기

기본 동작에서는 `--clean` 옵션으로 인해 기존 데이터가 덮어씌워질 수 있습니다. 중요한 데이터가 있다면 먼저 백업하세요.

### 2. 스키마 불일치

소스와 타겟 DB의 PostgreSQL 버전이 다른 경우 문제가 발생할 수 있습니다. 가능하면 동일한 버전을 사용하세요.

### 3. 대용량 데이터베이스

대용량 데이터베이스의 경우 마이그레이션 시간이 오래 걸릴 수 있습니다. 네트워크 연결이 안정적인 환경에서 실행하세요.

### 4. 트랜잭션 및 락

마이그레이션 중에는 소스 DB에 읽기 락이 걸릴 수 있습니다. 프로덕션 환경에서는 운영 시간을 고려하여 실행하세요.

## 문제 해결

### 1. 연결 실패

```bash
# Kubernetes Pod 상태 확인
kubectl get pods -n data-storage

# Pod 로그 확인
kubectl logs -n data-storage postgres-0

# Service 확인
kubectl describe svc postgres -n data-storage
```

### 2. 권한 오류

```bash
# PostgreSQL 사용자 권한 확인
psql -h localhost -p 5432 -U postgres -d mydb -c "\du"

# 필요한 권한 부여
psql -h localhost -p 5432 -U postgres -d mydb -c "
GRANT ALL PRIVILEGES ON DATABASE mydb TO myuser;
"
```

### 3. 포트 충돌

포트 포워딩에 사용할 포트(기본값: 5433)가 이미 사용 중인 경우:

```bash
# 다른 포트 사용
kubectl port-forward -n data-storage svc/postgres 5434:5432

# 또는 스크립트에서 포트 지정
./scripts/dev/migrate-db-to-k8s.sh \
  --port-forward-port 5434 \
  ...
```

### 4. 디스크 공간 부족

```bash
# 덤프 파일 크기 확인
du -h db_dump.dump

# 타겟 DB PVC 크기 확인
kubectl get pvc -n data-storage

# 필요시 PVC 크기 확장 (Kubernetes 1.11+)
kubectl patch pvc postgres-postgres-data-0 -n data-storage \
  -p '{"spec":{"resources":{"requests":{"storage":"50Gi"}}}}'
```

## 마이그레이션 후 확인

### 1. 데이터 무결성 확인

```bash
# 테이블 개수 비교
psql -h localhost -p 5432 -U postgres -d mydb -c "
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';
"

# 레코드 수 확인 (예시)
psql -h localhost -p 5433 -U postgres -d mydb -c "
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
"
```

### 2. 애플리케이션 연결 테스트

```bash
# Kubernetes에서 애플리케이션 Pod 확인
kubectl get pods -n app

# 애플리케이션 로그 확인
kubectl logs -n app <pod-name>

# 데이터베이스 연결 테스트
kubectl exec -n app <pod-name> -- npx prisma db pull
```

## 추가 자료

- [PostgreSQL 공식 문서](https://www.postgresql.org/docs/)
- [pg_dump 문서](https://www.postgresql.org/docs/current/app-pgdump.html)
- [pg_restore 문서](https://www.postgresql.org/docs/current/app-pgrestore.html)
- [kubectl port-forward 문서](https://kubernetes.io/docs/tasks/access-application-cluster/port-forward-access-application-cluster/)

## 관련 스크립트

- `scripts/dev/migrate-db-to-k8s.sh`: 자동화 마이그레이션 스크립트
- `scripts/backup-db.sh`: 데이터베이스 백업 스크립트
- `scripts/dev/local-deploy-test.sh`: 로컬 Kubernetes 배포 테스트

