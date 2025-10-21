# 배포 트러블슈팅 가이드

GitHub Actions에서 배포 시 발생하는 문제들과 해결 방법을 정리합니다.

## 문제: npm ci에서 멈춤 (Build 단계)

### 증상
```
#26 [app builder 5/8] RUN npm ci
#26 55.78 npm warn deprecated ...
#26 72.88 npm warn deprecated ...
# 여기서 멈춤 또는 매우 느림
```

### 원인

1. **실제로 멈춘 게 아님** (가장 흔함)
   - `npm ci`는 package-lock.json의 모든 패키지를 다운로드
   - 네트워크 속도에 따라 2~10분 걸릴 수 있음
   - 출력이 없어서 멈춘 것처럼 보임

2. **네트워크 타임아웃**
   - npm 레지스트리 연결 문제
   - Self-hosted runner의 네트워크 불안정

3. **메모리 부족**
   - Self-hosted runner 서버의 RAM 부족
   - Docker 빌드 시 메모리 초과

4. **Docker BuildKit 캐시 문제**

### 해결 방법

#### ✅ 방법 1: Dockerfile 최적화 (이미 적용됨)

```dockerfile
# npm ci 최적화
RUN npm ci --prefer-offline --no-audit --progress=true
```

**옵션 설명:**
- `--prefer-offline`: 가능하면 캐시 사용
- `--no-audit`: 보안 감사 건너뛰기 (빌드 속도 개선)
- `--progress=true`: 진행 상황 출력

#### ✅ 방법 2: GitHub Actions에 타임아웃 설정

`.github/workflows/deploy-self-hosted.yml`:

```yaml
jobs:
  deploy:
    timeout-minutes: 30  # 전체 job 타임아웃
    runs-on: [self-hosted, Linux, X64]
    steps:
      - name: Deploy with Docker Compose
        timeout-minutes: 20  # 이 step만 타임아웃
        run: |
          docker compose build --progress=plain
          docker compose up -d
```

#### ✅ 방법 3: Docker 빌드 타임아웃 증가

서버에서 Docker daemon 설정:

```bash
# /etc/docker/daemon.json
{
  "max-concurrent-downloads": 3,
  "max-concurrent-uploads": 5,
  "default-address-pools": [
    {
      "base": "172.17.0.0/12",
      "size": 24
    }
  ]
}

# Docker 재시작
sudo systemctl restart docker
```

#### ✅ 방법 4: npm 레지스트리 캐시 설정

서버에 npm 캐시 서버 구성 (선택사항):

```bash
# verdaccio (npm 캐시 프록시) 설치
npm install -g verdaccio

# 실행
verdaccio

# .npmrc 설정
npm config set registry http://localhost:4873
```

#### ✅ 방법 5: Docker BuildKit 사용

`.github/workflows/deploy-self-hosted.yml`:

```yaml
- name: Deploy with Docker Compose
  env:
    DOCKER_BUILDKIT: 1
    COMPOSE_DOCKER_CLI_BUILD: 1
  run: |
    docker compose build --progress=plain
    docker compose up -d
```

#### ✅ 방법 6: 단계별 빌드 확인

서버에서 수동으로 테스트:

```bash
cd /app/mecipe-was

# 1단계: 개별 빌드 테스트
docker build -f mecipe-was/Dockerfile mecipe-was/ --progress=plain

# 2단계: 타임아웃 설정
timeout 600 docker build -f mecipe-was/Dockerfile mecipe-was/

# 3단계: 메모리 제한 없이 빌드
docker build --memory=4g -f mecipe-was/Dockerfile mecipe-was/
```

### 임시 해결책: Docker Hub 이미지 사용

빌드하지 않고 미리 빌드된 이미지 사용:

#### 1. 로컬에서 빌드 및 푸시

```bash
# 로컬에서 (Windows)
docker build -t yourusername/mecipe-api-server:latest mecipe-was/
docker push yourusername/mecipe-api-server:latest
```

#### 2. docker-compose.yml 수정

```yaml
services:
  app:
    image: yourusername/mecipe-api-server:latest
    # build 섹션 주석 처리
    # build:
    #   context: ./mecipe-was
```

#### 3. GitHub Actions에서 pull만 실행

```yaml
- name: Deploy with Docker Compose
  run: |
    docker compose pull
    docker compose up -d
```

---

## 문제: 메모리 부족 (OOM)

### 증상
```
The command 'npm ci' returned a non-zero code: 137
```

### 해결

#### 서버 메모리 확인

```bash
# 사용 가능한 메모리 확인
free -h

# Docker 메모리 사용량
docker stats

# swap 설정 확인
swapon --show
```

#### swap 메모리 추가 (메모리 부족 시)

```bash
# 2GB swap 생성
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 영구 설정
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

#### Docker 메모리 제한 해제

`docker-compose.yml`:

```yaml
services:
  app:
    build:
      context: ./mecipe-was
      shm_size: '2gb'
    deploy:
      resources:
        limits:
          memory: 2G
```

---

## 문제: Docker 빌드 캐시 문제

### 증상
빌드가 계속 처음부터 시작되어 느림

### 해결

#### BuildKit 캐시 활성화

```bash
# 환경 변수 설정
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# 빌드
docker compose build
```

#### GitHub Actions에서 캐시 사용

`.github/workflows/deploy-self-hosted.yml`:

```yaml
- name: Deploy with Docker Compose
  env:
    DOCKER_BUILDKIT: 1
    COMPOSE_DOCKER_CLI_BUILD: 1
  run: |
    docker compose build --build-arg BUILDKIT_INLINE_CACHE=1
    docker compose up -d
```

---

## 문제: 네트워크 타임아웃

### 증상
```
npm ERR! network timeout
npm ERR! network Socket timeout
```

### 해결

#### npm 타임아웃 증가

Dockerfile:

```dockerfile
RUN npm config set fetch-timeout 300000 && \
    npm config set fetch-retries 5 && \
    npm ci --prefer-offline --no-audit
```

#### 미러 레지스트리 사용

```dockerfile
# 한국 npm 미러 사용
RUN npm config set registry https://registry.npmmirror.com && \
    npm ci
```

---

## 권장: 개선된 Dockerfile

```dockerfile
FROM node:20-slim AS builder

WORKDIR /app

# Debian에서 Prisma 실행을 위한 OpenSSL 설치
RUN apt-get update -y && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

# npm 설정 최적화
RUN npm config set fetch-timeout 300000 && \
    npm config set fetch-retries 5

COPY package*.json ./

# npm ci 최적화
RUN npm ci \
    --prefer-offline \
    --no-audit \
    --progress=true \
    --loglevel=verbose

COPY . .

# Prisma Client 생성
RUN npx prisma generate

# NestJS 빌드
RUN npm run build

# 프로덕션 이미지
FROM node:20-slim

RUN apt-get update -y && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:${PORT:-4000}/hello', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]
```

---

## 권장: 개선된 GitHub Actions

`.github/workflows/deploy-self-hosted.yml`:

```yaml
- name: Deploy with Docker Compose
  timeout-minutes: 20
  env:
    DOCKER_BUILDKIT: 1
    COMPOSE_DOCKER_CLI_BUILD: 1
  run: |
    echo "--- Starting deployment ---"
    
    # 이전 컨테이너 중지
    docker compose down
    
    # 이전 빌드 캐시 정리 (선택)
    # docker builder prune -f
    
    # 빌드 (상세 로그)
    echo "Building Docker images..."
    docker compose build \
      --progress=plain \
      --build-arg BUILDKIT_INLINE_CACHE=1
    
    # 시작
    echo "Starting containers..."
    docker compose up -d
    
    # 대기
    echo "Waiting for services to start..."
    sleep 30
    
    # 상태 확인
    docker compose ps
    
    echo "--- Deployment complete ---"
```

---

## 빠른 진단 체크리스트

### 서버에서 직접 확인

```bash
# 1. 메모리 확인
free -h
# Available이 1GB 이상인지 확인

# 2. 디스크 공간 확인
df -h
# / 파티션에 10GB 이상 여유 공간 확인

# 3. Docker 상태 확인
docker info | grep -i memory
docker info | grep -i "total memory"

# 4. 수동 빌드 테스트
cd /app/mecipe-was
docker build -f mecipe-was/Dockerfile mecipe-was/ --progress=plain

# 5. npm ci 직접 테스트
cd mecipe-was
npm ci
```

### GitHub Actions 로그 확인

1. Repository > Actions > 실패한 워크플로우 클릭
2. "Deploy with Docker Compose" 단계 확인
3. 정확히 어디서 멈췄는지 확인

---

## 대안: 2단계 배포

빌드와 배포를 분리:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest  # GitHub의 강력한 서버 사용
    steps:
      - name: Build and push Docker image
        # Docker Hub에 이미지 푸시
  
  deploy:
    needs: build
    runs-on: [self-hosted, Linux, X64]
    steps:
      - name: Pull and run
        run: |
          docker compose pull
          docker compose up -d
```

이렇게 하면 Self-hosted runner의 부담을 줄일 수 있습니다.

---

## 요약

### 즉시 시도할 것:

1. **기다리기** (가장 간단)
   - `npm ci`는 5~10분 걸릴 수 있음
   - GitHub Actions 로그에서 타임아웃(60분) 확인

2. **Dockerfile 수정 적용** (이미 완료)
   ```dockerfile
   RUN npm ci --prefer-offline --no-audit --progress=true
   ```

3. **GitHub Actions 타임아웃 추가**
   ```yaml
   timeout-minutes: 20
   ```

4. **상세 로그 활성화** (이미 완료)
   ```yaml
   docker compose build --progress=plain
   ```

### 계속 멈추면:

- 서버 메모리 확인 및 swap 추가
- Docker Hub 사용 (빌드는 로컬에서, 배포만 서버에서)
- npm 레지스트리 미러 사용

---

이제 다시 배포를 시도해보세요! 🚀

