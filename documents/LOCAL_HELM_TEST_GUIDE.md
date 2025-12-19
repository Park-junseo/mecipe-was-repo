# 로컬 Helm 배포 테스트 가이드

로컬 환경에서 Helm 차트를 테스트하는 방법을 안내합니다.

## 사전 준비

### 1. 필수 도구 설치 확인

```bash
# Docker 설치 확인
docker --version

# Kubernetes 클러스터 확인 (k3s, minikube, kind 등)
kubectl cluster-info

# Helm 설치 확인
helm version

# pnpm 설치 확인
pnpm --version
```

### 2. 로컬 Kubernetes 클러스터 설정

#### k3s 사용 (권장)

```bash
# k3s 설치 (아직 설치하지 않은 경우)
curl -sfL https://get.k3s.io | sh -

# kubeconfig 설정
mkdir -p ~/.kube
sudo cat /etc/rancher/k3s/k3s.yaml > ~/.kube/config
chmod 600 ~/.kube/config

# 클러스터 연결 확인
kubectl get nodes
```

#### minikube 사용

```bash
# minikube 시작
minikube start

# Docker 이미지를 minikube에서 사용할 수 있도록 설정
eval $(minikube docker-env)
```

#### kind 사용

```bash
# kind 클러스터 생성
kind create cluster --name mecipe-test

# 클러스터 확인
kubectl cluster-info --context kind-mecipe-test
```

### 3. Helm 저장소 추가

```bash
# Helm 저장소 추가
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add confluentinc https://confluentinc.github.io/cp-helm-charts/
helm repo update
```

## 단계별 배포 테스트

### Step 1: Docker 이미지 빌드

프로젝트 루트에서 실행:

```bash
# place-indexer-service 이미지 빌드
docker build -f apps/place-indexer-service/Dockerfile \
  -t place-indexer-service:local .

# mecipe-was 이미지 빌드
docker build -f mecipe-was/Dockerfile \
  -t mecipe-was:local .

# 이미지 확인
docker images | grep -E "place-indexer-service|mecipe-was"
```

### Step 2: Kubernetes에 이미지 로드

#### k3s 사용 시

k3s는 기본적으로 Docker 이미지를 사용하므로 추가 작업 불필요합니다.

#### minikube 사용 시

```bash
# minikube Docker 환경 활성화
eval $(minikube docker-env)

# 이미지 재빌드 (minikube Docker에서)
docker build -f apps/place-indexer-service/Dockerfile \
  -t place-indexer-service:local .
docker build -f mecipe-was/Dockerfile \
  -t mecipe-was:local .
```

#### kind 사용 시

```bash
# kind에 이미지 로드
kind load docker-image place-indexer-service:local --name mecipe-test
kind load docker-image mecipe-was:local --name mecipe-test
```

### Step 3: Helm 차트 검증

```bash
# 차트 문법 검증
helm lint ./helm/mecipe-instance-a

# 템플릿 렌더링 확인 (실제 배포 전)
helm template mecipe-instance-a ./helm/mecipe-instance-a \
  --namespace instance-a \
  --set placeIndexerService.image.repository=place-indexer-service \
  --set placeIndexerService.image.tag=local \
  --set mecipeWAS.image.repository=mecipe-was \
  --set mecipeWAS.image.tag=local \
  --set nginx.enabled=false \
  --set kafka.enabled=false \
  --set ksqldb.enabled=false \
  --set kafkaUI.enabled=false
```

### Step 4: 로컬 테스트용 Values 파일 생성

```bash
# 로컬 테스트용 values 파일 생성
cat > helm/mecipe-instance-a/values-local.yaml <<EOF
global:
  dockerRegistry: ""
  imagePullSecrets: []

# Kafka 비활성화 (로컬 테스트 시 선택사항)
kafka:
  enabled: false

ksqldb:
  enabled: false

kafkaUI:
  enabled: false

# Place Indexer Service
placeIndexerService:
  enabled: true
  image:
    repository: place-indexer-service
    tag: "local"
    pullPolicy: Never  # 로컬 이미지 사용
  replicaCount: 1
  env:
    nodeEnv: development
    elasticsearchHosts: "http://localhost:9200"  # 외부 Elasticsearch 또는 비활성화
    elasticsearchUsername: ""
    elasticsearchPassword: ""
    kafkaBrokers: "localhost:9092"  # 외부 Kafka 또는 비활성화

# Mecipe WAS
mecipeWAS:
  enabled: true
  image:
    repository: mecipe-was
    tag: "local"
    pullPolicy: Never  # 로컬 이미지 사용
  replicaCount: 1
  env:
    nodeEnv: development
    port: "4000"
    socketPort: "4100"
    databaseUrl: "postgresql://user:pass@localhost:5432/db"  # 외부 DB
    jwtSecret: "local-test-secret-key"
    secretLoginCrypto: "local-crypto-key"
    apiKey: ""
    buildApiKey: ""
    couponSecret: "local-coupon-secret"
    productSecret: "local-product-secret"

# Nginx 비활성화 (로컬 테스트 시 선택사항)
nginx:
  enabled: false

# Certbot 비활성화
certbot:
  enabled: false

# ConfigMap
configMap:
  domainName: "localhost"
  elasticsearchHosts: "http://localhost:9200"

# Secrets (로컬 테스트용 더미 값)
secrets:
  databaseUrl: "postgresql://user:pass@localhost:5432/db"
  jwtSecret: "local-test-secret-key"
  secretLoginCrypto: "local-crypto-key"
  elasticsearchUsername: ""
  elasticsearchPassword: ""
  apiKey: ""
  buildApiKey: ""
  couponSecret: "local-coupon-secret"
  productSecret: "local-product-secret"
EOF
```

### Step 5: Namespace 생성

```bash
# Namespace 생성
kubectl create namespace instance-a

# 또는 Helm 설치 시 자동 생성 (--create-namespace 옵션 사용)
```

### Step 6: Helm 설치 (Dry-run)

```bash
# Dry-run으로 설치 확인 (실제 설치하지 않음)
helm install mecipe-instance-a ./helm/mecipe-instance-a \
  --namespace instance-a \
  --create-namespace \
  --dry-run --debug \
  -f helm/mecipe-instance-a/values-local.yaml
```

### Step 7: Helm 설치 (실제 배포)

```bash
# 실제 설치
helm install mecipe-instance-a ./helm/mecipe-instance-a \
  --namespace instance-a \
  --create-namespace \
  -f helm/mecipe-instance-a/values-local.yaml

# 설치 상태 확인
helm status mecipe-instance-a --namespace instance-a
```

### Step 8: 배포 상태 확인

```bash
# Pod 상태 확인
kubectl get pods -n instance-a

# Pod 상세 정보 확인
kubectl describe pod -n instance-a -l app.kubernetes.io/component=mecipe-was
kubectl describe pod -n instance-a -l app.kubernetes.io/component=place-indexer-service

# Pod 로그 확인
kubectl logs -n instance-a -l app.kubernetes.io/component=mecipe-was --tail=100
kubectl logs -n instance-a -l app.kubernetes.io/component=place-indexer-service --tail=100

# Service 확인
kubectl get svc -n instance-a

# 모든 리소스 확인
kubectl get all -n instance-a
```

### Step 9: 포트 포워딩으로 접근 테스트

```bash
# mecipe-was 포트 포워딩
kubectl port-forward -n instance-a svc/mecipe-instance-a-was 4000:4000

# place-indexer-service 포트 포워딩
kubectl port-forward -n instance-a svc/mecipe-instance-a-place-indexer 3000:3000

# 다른 터미널에서 테스트
curl http://localhost:4000/hello
curl http://localhost:3000/health
```

## 업데이트 및 롤백

### 업데이트

```bash
# 이미지 재빌드
docker build -f apps/place-indexer-service/Dockerfile \
  -t place-indexer-service:local .

# Helm 업그레이드
helm upgrade mecipe-instance-a ./helm/mecipe-instance-a \
  --namespace instance-a \
  -f helm/mecipe-instance-a/values-local.yaml
```

### 롤백

```bash
# 이전 버전으로 롤백
helm rollback mecipe-instance-a --namespace instance-a

# 특정 리비전으로 롤백
helm rollback mecipe-instance-a 2 --namespace instance-a
```

## 정리

### Helm 릴리스 제거

```bash
# Helm 릴리스 제거
helm uninstall mecipe-instance-a --namespace instance-a

# Namespace 제거 (선택사항)
kubectl delete namespace instance-a
```

### 이미지 정리

```bash
# 로컬 이미지 삭제
docker rmi place-indexer-service:local mecipe-was:local
```

## 트러블슈팅

### 문제 1: 이미지를 찾을 수 없음

**에러:**
```
Error: ImagePullBackOff
```

**해결:**
- `imagePullPolicy: Never` 설정 확인 (로컬 이미지 사용 시)
- 이미지가 올바른 이름으로 빌드되었는지 확인
- minikube/kind 사용 시 이미지 로드 확인

### 문제 2: Pod가 시작되지 않음

**확인 사항:**
```bash
# Pod 이벤트 확인
kubectl describe pod <pod-name> -n instance-a

# Pod 로그 확인
kubectl logs <pod-name> -n instance-a

# 리소스 제한 확인
kubectl top pod -n instance-a
```

### 문제 3: 데이터베이스 연결 실패

**해결:**
- 외부 데이터베이스가 접근 가능한지 확인
- `values-local.yaml`의 `databaseUrl` 확인
- 네트워크 정책 확인

### 문제 4: Helm 차트 검증 실패

```bash
# 차트 문법 검증
helm lint ./helm/mecipe-instance-a

# 템플릿 렌더링 확인
helm template mecipe-instance-a ./helm/mecipe-instance-a \
  --namespace instance-a \
  -f helm/mecipe-instance-a/values-local.yaml \
  --debug
```

## 빠른 테스트 스크립트

```bash
#!/bin/bash
# quick-test.sh

set -e

echo "🔨 Building Docker images..."
docker build -f apps/place-indexer-service/Dockerfile \
  -t place-indexer-service:local .
docker build -f mecipe-was/Dockerfile \
  -t mecipe-was:local .

echo "📦 Installing Helm chart..."
helm upgrade --install mecipe-instance-a ./helm/mecipe-instance-a \
  --namespace instance-a \
  --create-namespace \
  -f helm/mecipe-instance-a/values-local.yaml

echo "⏳ Waiting for pods to be ready..."
kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/component=mecipe-was \
  -n instance-a \
  --timeout=300s

echo "✅ Deployment complete!"
kubectl get all -n instance-a
```

## 참고 자료

- [Helm 공식 문서](https://helm.sh/docs/)
- [k3s 문서](https://docs.k3s.io/)
- [minikube 문서](https://minikube.sigs.k8s.io/docs/)
- [kind 문서](https://kind.sigs.k8s.io/)


