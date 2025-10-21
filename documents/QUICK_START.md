# 빠른 시작 가이드

이 가이드는 VirtualCafe WAS를 최대한 빠르게 배포하는 방법을 설명합니다.

## 전체 과정 요약 (5단계)

1. 서버 준비 및 저장소 클론
2. 환경 변수 설정
3. SSL 인증서 발급
4. 애플리케이션 실행
5. GitHub Actions 설정 (자동 배포)

---

## 1단계: 서버 준비

### 서버 요구사항 확인

- Ubuntu 20.04 LTS 이상
- Docker 및 Docker Compose 설치
- 도메인 이름 및 DNS 설정 완료
- 포트 80, 443 오픈

### Docker 설치 (미설치 시)

```bash
# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 현재 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER

# Docker Compose 설치
sudo apt-get update
sudo apt-get install docker-compose-plugin -y

# 설치 확인
docker --version
docker compose version
```

### 저장소 클론

```bash
# 작업 디렉토리 생성
sudo mkdir -p /app
sudo chown $USER:$USER /app
cd /app

# Git 설치 (미설치 시)
sudo apt-get install git -y

# 저장소 클론
git clone <your-repository-url> mecipe-was
cd mecipe-was
```

---

## 2단계: 환경 변수 설정

### .env 파일 생성

```bash
# 예시 파일 복사
cp env.example .env

# .env 파일 편집
nano .env
```

### 필수 설정 변경

```env
# 실제 도메인으로 변경
DOMAIN_NAME=api.yourdomain.com
SSL_EMAIL=admin@yourdomain.com

# 강력한 비밀번호로 변경
POSTGRES_DB=mecipe_db
POSTGRES_USER=mecipe_user
POSTGRES_PASSWORD=change_this_to_strong_password

# DATABASE_URL도 비밀번호와 일치하도록 변경
DATABASE_URL="postgresql://mecipe_user:change_this_to_strong_password@db:5432/mecipe_db?schema=public"

# JWT 시크릿 변경 (랜덤 문자열)
JWT_SECRET=change_this_to_very_long_random_string_at_least_32_characters
```

**💡 팁**: 강력한 비밀번호 생성:
```bash
# 32자 랜덤 문자열 생성
openssl rand -base64 32
```

### Nginx 설정 확인

Nginx는 환경 변수를 자동으로 사용하므로 별도 설정이 필요 없습니다. `.env`의 `DOMAIN_NAME`이 자동 적용됩니다.

---

## 3단계: SSL 인증서 발급

### DNS 확인 (중요!)

Let's Encrypt 인증서를 발급받기 전에 도메인의 DNS가 올바르게 설정되어 있어야 합니다.

```bash
# DNS 확인
nslookup api.yourdomain.com

# 또는
dig api.yourdomain.com
```

서버의 IP 주소가 올바르게 나오는지 확인하세요.

### SSL 초기 설정 실행

```bash
# 스크립트 실행 권한 부여
chmod +x scripts/init-ssl.sh

# SSL 초기 설정 실행
./scripts/init-ssl.sh
```

이 스크립트는 자동으로:
1. 필요한 디렉토리 생성
2. 임시 인증서 생성 및 Nginx 시작
3. Let's Encrypt 실제 인증서 발급
4. Nginx 재시작

### 수동 SSL 설정 (스크립트 실패 시)

```bash
# 디렉토리 생성
mkdir -p certbot/conf certbot/www

# 임시 Nginx 시작 (HTTP만)
docker compose up -d nginx

# 인증서 발급
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d api.yourdomain.com

# Nginx 재시작
docker compose restart nginx
```

---

## 4단계: 애플리케이션 실행

### Docker Compose로 전체 스택 시작

```bash
# 모든 서비스 시작
docker compose up -d

# 서비스 상태 확인
docker compose ps

# 로그 확인
docker compose logs -f
```

### 헬스체크

```bash
# HTTP 헬스체크
curl http://localhost/health

# HTTPS 헬스체크 (도메인)
curl https://api.yourdomain.com/health

# 예상 응답: OK
```

### 서비스 확인

```bash
# 실행 중인 컨테이너 확인
docker compose ps

# 예상 출력:
# mecipe-app      Up
# mecipe-nginx    Up
# mecipe-db       Up
# mecipe-certbot  Up
```

---

## 5단계: GitHub Actions 설정 (자동 배포)

### SSH Key 생성

```bash
# 배포용 SSH 키 생성 (서버에서 실행)
ssh-keygen -t rsa -b 4096 -C "deploy@mecipe" -f ~/.ssh/mecipe_deploy

# Public Key를 authorized_keys에 추가
cat ~/.ssh/mecipe_deploy.pub >> ~/.ssh/authorized_keys

# 권한 설정
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh

# Private Key 내용 출력 (GitHub Secrets에 추가할 내용)
cat ~/.ssh/mecipe_deploy
```

### GitHub Secrets 설정

GitHub 저장소 > Settings > Secrets and variables > Actions > New repository secret

다음 시크릿들을 추가하세요:

| Secret 이름 | 값 | 설명 |
|------------|-----|------|
| `SERVER_HOST` | `123.45.67.89` | 서버 IP 주소 |
| `SERVER_USERNAME` | `ubuntu` | SSH 사용자명 |
| `SERVER_SSH_KEY` | `-----BEGIN RSA...` | Private Key 전체 내용 |
| `SERVER_PORT` | `22` | SSH 포트 (기본값) |
| `SSL_EMAIL` | `admin@yourdomain.com` | SSL 이메일 |
| `DOMAIN_NAME` | `api.yourdomain.com` | 도메인 이름 |

### 자동 배포 테스트

```bash
# 테스트 커밋
git add .
git commit -m "Test CI/CD deployment"
git push origin main
```

GitHub Actions 탭에서 워크플로우 진행 상황을 확인할 수 있습니다.

---

## 완료! 🎉

이제 다음이 완료되었습니다:

- ✅ Docker로 애플리케이션 실행
- ✅ Nginx 리버스 프록시 설정
- ✅ Let's Encrypt SSL/TLS 인증서 발급
- ✅ GitHub Actions CI/CD 파이프라인 구성

### 접속 확인

```bash
# API 헬스체크
curl https://api.yourdomain.com/health

# 브라우저에서 접속
# https://api.yourdomain.com
```

---

## 다음 단계

### 1. 정기 백업 설정

```bash
# 백업 스크립트 실행 권한
chmod +x scripts/backup-db.sh

# Cron으로 매일 새벽 2시 백업 (선택사항)
crontab -e
# 다음 라인 추가:
# 0 2 * * * cd /app/mecipe-was && ./scripts/backup-db.sh >> /var/log/backup.log 2>&1
```

### 2. 모니터링 설정

로그를 주기적으로 확인하세요:

```bash
# 실시간 로그 확인
docker compose logs -f

# 오류만 필터링
docker compose logs | grep -i error

# 리소스 사용량 모니터링
docker stats
```

### 3. 방화벽 설정

```bash
# UFW 설치 및 설정 (Ubuntu)
sudo apt-get install ufw -y
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

### 4. 성능 최적화

필요시 `docker-compose.yml`에서 리소스 제한을 조정하세요.

---

## 자주 사용하는 명령어

```bash
# 서비스 재시작
docker compose restart

# 특정 서비스만 재시작
docker compose restart app

# 로그 확인
docker compose logs -f app

# 컨테이너 접속
docker compose exec app sh

# 서비스 중지
docker compose down

# 서비스 시작
docker compose up -d

# 데이터베이스 백업
./scripts/backup-db.sh

# 배포 (수동)
./scripts/deploy.sh
```

---

## 문제 해결

### SSL 인증서 발급 실패

```bash
# Certbot 로그 확인
docker compose logs certbot

# DNS 확인
nslookup api.yourdomain.com

# 포트 80 접근 가능 여부 확인
curl http://api.yourdomain.com/.well-known/acme-challenge/test
```

### 데이터베이스 연결 실패

```bash
# DB 컨테이너 상태 확인
docker compose ps db

# DB 로그 확인
docker compose logs db

# DB 접속 테스트
docker compose exec db psql -U $POSTGRES_USER -d $POSTGRES_DB
```

### 502 Bad Gateway

```bash
# 앱 컨테이너 상태 확인
docker compose ps app

# 앱 로그 확인
docker compose logs app

# 네트워크 연결 테스트
docker compose exec nginx ping app
```

더 자세한 트러블슈팅은 [DEPLOYMENT.md](DEPLOYMENT.md#트러블슈팅)를 참조하세요.

---

## 도움이 필요하신가요?

- 📚 [전체 배포 가이드](DEPLOYMENT.md)
- 📖 [README](README.md)
- 🐛 [GitHub Issues](https://github.com/yourusername/virtualcafe-was-repo/issues)

