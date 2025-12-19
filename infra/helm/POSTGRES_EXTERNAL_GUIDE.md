# PostgreSQL 외부 관리 가이드

## 개요

PostgreSQL을 외부 상태 자산으로 관리하고, 앱 배포 파이프라인에서 선택적으로 분리하는 방법입니다.

## 구조

### 1. PostgreSQL 배포 모드

**Kubernetes 내부 배포** (기본값)
- PostgreSQL이 Kubernetes 클러스터 내에 StatefulSet으로 배포됨
- `postgres` 서비스 이름으로 접근

**외부 PostgreSQL** (선택)
- 외부 인스턴스의 PostgreSQL 사용 (RDS, Cloud SQL, 직접 설치 등)
- Helm은 연결 정보만 관리 (Secret/ConfigMap)

### 2. Helm Chart 구조

```
infra/helm/
├── postgres/              # PostgreSQL StatefulSet (내부 배포용)
└── postgres-connection/   # 연결 정보만 관리 (외부/내부 공통)
    ├── Chart.yaml
    ├── values.yaml
    └── templates/
        ├── secret.yaml      # DATABASE_URL, 연결 정보
        ├── configmap.yaml   # 호스트, 포트 정보
        └── service.yaml     # ExternalName Service (선택)
```

## 설정 방법

### 방법 1: 시크릿으로 외부 여부 명시 (권장)

**GitHub Secrets 설정:**

```yaml
# 외부 PostgreSQL 사용 시
POSTGRES_EXTERNAL: "true"
POSTGRES_HOST: "your-external-db.example.com"  # 또는 IP
POSTGRES_PORT: "5432"
POSTGRES_USER: "postgres"
POSTGRES_PASSWORD: "your-password"
POSTGRES_DB: "mydb"
DATABASE_URL: "postgresql://postgres:password@your-external-db.example.com:5432/mydb?schema=public"

# 또는 내부 배포 시
POSTGRES_EXTERNAL: "false"  # 또는 설정 안 함
POSTGRES_DEPLOY: "true"     # 또는 설정 안 함
```

### 방법 2: POSTGRES_HOST로 자동 판단

**GitHub Secrets 설정:**

```yaml
# 외부 PostgreSQL (Kubernetes 서비스 이름이 아님)
POSTGRES_HOST: "192.168.1.100"  # IP 주소
# 또는
POSTGRES_HOST: "rds-instance.region.rds.amazonaws.com"  # FQDN

# 내부 PostgreSQL (Kubernetes 서비스 이름)
POSTGRES_HOST: "postgres"  # 또는 "postgres.data"
```

**판단 로직:**
- `POSTGRES_HOST`가 `postgres`, `postgres.data`, `postgres.*` 패턴이 아니면 → 외부로 판단
- 그 외 → 내부 배포

### 방법 3: POSTGRES_DEPLOY 플래그

**GitHub Secrets 설정:**

```yaml
# 외부 PostgreSQL 사용
POSTGRES_DEPLOY: "false"

# 내부 배포
POSTGRES_DEPLOY: "true"  # 또는 설정 안 함 (기본값)
```

## 워크플로우 동작

### 외부 PostgreSQL인 경우

1. ✅ **PostgreSQL 배포 스킵**
   ```bash
   # postgres Chart 배포 안 함
   ```

2. ✅ **연결 정보만 배포**
   ```bash
   helm upgrade --install postgres-connection ./infra/helm/postgres-connection \
     --set connection.host="external-host" \
     --set connection.url="postgresql://..."
   ```

3. ✅ **Secret 생성**
   - `postgres-connection-connection` Secret에 `DATABASE_URL` 저장
   - 앱에서 이 Secret 참조 가능

4. ✅ **Debezium 연결**
   - 외부 호스트로 직접 연결

### 내부 PostgreSQL인 경우

1. ✅ **PostgreSQL 배포**
   ```bash
   helm upgrade --install postgres ./infra/helm/postgres
   ```

2. ✅ **연결 정보도 배포**
   ```bash
   helm upgrade --install postgres-connection ./infra/helm/postgres-connection \
     --set connection.host="postgres" \
     --set service.enabled=true
   ```

3. ✅ **Kubernetes Service 생성**
   - `postgres` 서비스로 내부 접근

## 앱에서 연결 정보 사용

### Option 1: DATABASE_URL 직접 사용 (현재 방식)

```yaml
# mecipe-was deployment
env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: mecipe-was-secrets
        key: database-url
```

### Option 2: postgres-connection Secret 참조 (권장)

```yaml
# mecipe-was deployment
env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: postgres-connection-connection
        key: DATABASE_URL
```

## Debezium 연결

### 외부 PostgreSQL

```yaml
debezium:
  connector:
    database:
      hostname: "external-host.example.com"  # 외부 호스트
      port: "5432"
```

### 내부 PostgreSQL

```yaml
debezium:
  connector:
    database:
      hostname: "postgres.data.svc.cluster.local"  # Kubernetes 서비스
      port: "5432"
```

## 검증

### 외부 PostgreSQL 확인

```bash
# Secret 확인
kubectl get secret postgres-connection-connection -n data -o yaml

# ConfigMap 확인
kubectl get configmap postgres-connection-config -n data -o yaml

# PostgreSQL Pod 없음 확인
kubectl get pods -n data | grep postgres
# (결과 없음)
```

### 내부 PostgreSQL 확인

```bash
# PostgreSQL Pod 확인
kubectl get pods -n data | grep postgres
# postgres-0   1/1   Running

# Service 확인
kubectl get svc -n data | grep postgres
# postgres   ClusterIP   10.x.x.x   5432/TCP
```

## GitHub Secrets 체크리스트

### 필수 (외부/내부 공통)
- `POSTGRES_USER`: PostgreSQL 사용자명
- `POSTGRES_PASSWORD`: PostgreSQL 비밀번호
- `POSTGRES_DB`: 데이터베이스 이름
- `DATABASE_URL`: 전체 연결 URL

### 선택 (외부 PostgreSQL)
- `POSTGRES_EXTERNAL`: `"true"` (외부 사용 시)
- `POSTGRES_HOST`: 외부 호스트 IP 또는 FQDN
- `POSTGRES_PORT`: 포트 (기본: 5432)
- `POSTGRES_DEPLOY`: `"false"` (외부 사용 시)

### 선택 (내부 PostgreSQL)
- `POSTGRES_HOST`: `"postgres"` (기본값)
- `POSTGRES_DEPLOY`: `"true"` (기본값)

## 장점

1. **유연성**: 외부/내부 PostgreSQL 전환 용이
2. **분리**: 앱 배포와 DB 배포 분리
3. **일관성**: 연결 정보는 항상 Helm으로 관리
4. **안전성**: 외부 DB면 배포 스킵으로 실수 방지

