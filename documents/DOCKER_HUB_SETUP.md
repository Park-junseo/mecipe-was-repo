# Docker Hub 설정 가이드

Self-hosted runner에서 빌드 시 네트워크 문제를 해결하기 위해 Docker Hub를 사용합니다.

## 왜 Docker Hub를 사용하나요?

### 문제
```
Self-hosted runner에서 빌드
  ↓
npm ci 실행
  ↓
npm 레지스트리 접속 (느리거나 타임아웃)
  ↓
❌ 빌드 실패
```

### 해결
```
GitHub의 빠른 서버(ubuntu-latest)에서 빌드
  ↓
Docker Hub에 이미지 푸시
  ↓
Self-hosted runner에서 pull만 실행
  ↓
✅ 배포 성공 (빠르고 안정적)
```

## 설정 방법

### 1️⃣ Docker Hub 계정 생성

1. [Docker Hub](https://hub.docker.com/) 접속
2. **Sign Up** 클릭
3. 계정 생성 (무료)
4. Username 기억하기 (예: `yourusername`)

### 2️⃣ GitHub Secrets 설정

Repository > Settings > Secrets and variables > Actions

| Secret 이름 | 값 | 설명 |
|-------------|-----|------|
| `DOCKER_USERNAME` | `yourusername` | Docker Hub 사용자명 |
| `DOCKER_PASSWORD` | `your_password_or_token` | Docker Hub 비밀번호 또는 Access Token |

**권장: Access Token 사용**

Docker Hub > Account Settings > Security > New Access Token

```
Token Description: GitHub Actions
Access Permissions: Read & Write
```

생성된 토큰을 `DOCKER_PASSWORD`에 저장

### 3️⃣ 서버 .env 파일 설정

```bash
# 서버에서
cd /app/mecipe-was
nano .env
```

`.env` 파일에 추가:

```env
# Docker Hub 사용자명
DOCKER_USERNAME=yourusername

# 나머지 설정들...
DOMAIN_NAME=api.mecipe.com
DATABASE_URL=postgresql://...
```

### 4️⃣ 배포 테스트

```bash
git add .
git commit -m "Setup Docker Hub for stable builds"
git push origin main
```

## 작동 방식

### GitHub Actions 워크플로우:

```
1. [ubuntu-latest] 테스트 실행
   ↓
2. [ubuntu-latest] Docker 이미지 빌드
   ├─ NestJS 이미지 빌드
   ├─ Nginx 이미지 빌드
   ↓
3. [ubuntu-latest] Docker Hub에 푸시
   ├─ yourusername/mecipe-api-server:latest
   ├─ yourusername/mecipe-nginx:latest
   ↓
4. [self-hosted] Docker Hub에서 Pull
   ├─ docker compose pull
   ↓
5. [self-hosted] 컨테이너 시작
   ├─ docker compose up -d
   ✅ 배포 완료!
```

## docker-compose.yml 설정

```yaml
services:
  app:
    image: ${DOCKER_USERNAME:-local}/mecipe-api-server:latest
    build:
      context: ./mecipe-was
      dockerfile: Dockerfile
```

**동작:**
- `.env`에 `DOCKER_USERNAME=yourusername` 있으면 → `yourusername/mecipe-api-server:latest` 사용
- 없으면 → `local/mecipe-api-server:latest` 사용 (로컬 빌드)

## 로컬 개발 환경

Docker Hub 없이 로컬에서 개발:

```bash
# .env 파일
DOCKER_USERNAME=local  # 또는 생략

# 빌드 및 실행
docker compose build
docker compose up -d
```

로컬 이미지(`local/mecipe-api-server:latest`)가 생성됩니다.

## Docker Hub 이미지 확인

### 웹에서 확인

```
https://hub.docker.com/r/yourusername/mecipe-api-server
```

### CLI로 확인

```bash
# 이미지 목록 확인
docker images | grep mecipe

# Docker Hub에서 pull 테스트
docker pull yourusername/mecipe-api-server:latest
```

## 트러블슈팅

### 문제 1: Docker Hub 로그인 실패

**증상:**
```
Error: Cannot perform an interactive login from a non TTY device
```

**해결:**
```bash
# 서버에서 수동 로그인
docker login -u yourusername -p your_password_or_token

# 또는 토큰 파일 사용
cat ~/docker-token.txt | docker login -u yourusername --password-stdin
```

### 문제 2: Push 권한 없음

**증상:**
```
denied: requested access to the resource is denied
```

**해결:**
- Docker Hub에서 Repository가 생성되어 있는지 확인
- Access Token에 Write 권한이 있는지 확인

### 문제 3: Pull 실패

**증상:**
```
Error response from daemon: pull access denied
```

**해결:**
```bash
# Self-hosted runner에서 로그인
docker login -u yourusername

# GitHub Actions Secrets 확인
# DOCKER_USERNAME, DOCKER_PASSWORD 올바른지 확인
```

### 문제 4: 이미지 크기가 너무 큼

**해결:**

멀티 스테이지 빌드 최적화:

```dockerfile
# .dockerignore 파일 확인
node_modules
dist
.git
*.md
test
```

## Docker Hub 무료 플랜 제한

- **이미지 저장**: 무제한
- **Private Repositories**: 1개
- **Pull 횟수**: 제한 없음 (인증된 사용자)
- **Storage**: 제한 없음

**충분합니다!** 이 프로젝트에는 전혀 문제없습니다.

## 대안: GitHub Container Registry

Docker Hub 대신 GitHub Container Registry 사용:

```yaml
- name: Login to GitHub Container Registry
  uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}

- name: Build and push
  uses: docker/build-push-action@v5
  with:
    push: true
    tags: |
      ghcr.io/${{ github.repository_owner }}/mecipe-api-server:latest
```

**장점:**
- GitHub 계정으로 자동 인증
- Private 무제한
- 추가 계정 불필요

## 요약

### 즉시 할 일:

1. **Docker Hub 계정 생성** (무료)
2. **GitHub Secrets 설정**
   - `DOCKER_USERNAME`
   - `DOCKER_PASSWORD` (또는 Access Token)
3. **서버 .env에 추가**
   ```env
   DOCKER_USERNAME=yourusername
   ```
4. **재배포**
   ```bash
   git push origin main
   ```

### 배포 흐름:

```
GitHub Actions (ubuntu-latest - 빠른 네트워크)
  ↓ 빌드 (npm ci 성공!)
  ↓ Docker Hub에 푸시
  ↓
Self-hosted runner
  ↓ Docker Hub에서 pull (빠름!)
  ↓ 컨테이너 시작
  ✅ 배포 완료
```

이제 네트워크 타임아웃 문제가 해결될 것입니다! 🎉

