# GitHub Actions 워크플로우 구조

## 개선 사항 요약

피드백을 반영하여 워크플로우를 **책임 분리** 및 **실무 관점**에서 개선했습니다.

---

## 워크플로우 구조

### 1. `cluster-bootstrap.yml` (1회 작업)

**목적**: 클러스터 최초 설정

**실행 시점**: 
- 수동 실행 (`workflow_dispatch`)
- 또는 클러스터 최초 1회

**책임**:
- ✅ Node Label 설정 (`node-role=app`, `node-role=data`)
- ✅ Namespace 생성 (`app`, `data`)

**주의사항**:
- ⚠️ Node Label은 실제로는 **IaC(Terraform, kubeadm)**로 관리하는 것이 권장됨
- ⚠️ 이 워크플로우는 "편의를 위한" 옵션

---

### 2. `infra-deploy.yml` (인프라 변경 시)

**목적**: 인프라 컴포넌트 배포

**실행 시점**: `infra/helm/**` 변경 시

**책임**:
- Instance B: PostgreSQL, Elasticsearch, Debezium, Kibana
- Instance A: Kafka, Kafka UI, KSQLDB, Nginx, Cert-manager

**개선 사항**:
- ✅ Node Labeling 제거 (bootstrap으로 이동)
- ✅ PostgreSQL 외부 판별을 Helm values로 이동
- ✅ CI가 "똑똑할 필요 없음" - Helm이 처리

**PostgreSQL 제어**:
```bash
# 외부 PostgreSQL
POSTGRES_DEPLOY: "false"  # GitHub Secrets

# 내부 배포
POSTGRES_DEPLOY: "true"   # 또는 설정 안 함
```

---

### 3. `app-deploy.yml` (앱 변경 시)

**목적**: 애플리케이션 배포

**실행 시점**: `apps/**`, `mecipe-was/**`, `nginx/**` 변경 시

**책임**:
- 테스트
- Docker 이미지 빌드 및 푸시
- 앱 배포 (Mecipe WAS, Place Indexer Service)
- 데이터베이스 마이그레이션

**개선 사항**:
- ✅ 인프라 검증 제거 (앱 배포에 집중)
- ✅ 빠른 배포 (인프라 변경과 분리)

---

## 주요 개선 사항

### ✅ 1. 책임 분리

**이전**: 단일 워크플로우가 모든 것을 처리
- Node Labeling
- Namespace 생성
- 인프라 배포
- 앱 배포
- 환경 판단

**개선**: 워크플로우별 명확한 책임
- **Bootstrap**: 클러스터 설정 (1회)
- **Infra Deploy**: 인프라 변경 (드물게)
- **App Deploy**: 앱 변경 (자주)

### ✅ 2. Node Labeling 제거

**이전**: 매 배포마다 Node Label 설정
```yaml
- name: Label Nodes
  run: kubectl label node ...
```

**개선**: Bootstrap으로 이동 (1회 작업)
- 또는 IaC로 관리 권장

### ✅ 3. PostgreSQL 외부 판별을 Helm values로

**이전**: CI에서 복잡한 판별 로직
```bash
if [ "$POSTGRES_EXTERNAL" = "true" ]; then
  # 스킵
fi
```

**개선**: Helm values.yaml로 제어
```yaml
# infra/helm/postgres/values.yaml
enabled: false  # 외부
enabled: true   # 내부
```

**워크플로우**:
```bash
helm upgrade --install postgres \
  --set enabled=${POSTGRES_ENABLED_FLAG}
```

### ✅ 4. 배포 시간 단축

**이전**: 앱 변경 시에도 인프라 검증 수행

**개선**: 
- 앱 변경 → `app-deploy.yml`만 실행 (빠름)
- 인프라 변경 → `infra-deploy.yml`만 실행

---

## 사용 방법

### 초기 설정 (1회)

```bash
# GitHub Actions에서 수동 실행
# 또는 최초 1회 자동 실행
```

### 인프라 변경 시

```bash
# infra/helm/** 변경 시 자동 실행
# 또는 수동 실행
```

### 앱 변경 시

```bash
# apps/**, mecipe-was/**, nginx/** 변경 시 자동 실행
# 또는 수동 실행
```

---

## PostgreSQL 외부/내부 관리

### 방법 1: GitHub Secrets (현재 구현)

```yaml
# GitHub Secrets
POSTGRES_DEPLOY: "false"  # 외부
POSTGRES_DEPLOY: "true"   # 내부
```

### 방법 2: Helm values.yaml (권장)

```yaml
# infra/helm/postgres/values.yaml
enabled: false  # 외부 PostgreSQL
enabled: true   # 내부 배포
```

**배포 시:**
```bash
helm upgrade --install postgres \
  -f values-external.yaml  # 또는
  -f values-internal.yaml
```

---

## 기존 `deploy-helm.yml` 처리

기존 `deploy-helm.yml`은 **레거시**로 유지하거나 삭제할 수 있습니다.

**권장**: 새로운 워크플로우로 마이그레이션

1. `cluster-bootstrap.yml` 실행 (1회)
2. `infra-deploy.yml` 테스트
3. `app-deploy.yml` 테스트
4. 기존 `deploy-helm.yml` 사용 중단

---

## 실무 권장사항

### 1. Node Label은 IaC로 관리

**Terraform:**
```hcl
resource "kubernetes_label" "instance_a" {
  metadata {
    name = "instance-a"
  }
  labels = {
    "node-role" = "app"
  }
}
```

**kubeadm:**
```yaml
nodeRegistration:
  kubeletExtraArgs:
    node-labels: "node-role=app"
```

### 2. PostgreSQL 외부 여부는 values.yaml로

**환경별 values 파일:**
```
infra/helm/postgres/
├── values.yaml
├── values-external.yaml  # enabled: false
└── values-internal.yaml  # enabled: true
```

### 3. Debezium Connector는 별도 관리

**현재**: Debezium 배포 시 Connector 설정 포함

**권장**: Connector는 별도 Job 또는 API로 관리
```bash
# Debezium 배포
helm upgrade --install debezium ...

# Connector는 별도로
kubectl apply -f debezium-connector-config.yaml
```

---

## 마이그레이션 체크리스트

- [ ] `cluster-bootstrap.yml` 실행 (1회)
- [ ] Node Label 확인: `kubectl get nodes --show-labels`
- [ ] Namespace 확인: `kubectl get namespaces`
- [ ] `infra-deploy.yml` 테스트
- [ ] `app-deploy.yml` 테스트
- [ ] PostgreSQL 외부/내부 전환 테스트
- [ ] 기존 `deploy-helm.yml` 사용 중단 (선택)

