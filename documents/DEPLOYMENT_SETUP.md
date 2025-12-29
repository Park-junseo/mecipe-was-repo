# 배포 사전 설정 가이드

## ⚠️ 중요: 워크플로우 충돌 문제

현재 두 개의 워크플로우가 동시에 실행될 수 있습니다:

1. **`deploy-self-hosted.yml`**: Docker Compose 기반 배포
2. **`deploy-helm.yml`**: Helm 기반 Kubernetes 배포

**둘 다 `main` 브랜치 push 시 트리거됩니다!**

### 해결 방법

#### 옵션 1: Docker Compose 워크플로우 비활성화 (권장)
```bash
# deploy-self-hosted.yml을 비활성화
mv .github/workflows/deploy-self-hosted.yml .github/workflows/deploy-self-hosted.yml.disabled
```

#### 옵션 2: 조건부 실행 추가
`deploy-self-hosted.yml`에 조건 추가:
```yaml
on:
  push:
    branches: ["main"]
    paths-ignore:
      - 'helm/**'
      - '.github/workflows/deploy-helm.yml'
```

`deploy-helm.yml`에 조건 추가:
```yaml
on:
  push:
    branches: ["main"]
    paths:
      - 'helm/**'
      - '.github/workflows/deploy-helm.yml'
      - 'apps/**'
      - 'mecipe-was/**'
```

## 📋 인스턴스 A 사전 설정 (Kubernetes)

### 1. Kubernetes 클러스터 설정

```bash
# kubectl 설치 확인
kubectl version --client

# 클러스터 연결 확인
kubectl cluster-info

# kubeconfig 파일 생성 (클러스터 관리자 권한 필요)
# 예: k3s, minikube, EKS, GKE 등
```

### 2. Helm 설치

```bash
# Helm 설치
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# 또는 패키지 매니저 사용
# Ubuntu/Debian
sudo apt-get install helm

# Helm 버전 확인
helm version
```

### 3. 네임스페이스 생성 (선택사항)

```bash
# Helm이 자동으로 생성하지만, 수동으로도 가능
kubectl create namespace instance-a
```

### 4. Docker Registry 인증 설정

```bash
# Kubernetes Secret 생성 (Docker Hub 인증)
kubectl create secret docker-registry dockerhub-registry \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=<DOCKER_USERNAME> \
  --docker-password=<DOCKER_PASSWORD> \
  --docker-email=<EMAIL> \
  --namespace instance-a

# 또는 values.yaml에서 imagePullSecrets 설정
```

### 5. StorageClass 확인 (PVC 사용 시)

```bash
# StorageClass 확인
kubectl get storageclass

# 기본 StorageClass가 없으면 생성 필요
# 예: local-path-provisioner (k3s), hostpath (minikube)
```

### 6. 네트워크 정책 (선택사항)

```bash
# 인스턴스 간 통신을 위한 네트워크 정책 확인
# 기본적으로 같은 클러스터 내에서는 통신 가능
```

## 📋 인스턴스 B 사전 설정 (Kubernetes)

### 1. 네임스페이스 생성

```bash
kubectl create namespace instance-b
```

### 2. 외부 PostgreSQL/Elasticsearch 사용 시

헬스체크 스크립트가 자동으로 폴백하지만, 외부 서비스를 사용하려면:

```bash
# 외부 PostgreSQL 연결 정보 확인
# POSTGRES_HOST, POSTGRES_PORT 등 환경변수 설정 필요

# 외부 Elasticsearch 연결 정보 확인
# ELASTICSEARCH_HOST, ELASTICSEARCH_PORT 등 환경변수 설정 필요
```

### 3. StorageClass 확인

```bash
# PostgreSQL과 Elasticsearch는 PVC 사용
kubectl get storageclass
```

## 🔐 GitHub Secrets 설정

Repository > Settings > Secrets and variables > Actions에서 다음 Secrets 설정:

### 필수 Secrets

```bash
# Docker Hub
DOCKER_USERNAME=your-dockerhub-username
DOCKER_PASSWORD=your-dockerhub-password-or-token

# Kubernetes
KUBECONFIG=<base64-encoded-kubeconfig>
# 생성 방법:
# cat ~/.kube/config | base64 -w 0

# Application
DOMAIN_NAME=api.example.com
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-jwt-secret
SECRET_LOGIN_CRYPTO=your-login-crypto-secret
COUPON_SECRET=your-coupon-secret
PRODUCT_SECRET=your-product-secret

# Instance B (PostgreSQL/Elasticsearch)
POSTGRES_PASSWORD=your-postgres-password
ELASTICSEARCH_PASSWORD=your-elasticsearch-password
KIBANA_PASSWORD=your-kibana-password

# Optional
API_KEY=your-api-key
BUILD_API_KEY=your-build-api-key
POSTGRES_HOST=postgresql.instance-b.svc.cluster.local
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_DB=mydb
ELASTICSEARCH_HOST=elasticsearch.instance-b.svc.cluster.local
ELASTICSEARCH_PORT=9200
ELASTICSEARCH_USERNAME=elastic
SSL_EMAIL=your-email@example.com
PORT=4000
SOCKET_PORT=4100
```

## 🚀 배포 프로세스

### 1. 워크플로우 실행 순서

```
main 브랜치 push
  ↓
1. 테스트 실행 (ubuntu-latest)
  ↓
2. Docker 이미지 빌드 및 푸시 (ubuntu-latest)
  ↓
3. 인스턴스 B 헬스체크 및 폴백 (self-hosted)
  ↓
4. 인스턴스 A 배포 (Helm) (self-hosted)
  ↓
5. 인스턴스 B 배포 (Helm) (self-hosted)
```

### 2. 수동 배포

```bash
# 인스턴스 A 배포
helm upgrade --install mecipe-instance-a ./helm/mecipe-instance-a \
  --namespace instance-a \
  --create-namespace \
  --set global.dockerRegistry="your-dockerhub-username" \
  --set placeIndexerService.image.repository="your-dockerhub-username/place-indexer-service" \
  --set placeIndexerService.image.tag="latest" \
  --set mecipeWAS.image.repository="your-dockerhub-username/mecipe-api-server" \
  --set mecipeWAS.image.tag="latest" \
  --set nginx.image.repository="your-dockerhub-username/mecipe-nginx" \
  --set nginx.image.tag="latest" \
  --set configMap.domainName="api.example.com" \
  --set secrets.databaseUrl="postgresql://..." \
  --set secrets.jwtSecret="your-jwt-secret" \
  # ... 기타 secrets

# 인스턴스 B 배포
helm upgrade --install mecipe-instance-b ./helm/mecipe-instance-b \
  --namespace instance-b \
  --create-namespace \
  --set secrets.postgresPassword="your-password" \
  --set secrets.elasticPassword="your-password" \
  --set secrets.kibanaPassword="your-password"
```

## 🔍 배포 확인

### Pod 상태 확인

```bash
# 인스턴스 A
kubectl get pods -n instance-a
kubectl get svc -n instance-a

# 인스턴스 B
kubectl get pods -n instance-b
kubectl get svc -n instance-b
```

### 로그 확인

```bash
# 인스턴스 A
kubectl logs -n instance-a deployment/mecipe-instance-a-was
kubectl logs -n instance-a deployment/mecipe-instance-a-place-indexer

# 인스턴스 B
kubectl logs -n instance-b statefulset/postgresql
kubectl logs -n instance-b statefulset/elasticsearch
```

### 헬스체크

```bash
# 인스턴스 A
kubectl port-forward -n instance-a svc/mecipe-instance-a-was 4000:4000
curl http://localhost:4000/health

# 인스턴스 B
kubectl port-forward -n instance-b svc/elasticsearch 9200:9200
curl http://localhost:9200/_cluster/health
```

## ⚠️ 주의사항

1. **동시 배포 방지**: 두 워크플로우가 동시에 실행되지 않도록 주의
2. **리소스 제한**: Kubernetes 클러스터의 리소스 제한 확인
3. **네트워크 정책**: 인스턴스 간 통신이 가능한지 확인
4. **StorageClass**: PVC가 제대로 생성되는지 확인
5. **Secret 관리**: 민감한 정보는 GitHub Secrets에 저장

## 🐛 트러블슈팅

### Pod가 시작되지 않을 때

```bash
# Pod 상태 확인
kubectl describe pod <pod-name> -n <namespace>

# 이벤트 확인
kubectl get events -n <namespace> --sort-by='.lastTimestamp'
```

### 이미지 Pull 실패

```bash
# Docker Registry Secret 확인
kubectl get secret dockerhub-registry -n instance-a

# 이미지 Pull 테스트
kubectl run test-pod --image=your-dockerhub-username/mecipe-api-server:latest --rm -it --restart=Never
```

### PVC 생성 실패

```bash
# StorageClass 확인
kubectl get storageclass

# PVC 상태 확인
kubectl get pvc -n <namespace>
kubectl describe pvc <pvc-name> -n <namespace>
```

## 📚 참고 자료

- [Helm 공식 문서](https://helm.sh/docs/)
- [Kubernetes 공식 문서](https://kubernetes.io/docs/)
- [GitHub Actions 문서](https://docs.github.com/en/actions)

