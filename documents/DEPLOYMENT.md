# 배포 가이드

이 문서는 VirtualCafe WAS 애플리케이션의 배포 방법을 설명합니다.

## 목차

1. [시스템 아키텍처](#시스템-아키텍처)
2. [사전 요구사항](#사전-요구사항)
3. [초기 설정](#초기-설정)
4. [GitHub Actions를 통한 자동 배포](#github-actions를-통한-자동-배포)
5. [수동 배포](#수동-배포)
6. [SSL 인증서 설정](#ssl-인증서-설정)
7. [트러블슈팅](#트러블슈팅)

---

## 시스템 아키텍처

```
인터넷
  ↓
Nginx (리버스 프록시 + SSL 종료)
  ↓
NestJS Application (Port 4000)
  ↓
PostgreSQL Database (Port 5432)
```

### 주요 구성 요소

- **Nginx**: 리버스 프록시, SSL/TLS 종료, 정적 파일 서빙
- **Let's Encrypt (Certbot)**: 무료 SSL/TLS 인증서 자동 발급 및 갱신
- **NestJS**: 백엔드 API 서버
- **MySQL**: 데이터베이스
- **Docker Compose**: 컨테이너 오케스트레이션

---

## 사전 요구사항

### 서버 요구사항

- Ubuntu 20.04 LTS 이상 (또는 다른 Linux 배포판)
- Docker 20.10 이상
- Docker Compose 2.0 이상
- 최소 2GB RAM, 20GB 디스크 공간 (PostgreSQL용 권장: 4GB RAM)
- 공인 IP 주소와 도메인 이름

### 로컬 개발 환경

- Node.js 20.x
- npm 8.x 이상
- Git

### 네트워크 설정

서버의 방화벽에서 다음 포트를 열어야 합니다:
- **80** (HTTP)
- **443** (HTTPS)
- **22** (SSH, 배포용)

---

## 초기 설정

### 1. 저장소 클론

```bash
cd /app
git clone <repository-url> mecipe-was
cd mecipe-was
```

### 2. 환경 변수 설정

```bash
# env.example을 복사하여 .env 파일 생성
cp env.example .env

# .env 파일 편집
nano .env
```

**필수 설정 항목:**

```env
# 도메인 설정 (실제 도메인으로 변경)
DOMAIN_NAME=api.yourdomain.com
SSL_EMAIL=admin@yourdomain.com

# 데이터베이스 비밀번호 (강력한 비밀번호로 변경)
POSTGRES_DB=mecipe_db
POSTGRES_USER=mecipe_user
POSTGRES_PASSWORD=strong_user_password_here
DATABASE_URL="postgresql://mecipe_user:strong_user_password_here@db:5432/mecipe_db?schema=public"

# JWT 시크릿 (랜덤 문자열로 변경)
JWT_SECRET=your_very_long_random_secret_key_here
```

### 3. Nginx 설정 확인

Nginx는 `.env` 파일의 `DOMAIN_NAME` 환경 변수를 자동으로 사용합니다. 별도의 수동 설정이 필요 없습니다.

### 4. 디렉토리 생성

```bash
# 필수 디렉토리 생성
mkdir -p certbot/conf
mkdir -p certbot/www
mkdir -p mecipe-was/media
mkdir -p backups
```

---

## GitHub Actions를 통한 자동 배포

### 1. GitHub Secrets 설정

GitHub 저장소의 Settings > Secrets and variables > Actions에서 다음 시크릿을 추가합니다:

| Secret 이름 | 설명 | 예시 |
|------------|------|------|
| `SERVER_HOST` | 배포 서버 IP 또는 호스트명 | `123.45.67.89` |
| `SERVER_USERNAME` | SSH 접속 사용자명 | `ubuntu` |
| `SERVER_SSH_KEY` | SSH Private Key | `-----BEGIN RSA PRIVATE KEY-----...` |
| `SERVER_PORT` | SSH 포트 (기본값: 22) | `22` |
| `DOCKER_USERNAME` | Docker Hub 사용자명 (선택) | `yourusername` |
| `DOCKER_PASSWORD` | Docker Hub 비밀번호 (선택) | `yourpassword` |
| `SSL_EMAIL` | Let's Encrypt 이메일 | `admin@yourdomain.com` |
| `DOMAIN_NAME` | 도메인 이름 | `api.yourdomain.com` |

### 2. SSH Key 생성 (서버에서)

```bash
# 배포용 SSH 키 생성
ssh-keygen -t rsa -b 4096 -C "deploy@mecipe-was" -f ~/.ssh/deploy_key

# Public Key를 authorized_keys에 추가
cat ~/.ssh/deploy_key.pub >> ~/.ssh/authorized_keys

# Private Key 내용을 GitHub Secrets에 추가
cat ~/.ssh/deploy_key
```

### 3. 자동 배포 트리거

main 브랜치에 코드를 푸시하면 자동으로 배포가 시작됩니다:

```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

### 4. 배포 상태 확인

- GitHub 저장소의 **Actions** 탭에서 워크플로우 진행 상황을 확인할 수 있습니다.
- 배포가 완료되면 서버에서 다음 명령어로 상태를 확인합니다:

```bash
cd /app/mecipe-was
docker compose ps
docker compose logs -f
```

---

## 수동 배포

GitHub Actions를 사용하지 않고 서버에서 직접 배포하는 방법입니다.

### 1. 배포 스크립트 실행 권한 부여

```bash
chmod +x scripts/deploy.sh
chmod +x scripts/init-ssl.sh
chmod +x scripts/backup-db.sh
```

### 2. 배포 실행

```bash
# 배포 스크립트 실행
./scripts/deploy.sh
```

배포 스크립트는 다음 작업을 수행합니다:
1. Git에서 최신 코드 가져오기
2. Docker 이미지 빌드
3. 기존 컨테이너 중지
4. 새 컨테이너 시작
5. 헬스체크

---

## SSL 인증서 설정

### Let's Encrypt 인증서 초기 발급

**중요**: SSL 인증서를 발급받기 전에 도메인의 DNS가 올바르게 설정되어 있어야 합니다.

```bash
# SSL 초기 설정 스크립트 실행
chmod +x scripts/init-ssl.sh
./scripts/init-ssl.sh
```

스크립트는 다음 작업을 수행합니다:
1. 임시 자체 서명 인증서 생성
2. Nginx 시작
3. Let's Encrypt에서 실제 인증서 발급
4. Nginx 재시작

### 수동으로 인증서 발급

```bash
# Certbot 컨테이너를 사용하여 인증서 발급
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d your-domain.com \
  -d www.your-domain.com

# Nginx 재시작
docker compose restart nginx
```

### 인증서 자동 갱신

Docker Compose 설정에서 Certbot 컨테이너가 12시간마다 자동으로 인증서 갱신을 시도합니다. 인증서가 만료 30일 전이 되면 자동으로 갱신됩니다.

인증서 갱신을 수동으로 테스트하려면:

```bash
# 갱신 테스트 (실제로 갱신하지 않음)
docker compose run --rm certbot renew --dry-run

# 강제 갱신
docker compose run --rm certbot renew --force-renewal
docker compose restart nginx
```

---

## 데이터베이스 관리

### 백업

```bash
# 데이터베이스 백업 실행
./scripts/backup-db.sh
```

백업 파일은 `backups/` 디렉토리에 저장되며, 30일이 지난 백업은 자동으로 삭제됩니다.

### 복원

```bash
# 백업 파일 압축 해제
gunzip backups/db_backup_YYYYMMDD_HHMMSS.sql.gz

# 데이터베이스 복원
docker compose exec -T db psql \
  -U $POSTGRES_USER \
  -d $POSTGRES_DB < backups/db_backup_YYYYMMDD_HHMMSS.sql
```

### 마이그레이션

```bash
# Prisma 마이그레이션 실행
docker compose exec app npx prisma migrate deploy

# 마이그레이션 상태 확인
docker compose exec app npx prisma migrate status
```

---

## Docker 명령어

### 서비스 관리

```bash
# 모든 서비스 시작
docker compose up -d

# 특정 서비스만 시작
docker compose up -d app

# 서비스 중지
docker compose down

# 서비스 재시작
docker compose restart

# 서비스 상태 확인
docker compose ps

# 로그 확인
docker compose logs -f
docker compose logs -f app
docker compose logs -f nginx
```

### 컨테이너 접속

```bash
# NestJS 컨테이너 접속
docker compose exec app sh

# PostgreSQL 컨테이너 접속
docker compose exec db psql -U $POSTGRES_USER -d $POSTGRES_DB

# Nginx 컨테이너 접속
docker compose exec nginx sh
```

### 리소스 정리

```bash
# 사용하지 않는 이미지 삭제
docker image prune -a

# 사용하지 않는 볼륨 삭제 (주의: 데이터 손실 가능)
docker volume prune

# 모든 리소스 정리 (주의: 데이터 손실 가능)
docker system prune -a --volumes
```

---

## 모니터링 및 로그

### 로그 확인

```bash
# 실시간 로그 확인
docker compose logs -f

# 최근 100줄 로그 확인
docker compose logs --tail=100

# 특정 서비스의 로그만 확인
docker compose logs -f app
docker compose logs -f nginx
docker compose logs -f db
```

### 헬스체크

```bash
# 애플리케이션 헬스체크
curl http://localhost/health

# HTTPS 헬스체크
curl https://your-domain.com/health

# 컨테이너 상태 확인
docker compose ps
```

### 리소스 사용량 확인

```bash
# 컨테이너 리소스 사용량
docker stats

# 디스크 사용량
docker system df

# 볼륨 사용량
docker volume ls
```

---

## 트러블슈팅

### 1. SSL 인증서 발급 실패

**증상**: Let's Encrypt 인증서 발급이 실패합니다.

**해결 방법**:
1. 도메인의 DNS가 올바르게 설정되어 있는지 확인:
   ```bash
   nslookup your-domain.com
   ```

2. 포트 80이 외부에서 접근 가능한지 확인:
   ```bash
   curl http://your-domain.com/.well-known/acme-challenge/test
   ```

3. Certbot 로그 확인:
   ```bash
   docker compose logs certbot
   ```

4. Rate limit 확인: Let's Encrypt는 시간당 발급 제한이 있습니다. 테스트 시에는 `--dry-run` 옵션을 사용하세요.

### 2. 데이터베이스 연결 실패

**증상**: 애플리케이션이 데이터베이스에 연결할 수 없습니다.

**해결 방법**:
1. 데이터베이스 컨테이너가 실행 중인지 확인:
   ```bash
   docker compose ps db
   ```

2. 환경 변수가 올바르게 설정되어 있는지 확인:
   ```bash
   cat .env | grep DATABASE_URL
   ```

3. 데이터베이스 로그 확인:
   ```bash
   docker compose logs db
   ```

4. 직접 연결 테스트:
   ```bash
   docker compose exec app sh
   npx prisma db pull
   
   # 또는 PostgreSQL에 직접 연결
   docker compose exec db psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT version();"
   ```

### 3. Nginx 502 Bad Gateway

**증상**: Nginx가 502 Bad Gateway 오류를 반환합니다.

**해결 방법**:
1. 애플리케이션 컨테이너가 실행 중인지 확인:
   ```bash
   docker compose ps app
   ```

2. 애플리케이션 로그 확인:
   ```bash
   docker compose logs app
   ```

3. 네트워크 연결 확인:
   ```bash
   docker compose exec nginx ping app
   ```

4. Nginx 설정 테스트:
   ```bash
   docker compose exec nginx nginx -t
   ```

### 4. 컨테이너가 계속 재시작됨

**증상**: 컨테이너가 계속 재시작되고 안정화되지 않습니다.

**해결 방법**:
1. 컨테이너 로그 확인:
   ```bash
   docker compose logs --tail=100 <service-name>
   ```

2. 헬스체크 상태 확인:
   ```bash
   docker inspect <container-name> | grep Health -A 10
   ```

3. 리소스 부족 확인:
   ```bash
   docker stats
   free -h
   df -h
   ```

### 5. GitHub Actions 배포 실패

**증상**: GitHub Actions 워크플로우가 실패합니다.

**해결 방법**:
1. GitHub Actions 로그 확인
2. GitHub Secrets가 올바르게 설정되어 있는지 확인
3. 서버의 SSH 접속 테스트:
   ```bash
   ssh -i ~/.ssh/deploy_key user@server-ip
   ```

4. 서버에 충분한 디스크 공간이 있는지 확인:
   ```bash
   df -h
   ```

---

## 보안 권장사항

1. **환경 변수**: `.env` 파일을 절대 Git에 커밋하지 마세요.
2. **비밀번호**: 강력한 비밀번호를 사용하세요 (최소 16자, 영문/숫자/특수문자 혼합).
3. **SSH**: SSH 키 기반 인증을 사용하고, 비밀번호 인증은 비활성화하세요.
4. **방화벽**: 필요한 포트만 열고 나머지는 차단하세요.
5. **업데이트**: 정기적으로 Docker 이미지와 패키지를 업데이트하세요.
6. **백업**: 정기적으로 데이터베이스를 백업하세요.
7. **모니터링**: 로그를 주기적으로 확인하고 이상 징후를 모니터링하세요.

---

## 성능 최적화

### 1. Nginx 캐싱

정적 파일에 대한 캐싱이 이미 설정되어 있습니다. 추가로 API 응답 캐싱이 필요한 경우 `nginx/conf.d/default.conf`를 수정하세요.

### 2. 데이터베이스 인덱스

Prisma 스키마에서 자주 조회되는 필드에 인덱스를 추가하세요:

```prisma
model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  name  String
  
  @@index([email])
}
```

### 3. Connection Pool

환경 변수에서 데이터베이스 connection pool 설정:

```env
DATABASE_URL="postgresql://user:pass@db:5432/mydb?schema=public&connection_limit=10&pool_timeout=30"
```

### 4. Docker 리소스 제한

필요시 `docker-compose.yml`에서 리소스 제한을 설정:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          memory: 512M
```

---

## 추가 리소스

- [NestJS 공식 문서](https://nestjs.com/)
- [Docker Compose 문서](https://docs.docker.com/compose/)
- [Let's Encrypt 문서](https://letsencrypt.org/docs/)
- [Nginx 문서](https://nginx.org/en/docs/)
- [Prisma 문서](https://www.prisma.io/docs/)

---

## 문의 및 지원

문제가 발생하거나 질문이 있는 경우:
1. GitHub Issues에 문제를 등록하세요
2. 로그 파일과 오류 메시지를 함께 첨부해주세요
3. 사용 중인 환경 정보(OS, Docker 버전 등)를 포함해주세요

