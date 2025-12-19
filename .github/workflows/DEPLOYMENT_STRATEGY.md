# 배포 전략 가이드

## 워크플로우 구조

### 1. Cluster Bootstrap (1회 작업)

**파일**: `.github/workflows/cluster-bootstrap.yml`

**실행 시점**: 클러스터 최초 설정 시 1회만 실행

**책임**:
- Node Label 설정 (`node-role=app`, `node-role=data`)
- Namespace 생성 (`app`, `data`)

**실행 방법**:
```bash
# GitHub Actions에서 수동 실행 (workflow_dispatch)
# 또는 최초 1회 자동 실행
```

**주의사항**:
- ⚠️ Node Label은 클러스터 인프라 설정이므로, IaC(Terraform, kubeadm 등)로 관리하는 것이 더 적절
- ⚠️ 이 워크플로우는 "편의를 위한" 옵션일 뿐, 실제 운영에서는 IaC로 처리 권장

---

### 2. Infrastructure Deploy

**파일**: `.github/workflows/infra-deploy.yml`

**실행 시점**: `infra/helm/**` 변경 시

**책임**:
- Instance B 인프라: PostgreSQL, Elasticsearch, Debezium, Kibana
- Instance A 인프라: Kafka, Kafka UI, KSQLDB, Nginx, Cert-manager

**특징**:
- ✅ PostgreSQL은 `enabled` 플래그로 제어 (외부/내부)
- ✅ Helm values.yaml로 환경 설정 관리
- ✅ 배포 후 Pod placement 검증

**PostgreSQL 외부/내부 제어**:

**외부 PostgreSQL 사용:**
```yaml
# GitHub Secrets
POSTGRES_DEPLOY: "false"
POSTGRES_HOST: "your-external-db.example.com"
POSTGRES_PORT: "5432"
```

**내부 PostgreSQL 배포:**
```yaml
# GitHub Secrets
POSTGRES_DEPLOY: "true"  # 또는 설정 안 함 (기본값)
```

---

### 3. Application Deploy

**파일**: `.github/workflows/app-deploy.yml`

**실행 시점**: `apps/**`, `mecipe-was/**`, `nginx/**` 변경 시

**책임**:
- 테스트
- Docker 이미지 빌드 및 푸시
- 앱 배포 (Mecipe WAS, Place Indexer Service)
- 데이터베이스 마이그레이션

**특징**:
- ✅ 앱 변경 시에만 실행 (빠른 배포)
- ✅ 인프라 변경과 분리

---

## 배포 흐름

### 초기 설정 (1회)

```
1. Cluster Bootstrap 실행
   → Node Label 설정
   → Namespace 생성
```

### 인프라 변경 시

```
1. infra-deploy.yml 실행
   → Instance B 인프라 배포
   → Instance A 인프라 배포
   → Pod placement 검증
```

### 앱 변경 시

```
1. app-deploy.yml 실행
   → 테스트
   → Docker 빌드
   → 앱 배포
   → 마이그레이션
```

---

## PostgreSQL 외부/내부 관리

### Helm values.yaml로 제어 (권장)

**`infra/helm/postgres/values.yaml`:**
```yaml
# 외부 PostgreSQL 사용 시
enabled: false

# 내부 배포 시
enabled: true
```

**GitHub Actions:**
```bash
helm upgrade --install postgres ./infra/helm/postgres \
  --set enabled=false  # 외부 사용
  # 또는
  --set enabled=true   # 내부 배포
```

### 시크릿으로 제어 (현재 구현)

**GitHub Secrets:**
```yaml
POSTGRES_DEPLOY: "false"  # 외부
POSTGRES_DEPLOY: "true"   # 내부
```

**워크플로우에서:**
```bash
if [ "$POSTGRES_DEPLOY" = "false" ]; then
  --set enabled=false
fi
```

---

## 장점

### 1. 책임 분리
- **Bootstrap**: 클러스터 설정 (1회)
- **Infra Deploy**: 인프라 변경 (드물게)
- **App Deploy**: 앱 변경 (자주)

### 2. 배포 시간 단축
- 앱 변경 시 인프라 검증 스킵
- 인프라 변경 시 앱 테스트 스킵

### 3. 안전성
- 각 워크플로우가 명확한 책임
- 실수로 인한 전체 클러스터 변경 방지

### 4. 유연성
- PostgreSQL 외부/내부 전환 용이
- Helm values로 환경별 설정 관리

---

## 실무 권장사항

### 1. Node Label은 IaC로 관리

**Terraform 예시:**
```hcl
resource "kubernetes_label" "instance_a" {
  api_version = "v1"
  kind        = "Node"
  metadata {
    name = "instance-a"
  }
  labels = {
    "node-role" = "app"
  }
}
```

**또는 kubeadm:**
```yaml
# kubeadm-config.yaml
nodeRegistration:
  kubeletExtraArgs:
    node-labels: "node-role=app"
```

### 2. PostgreSQL 외부 여부는 values.yaml로

**환경별 values 파일:**
```
infra/helm/postgres/
├── values.yaml          # 기본값 (enabled: true)
├── values-external.yaml # 외부 DB (enabled: false)
└── values-internal.yaml # 내부 배포 (enabled: true)
```

**배포 시:**
```bash
# 외부 PostgreSQL
helm upgrade --install postgres ./infra/helm/postgres \
  -f values-external.yaml

# 내부 PostgreSQL
helm upgrade --install postgres ./infra/helm/postgres \
  -f values-internal.yaml
```

### 3. Debezium Connector는 별도 관리

**현재**: Debezium 배포 시 Connector 설정 포함

**권장**: Connector는 별도 Job 또는 API로 관리
```bash
# Debezium 배포
helm upgrade --install debezium ./infra/helm/debezium

# Connector는 별도로 설정
kubectl apply -f debezium-connector-config.yaml
```

---

## 마이그레이션 체크리스트

- [ ] Cluster Bootstrap 실행 (1회)
- [ ] Node Label 확인
- [ ] Namespace 확인
- [ ] 기존 `deploy-helm.yml` 사용 중단 (선택)
- [ ] `infra-deploy.yml` 테스트
- [ ] `app-deploy.yml` 테스트
- [ ] PostgreSQL 외부/내부 전환 테스트

