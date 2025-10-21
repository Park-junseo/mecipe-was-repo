# 배포 전략 가이드

이 프로젝트는 여러 가지 배포 방식을 지원합니다. 상황에 맞는 방식을 선택하세요.

## 배포 방식 비교

| 방식 | 워크플로우 파일 | 러너 | 배포 방법 | 장점 | 단점 |
|------|----------------|------|-----------|------|------|
| **Self-Hosted + Docker Compose** | `deploy-self-hosted.yml` | self-hosted | Docker Compose | 빠름, 비용 절감 | 서버 관리 필요 |
| **SSH + Docker Compose** | `deploy-ssh.yml` | ubuntu-latest | SSH + Docker Compose | 간단, 안전 | 느림 |
| **기존 방식** | `git-action.yml` | self-hosted | Docker Hub + docker run | 단순 | Nginx/SSL 별도 설정 |

## 1. Self-Hosted Runner + Docker Compose (권장)

### 특징
- ✅ 가장 빠른 배포 속도
- ✅ Docker Compose로 전체 스택 관리 (Nginx + SSL + App)
- ✅ GitHub Actions 무료 사용 (self-hosted)
- ✅ 서버에서 직접 실행되므로 네트워크 지연 없음

### 사용 조건
- Self-hosted runner 설치 및 구성 필요
- 서버에 Docker 및 Docker Compose 설치 필요

### 설정 방법

#### 1단계: Self-Hosted Runner 설정

서버에서 실행:

```bash
# 작업 디렉토리 생성
mkdir -p /opt/actions-runner && cd /opt/actions-runner

# GitHub Actions Runner 다운로드 (최신 버전 확인: https://github.com/actions/runner/releases)
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz

# 압축 해제
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# Runner 설정
./config.sh --url https://github.com/Park-junseo/virtualcafe-was-repo --token YOUR_RUNNER_TOKEN

# 라벨 설정: Linux, X64, self-hosted

# 서비스로 설치 (자동 시작)
sudo ./svc.sh install
sudo ./svc.sh start
```

#### 2단계: GitHub Secrets 설정

Repository > Settings > Secrets and variables > Actions

| Secret 이름 | 설명 | 필수 |
|-------------|------|------|
| `DOCKER_USERNAME` | Docker Hub 사용자명 | 선택 |
| `DOCKER_PASSWORD` | Docker Hub 비밀번호 | 선택 |
| `DOMAIN_NAME` | 도메인 | 필수 |
| `SSL_EMAIL` | SSL 인증서 이메일 | 필수 |
| `DATABASE_URL` | PostgreSQL URL | 필수 |
| `JWT_SECRET` | JWT 시크릿 키 | 필수 |
| `PORT` | 애플리케이션 포트 | 선택 (기본: 4000) |
| `API_KEY` | API 키 | 선택 |

#### 3단계: 배포 테스트

```bash
git add .
git commit -m "Setup self-hosted deployment"
git push origin main
```

## 2. SSH 배포 (Self-Hosted Runner 없을 때)

### 특징
- ✅ Self-hosted runner 불필요
- ✅ GitHub Actions 무료 분 사용
- ✅ 안전한 SSH 연결
- ⚠️ 파일 전송으로 인한 속도 저하

### 설정 방법

#### 1단계: SSH Key 생성

서버에서:

```bash
# SSH 키 생성
ssh-keygen -t rsa -b 4096 -C "deploy@mecipe-was" -f ~/.ssh/mecipe_deploy

# Public Key를 authorized_keys에 추가
cat ~/.ssh/mecipe_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Private Key 내용 출력 (GitHub Secrets에 추가)
cat ~/.ssh/mecipe_deploy
```

#### 2단계: GitHub Secrets 설정

| Secret 이름 | 값 |
|-------------|-----|
| `SERVER_HOST` | 서버 IP (예: 123.45.67.89) |
| `SERVER_USERNAME` | SSH 사용자명 (예: ubuntu) |
| `SERVER_SSH_KEY` | Private Key 전체 내용 |
| `SERVER_PORT` | SSH 포트 (기본: 22) |
| + 기타 환경 변수 (위와 동일) |

#### 3단계: 워크플로우 파일 선택

`.github/workflows/deploy-ssh.yml` 사용

## 3. 기존 방식 (단일 컨테이너)

### 특징
- ✅ 단순한 구조
- ⚠️ Nginx, SSL을 별도로 설정해야 함
- ⚠️ 단일 컨테이너만 배포

### 설정 방법

기존 `mecipe-was/.github/workflows/git-action.yml` 사용 *삭제함*

이 방식은 Docker Compose를 사용하지 않으므로 Nginx와 SSL을 수동으로 설정해야 합니다.

## 배포 전략 선택 가이드

### 프로젝트 초기 단계
→ **SSH 배포** 또는 **Self-Hosted Runner** 권장

### 프로덕션 환경
→ **Self-Hosted Runner + Docker Compose** 강력 권장

### 간단한 API 서버만 필요
→ **기존 방식 (git-action.yml)** 사용 가능

## Self-Hosted Runner 관리

### Runner 상태 확인

```bash
# 서비스 상태
sudo ./svc.sh status

# 로그 확인
journalctl -u actions.runner.* -f
```

### Runner 재시작

```bash
sudo ./svc.sh stop
sudo ./svc.sh start
```

### Runner 제거

```bash
sudo ./svc.sh stop
sudo ./svc.sh uninstall
./config.sh remove --token YOUR_REMOVAL_TOKEN
```

## 워크플로우 커스터마이징

### Docker Hub 사용하지 않기

Docker Hub에 이미지를 푸시하지 않고 로컬에서 빌드만:

```yaml
# deploy-self-hosted.yml에서 build_and_push_docker job 제거
jobs:
  test:
    # ...
  
  deploy:
    needs: [test]  # build_and_push_docker 제거
    # ...
```

그리고 deploy 단계에서:

```yaml
- name: Build and deploy
  run: |
    docker compose build
    docker compose up -d
```

### 스테이징 환경 추가

```yaml
on:
  push:
    branches: 
      - main      # 프로덕션
      - staging   # 스테이징

jobs:
  deploy:
    runs-on: [self-hosted, Linux, X64]
    steps:
      - name: Determine environment
        run: |
          if [ "${{ github.ref }}" == "refs/heads/main" ]; then
            echo "ENV=production" >> $GITHUB_ENV
          else
            echo "ENV=staging" >> $GITHUB_ENV
          fi
      
      - name: Deploy
        run: |
          docker compose -f docker-compose.yml -f docker-compose.${{ env.ENV }}.yml up -d
```

## 롤백 전략

### 이전 버전으로 롤백

```bash
# 서버에서 실행
cd /app/mecipe-was

# 이전 이미지로 롤백 (Docker Hub 사용 시)
docker compose down
docker pull $DOCKER_USERNAME/mecipe-api-server:previous-tag
docker compose up -d

# 또는 Git 이력에서 이전 커밋으로
git checkout <previous-commit-hash>
docker compose build
docker compose up -d
```

### GitHub Actions에서 롤백

1. Actions 탭 > 이전 성공한 워크플로우 선택
2. "Re-run all jobs" 클릭

## 모니터링

### 배포 성공/실패 알림

Slack 알림 추가:

```yaml
- name: Notify deployment success
  if: success()
  uses: 8398a7/action-slack@v3
  with:
    status: success
    text: '✅ Deployment successful!'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}

- name: Notify deployment failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: failure
    text: '❌ Deployment failed!'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 배포 로그 확인

```bash
# GitHub Actions 로그 확인
# Repository > Actions > 워크플로우 선택 > 로그 보기

# 서버에서 직접 확인
docker compose logs -f
docker compose logs app --tail=100
```

## 보안 권장사항

1. **SSH Key 관리**
   - Private Key는 절대 공개하지 않기
   - 정기적으로 키 로테이션

2. **Secrets 관리**
   - 환경 변수를 코드에 하드코딩하지 않기
   - GitHub Secrets 사용

3. **Runner 보안**
   - Self-hosted runner는 방화벽으로 보호
   - 최소 권한 원칙 적용

4. **Docker 이미지**
   - 취약점 스캔 (Trivy, Snyk 등)
   - 정기적인 이미지 업데이트

## 참고 자료

- [GitHub Actions Self-Hosted Runners](https://docs.github.com/en/actions/hosting-your-own-runners)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [GitHub Actions Security Best Practices](https://docs.github.com/en/actions/security-guides)

---

**권장 설정**: Self-Hosted Runner + Docker Compose (`deploy-self-hosted.yml`)

