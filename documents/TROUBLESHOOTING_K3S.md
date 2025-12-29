# k3s 트러블슈팅 가이드

## 권한 문제 해결

### 문제: k3s.yaml 파일 읽기 권한 없음

**에러 메시지:**
```
WARN[0010] Unable to read /etc/rancher/k3s/k3s.yaml, please start server with --write-kubeconfig-mode or --write-kubeconfig-group to modify kube config permissions
error: error loading config file "/etc/rancher/k3s/k3s.yaml": open /etc/rancher/k3s/k3s.yaml: permission denied
```

### 해결 방법 1: sudo로 복사 (권장)

```bash
# .kube 디렉토리 생성
mkdir -p ~/.kube

# sudo로 읽어서 복사
sudo cat /etc/rancher/k3s/k3s.yaml > ~/.kube/config

# 권한 설정
chmod 600 ~/.kube/config

# 파일이 제대로 생성되었는지 확인
ls -la ~/.kube/config
cat ~/.kube/config | head -5

# KUBECONFIG 환경변수 확인 (설정되어 있으면 제거)
unset KUBECONFIG

# kubectl이 올바른 파일을 사용하는지 확인
kubectl config view

# 확인
kubectl cluster-info
```

### 해결 방법 2: k3s 재설치 시 권한 옵션 추가

```bash
# k3s 제거
sudo /usr/local/bin/k3s-uninstall.sh

# 권한 옵션과 함께 재설치
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--write-kubeconfig-mode 644" sh -

# 또는 그룹 권한 설정
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--write-kubeconfig-group $USER" sh -
```

### 해결 방법 3: 기존 k3s에 권한 옵션 추가

```bash
# k3s 서비스 파일 수정
sudo systemctl edit k3s

# 다음 내용 추가:
[Service]
ExecStart=
ExecStart=/usr/local/bin/k3s server --write-kubeconfig-mode 644

# 서비스 재시작
sudo systemctl daemon-reload
sudo systemctl restart k3s

# kubeconfig 복사
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER:$USER ~/.kube/config
chmod 600 ~/.kube/config
```

## kubeconfig 파일 수정

### server 주소 변경 (원격 접속 시)

k3s.yaml의 server 주소가 `127.0.0.1` 또는 `localhost`로 되어 있을 수 있습니다.

```bash
# 현재 설정 확인
cat ~/.kube/config | grep server

# localhost를 실제 IP나 도메인으로 변경
sed -i 's/127.0.0.1/your-server-ip/g' ~/.kube/config
# 또는
sed -i 's/localhost/your-server-ip/g' ~/.kube/config
```

### 클러스터 이름 변경

```bash
# 클러�터 이름 확인
kubectl config get-contexts

# 기본 컨텍스트 사용
kubectl config use-context default
```

## k3s 서비스 상태 확인

```bash
# k3s 서비스 상태
sudo systemctl status k3s

# k3s 로그 확인 (최근 100줄)
sudo journalctl -u k3s -n 100 --no-pager

# 실시간 로그 확인
sudo journalctl -u k3s -f

# k3s 프로세스 확인
ps aux | grep k3s

# k3s 포트 확인
sudo netstat -tlnp | grep k3s
# 또는
sudo ss -tlnp | grep 6443
```

## 서버가 요청을 처리할 수 없을 때

**에러 메시지:**
```
Error from server (ServiceUnavailable): the server is currently unable to handle the request
couldn't get current server API group list: the server is currently unable to handle the request
```

### 해결 방법

```bash
# 1. k3s 서비스 상태 확인
sudo systemctl status k3s

# 2. k3s가 실행 중이 아니면 시작
sudo systemctl start k3s

# 3. k3s 재시작 (서비스가 실행 중이지만 응답하지 않을 때)
sudo systemctl restart k3s

# 4. 잠시 대기 후 확인 (k3s가 시작되는데 시간이 걸릴 수 있음)
sleep 10
kubectl get nodes

# 5. 로그 확인하여 문제 파악
sudo journalctl -u k3s -n 50 --no-pager
```

## k3s 재시작

```bash
# k3s 재시작
sudo systemctl restart k3s

# 재시작 후 확인
sudo systemctl status k3s
kubectl get nodes
```

## 완전히 제거 후 재설치

```bash
# k3s 제거
sudo /usr/local/bin/k3s-uninstall.sh

# 또는
sudo /usr/local/bin/k3s-agent-uninstall.sh

# 재설치
curl -sfL https://get.k3s.io | sh -

# kubeconfig 설정
mkdir -p ~/.kube
sudo cat /etc/rancher/k3s/k3s.yaml > ~/.kube/config
chmod 600 ~/.kube/config
```

## 네트워크 문제

### 방화벽 설정

```bash
# k3s 포트 확인
sudo netstat -tlnp | grep k3s

# 방화벽 규칙 추가 (필요시)
sudo firewall-cmd --permanent --add-port=6443/tcp
sudo firewall-cmd --reload

# 또는 ufw 사용
sudo ufw allow 6443/tcp
```

## TLS handshake timeout 에러

**에러 메시지:**
```
Unable to connect to the server: net/http: TLS handshake timeout
```

### 해결 방법

```bash
# 1. k3s 서비스 상태 확인
sudo systemctl status k3s

# 2. k3s가 실행 중이 아니면 시작
sudo systemctl start k3s

# 3. k3s 재시작 (가장 일반적인 해결책)
sudo systemctl restart k3s

# 4. k3s가 완전히 시작될 때까지 대기 (중요!)
sleep 30

# 5. 다시 시도
kubectl get nodes

# 6. 여전히 안 되면 로그 확인
sudo journalctl -u k3s -n 100 --no-pager

# 7. 포트 확인 (6443 포트가 열려있는지)
sudo netstat -tlnp | grep 6443
# 또는
sudo ss -tlnp | grep 6443

# 8. k3s 프로세스 확인
ps aux | grep k3s
```

### k3s가 시작되지 않을 때

```bash
# k3s 로그 확인
sudo journalctl -u k3s -n 200 --no-pager

# 일반적인 문제들:
# - 디스크 공간 부족
# - 메모리 부족
# - 포트 충돌
# - 권한 문제

# 디스크 공간 확인
df -h

# 메모리 확인
free -h

# 포트 충돌 확인
sudo lsof -i :6443
```

## kubectl 연결 테스트

```bash
# 클러스터 정보 확인
kubectl cluster-info

# 노드 확인
kubectl get nodes

# 모든 리소스 확인
kubectl get all --all-namespaces
```

## Docker Compose와의 충돌

**증상:**
- k3s가 API 서버에 연결하는데 계속 타임아웃 발생
- "context deadline exceeded" 에러 반복
- 이전에 Docker Compose로 서비스를 실행했던 서버

### 해결 방법

```bash
# 1. 포트 충돌 확인 (6443 포트)
sudo lsof -i :6443
sudo netstat -tlnp | grep 6443

# 2. Docker와 k3s의 네트워크 충돌 확인
docker network ls
ip link show

# 3. Docker Compose 서비스 중지 (중요!)
cd /path/to/docker-compose
docker compose down

# 4. Docker 네트워크 정리
docker network prune -f

# 5. k3s 재시작
sudo systemctl restart k3s
sleep 60
kubectl get nodes

# 6. 여전히 문제가 있으면 k3s 완전히 제거 후 재설치
sudo /usr/local/bin/k3s-uninstall.sh
sudo rm -rf /var/lib/rancher/k3s
curl -sfL https://get.k3s.io | sh -
```

### 포트 충돌 해결

```bash
# 6443 포트를 사용하는 프로세스 확인
sudo lsof -i :6443

# 프로세스 종료 (필요시)
sudo kill -9 <PID>

# 또는 다른 포트로 k3s 실행
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--https-listen-port 6444" sh -
# 그 후 kubeconfig의 server 포트도 변경 필요
```

### 리소스 부족 확인

```bash
# 메모리 확인
free -h

# 디스크 공간 확인
df -h

# CPU 사용률 확인
top

# k3s가 사용하는 리소스 확인
ps aux | grep k3s
```

## 참고 자료

- [k3s 공식 문서](https://k3s.io/)
- [k3s 설치 가이드](https://docs.k3s.io/installation)
- [k3s 트러블슈팅](https://docs.k3s.io/troubleshooting)

