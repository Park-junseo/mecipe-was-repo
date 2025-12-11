# 인스턴스별 사전 설정 가이드

## 📋 인스턴스 A 사전 설정

### 1. 운영 체제 요구사항

- **OS**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+ / RHEL 8+
- **아키텍처**: x64 (amd64)
- **최소 사양**:
  - CPU: 2 cores 이상
  - RAM: 4GB 이상
  - 디스크: 20GB 이상

### 2. Kubernetes 클러스터 설정

#### 옵션 A: k3s 설치 (권장 - 간단함)

```bash
# k3s 설치
curl -sfL https://get.k3s.io | sh -

# k3s 상태 확인
sudo systemctl status k3s

# kubeconfig 설정
# .kube 디렉토리 생성 (중요!)
mkdir -p ~/.kube

# k3s.yaml 복사 (sudo로 읽어서 복사)
sudo cat /etc/rancher/k3s/k3s.yaml > ~/.kube/config

# 또는 직접 복사 후 권한 설정
# sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
# sudo chown $USER:$USER ~/.kube/config

# 권한 설정
chmod 600 ~/.kube/config

# k3s.yaml의 server 주소를 localhost로 변경 (필요시)
# sed -i 's/127.0.0.1/localhost/g' ~/.kube/config

# kubectl 설치 확인
kubectl cluster-info
kubectl get nodes
```

#### 옵션 B: minikube (로컬 개발용)

```bash
# minikube 설치
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# minikube 시작
minikube start

# kubectl 설정
minikube kubectl -- get nodes
```

#### 옵션 C: 기존 클러스터 사용

```bash
# 기존 kubeconfig 복사
mkdir -p ~/.kube
# kubeconfig 파일을 ~/.kube/config에 복사
chmod 600 ~/.kube/config

# 연결 확인
kubectl cluster-info
```

### 3. Helm 설치

```bash
# Helm 설치
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# 또는 패키지 매니저 사용
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install helm

# CentOS/RHEL
sudo yum install helm

# Helm 버전 확인
helm version
```

### 4. Docker 설치 (헬스체크 스크립트용)

```bash
# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker 서비스 시작
sudo systemctl start docker
sudo systemctl enable docker

# 현재 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER

# 재로그인 후 확인
newgrp docker
docker ps
```

### 5. GitHub Actions Runner 설치

```bash
# Runner 디렉토리 생성
cd ~
mkdir actions-runner && cd actions-runner

# Runner 다운로드 (최신 버전 확인: https://github.com/actions/runner/releases)
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz

# 압축 해제
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# Runner 설정
# Repository > Settings > Actions > Runners > New self-hosted runner에서 토큰 발급
./config.sh --url https://github.com/YOUR_USERNAME/YOUR_REPO --token YOUR_RUNNER_TOKEN

# 설정 중 태그 지정 (중요!)
# Enter any additional labels: instance-a,Linux,X64

# 서비스로 등록
sudo ./svc.sh install

# 서비스 시작
sudo ./svc.sh start

# 상태 확인
sudo ./svc.sh status
```

### 6. 네트워크 설정

```bash
# 방화벽 설정 (필요시)
# Kubernetes API 서버 포트
sudo ufw allow 6443/tcp

# NodePort 범위 (기본: 30000-32767)
sudo ufw allow 30000:32767/tcp

# 또는 방화벽 비활성화 (개발 환경)
sudo ufw disable
```

### 7. StorageClass 확인/설정

```bash
# 기본 StorageClass 확인
kubectl get storageclass

# k3s의 경우 local-path-provisioner가 기본으로 설치됨
# 다른 클러스터의 경우 StorageClass 설치 필요
```

### 8. 네임스페이스 생성 (선택사항)

```bash
# Helm이 자동으로 생성하지만, 수동으로도 가능
kubectl create namespace instance-a
```

### 9. Docker Registry 인증 설정 (선택사항)

```bash
# Kubernetes Secret 생성 (Docker Hub 인증)
kubectl create secret docker-registry dockerhub-registry \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=<DOCKER_USERNAME> \
  --docker-password=<DOCKER_PASSWORD> \
  --docker-email=<EMAIL> \
  --namespace instance-a
```

### 10. kubectl 권한 확인

```bash
# 클러스터 접근 권한 확인
kubectl auth can-i create deployments --namespace instance-a
kubectl auth can-i create services --namespace instance-a
kubectl auth can-i create secrets --namespace instance-a
```

## 📋 인스턴스 B 사전 설정

### 1. 운영 체제 요구사항

- **OS**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+ / RHEL 8+
- **아키텍처**: x64 (amd64)
- **최소 사양**:
  - CPU: 4 cores 이상 (Elasticsearch 권장)
  - RAM: 8GB 이상 (Elasticsearch 권장)
  - 디스크: 50GB 이상 (데이터 저장용)

### 2. Kubernetes 클러스터 설정

인스턴스 A와 동일한 방법으로 설정:

```bash
# k3s 설치 (예시)
curl -sfL https://get.k3s.io | sh -
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER:$USER ~/.kube/config
chmod 600 ~/.kube/config

# 확인
kubectl cluster-info
kubectl get nodes
```

**중요**: 인스턴스 A와 B가 같은 클러스터를 사용하는 경우, 인스턴스 B에서는 kubeconfig만 설정하면 됩니다.

### 3. Helm 설치

인스턴스 A와 동일:

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
helm version
```

### 4. Docker 설치 (헬스체크 및 폴백용)

인스턴스 A와 동일:

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
newgrp docker
docker ps
```

### 5. PostgreSQL 클라이언트 설치 (선택사항)

```bash
# PostgreSQL 클라이언트 설치 (헬스체크용)
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install postgresql-client

# CentOS/RHEL
sudo yum install postgresql

# 확인
psql --version
```

### 6. curl 및 netcat 설치 (헬스체크 스크립트용)

```bash
# Ubuntu/Debian
sudo apt-get install curl netcat-openbsd

# CentOS/RHEL
sudo yum install curl nc
```

### 7. GitHub Actions Runner 설치

```bash
# Runner 디렉토리 생성
cd ~
mkdir actions-runner && cd actions-runner

# Runner 다운로드
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# Runner 설정 (태그 중요!)
./config.sh --url https://github.com/YOUR_USERNAME/YOUR_REPO --token YOUR_RUNNER_TOKEN
# Enter any additional labels: instance-b,Linux,X64

# 서비스로 등록
sudo ./svc.sh install
sudo ./svc.sh start
sudo ./svc.sh status
```

### 8. 네트워크 설정

```bash
# 방화벽 설정 (필요시)
# PostgreSQL 포트 (외부 사용 시)
sudo ufw allow 5432/tcp

# Elasticsearch 포트 (외부 사용 시)
sudo ufw allow 9200/tcp

# 또는 방화벽 비활성화 (개발 환경)
sudo ufw disable
```

### 9. StorageClass 확인/설정

```bash
# 기본 StorageClass 확인
kubectl get storageclass

# PostgreSQL과 Elasticsearch는 PVC 사용
# StorageClass가 없으면 설치 필요
```

### 10. 네임스페이스 생성 (선택사항)

```bash
kubectl create namespace instance-b
```

### 11. 외부 PostgreSQL/Elasticsearch 사용 시 (선택사항)

외부 서비스를 사용하는 경우, 헬스체크 스크립트가 자동으로 폴백합니다.

```bash
# 외부 PostgreSQL 연결 테스트
psql -h <POSTGRES_HOST> -p <POSTGRES_PORT> -U <POSTGRES_USER> -d <POSTGRES_DB>

# 외부 Elasticsearch 연결 테스트
curl -u <ELASTICSEARCH_USERNAME>:<ELASTICSEARCH_PASSWORD> \
  http://<ELASTICSEARCH_HOST>:<ELASTICSEARCH_PORT>/_cluster/health
```

## 🔐 GitHub Secrets 설정

Repository > Settings > Secrets and variables > Actions에서 설정:

### 필수 Secrets

```bash
# Docker Hub
DOCKER_USERNAME=your-dockerhub-username
DOCKER_PASSWORD=your-dockerhub-password-or-token

# Kubernetes (인스턴스 A 또는 공유 클러스터)
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
```

### 선택적 Secrets

```bash
# API Keys
API_KEY=your-api-key
BUILD_API_KEY=your-build-api-key

# PostgreSQL 설정 (기본값 있음)
POSTGRES_HOST=postgresql.instance-b.svc.cluster.local
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_DB=mydb

# Elasticsearch 설정 (기본값 있음)
ELASTICSEARCH_HOST=elasticsearch.instance-b.svc.cluster.local
ELASTICSEARCH_PORT=9200
ELASTICSEARCH_USERNAME=elastic

# SSL
SSL_EMAIL=your-email@example.com

# Application Ports
PORT=4000
SOCKET_PORT=4100
```

## ✅ 설정 확인 체크리스트

### 인스턴스 A

- [ ] Kubernetes 클러스터 설치 및 연결 확인
- [ ] Helm 설치 확인 (`helm version`)
- [ ] Docker 설치 확인 (`docker ps`)
- [ ] kubectl 권한 확인 (`kubectl auth can-i create deployments`)
- [ ] GitHub Actions Runner 설치 및 태그 설정 (`instance-a,Linux,X64`)
- [ ] Runner 상태 확인 (GitHub 웹 UI)
- [ ] StorageClass 확인 (`kubectl get storageclass`)
- [ ] 네트워크 설정 (방화벽 등)

### 인스턴스 B

- [ ] Kubernetes 클러스터 연결 확인 (인스턴스 A와 같은 클러스터 또는 별도)
- [ ] Helm 설치 확인 (`helm version`)
- [ ] Docker 설치 확인 (`docker ps`)
- [ ] PostgreSQL 클라이언트 설치 확인 (`psql --version`)
- [ ] curl 및 netcat 설치 확인 (`curl --version`, `nc --version`)
- [ ] GitHub Actions Runner 설치 및 태그 설정 (`instance-b,Linux,X64`)
- [ ] Runner 상태 확인 (GitHub 웹 UI)
- [ ] StorageClass 확인 (`kubectl get storageclass`)
- [ ] 외부 PostgreSQL/Elasticsearch 연결 테스트 (사용 시)

## 🚀 배포 테스트

### 수동 배포 테스트

```bash
# 인스턴스 A에서
helm upgrade --install mecipe-instance-a ./helm/mecipe-instance-a \
  --namespace instance-a \
  --create-namespace \
  --dry-run

# 인스턴스 B에서
helm upgrade --install mecipe-instance-b ./helm/mecipe-instance-b \
  --namespace instance-b \
  --create-namespace \
  --dry-run
```

### Runner 테스트

```bash
# GitHub Actions에서 workflow_dispatch로 수동 실행
# 또는 테스트 브랜치에 push하여 자동 실행 확인
```

## 🐛 트러블슈팅

### Runner가 작업을 받지 못할 때

```bash
# Runner 재시작
cd ~/actions-runner
sudo ./svc.sh stop
sudo ./svc.sh start

# 로그 확인
tail -f _diag/Runner_*.log
```

### kubectl 연결 실패

```bash
# kubeconfig 확인
cat ~/.kube/config

# 클러스터 연결 테스트
kubectl cluster-info
```

### Docker 권한 문제

```bash
# docker 그룹에 사용자 추가
sudo usermod -aG docker $USER
newgrp docker

# 또는 sudo 사용 (권장하지 않음)
sudo docker ps
```

## 📚 참고 자료

- [k3s 설치 가이드](https://k3s.io/)
- [Helm 설치 가이드](https://helm.sh/docs/intro/install/)
- [GitHub Actions Runner 설정](https://docs.github.com/en/actions/hosting-your-own-runners)
- [Kubernetes 공식 문서](https://kubernetes.io/docs/)

