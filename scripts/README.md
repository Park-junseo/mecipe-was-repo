# 배포 스크립트 가이드

이 디렉토리에는 배포 및 관리에 필요한 스크립트들이 포함되어 있습니다.

## 스크립트 목록

### 1. init-ssl.sh
SSL 인증서 초기 설정 스크립트

**사용법:**
```bash
chmod +x scripts/init-ssl.sh
./scripts/init-ssl.sh
```

**기능:**
- Let's Encrypt 인증서 발급
- Nginx 설정 업데이트
- 임시 자체 서명 인증서 생성
- 실제 인증서로 교체

**사전 요구사항:**
- `.env` 파일에 `DOMAIN_NAME`과 `SSL_EMAIL` 설정
- DNS가 서버 IP를 가리키도록 설정
- 포트 80이 외부에서 접근 가능

### 2. deploy.sh
수동 배포 스크립트

**사용법:**
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

**기능:**
- Git에서 최신 코드 가져오기
- Docker 이미지 빌드
- 기존 컨테이너 중지
- 새 컨테이너 시작
- 헬스체크

**사용 시나리오:**
- GitHub Actions 없이 수동 배포
- 긴급 배포
- 테스트 배포

### 3. backup-db.sh
데이터베이스 백업 스크립트

**사용법:**
```bash
chmod +x scripts/backup-db.sh
./scripts/backup-db.sh
```

**기능:**
- MySQL 데이터베이스 덤프
- Gzip 압축
- 타임스탬프 파일명
- 30일 이상 오래된 백업 자동 삭제

**백업 파일 위치:**
```
backups/db_backup_YYYYMMDD_HHMMSS.sql.gz
```

**복원 방법:**
```bash
# 압축 해제
gunzip backups/db_backup_YYYYMMDD_HHMMSS.sql.gz

# 복원
docker compose exec -T db psql \
  -U $POSTGRES_USER \
  -d $POSTGRES_DB < backups/db_backup_YYYYMMDD_HHMMSS.sql
```

## 자동화

### Cron으로 정기 백업 설정

```bash
# Crontab 편집
crontab -e

# 매일 새벽 2시에 백업
0 2 * * * cd /app/mecipe-was && ./scripts/backup-db.sh >> /var/log/backup.log 2>&1

# 매주 일요일 새벽 3시에 백업
0 3 * * 0 cd /app/mecipe-was && ./scripts/backup-db.sh >> /var/log/backup.log 2>&1
```

### 백업 로그 확인

```bash
tail -f /var/log/backup.log
```

## 문제 해결

### 스크립트 실행 권한 오류

```bash
# 모든 스크립트에 실행 권한 부여
chmod +x scripts/*.sh

# 또는 개별적으로
chmod +x scripts/init-ssl.sh
chmod +x scripts/deploy.sh
chmod +x scripts/backup-db.sh
```

### .env 파일을 찾을 수 없음

```bash
# .env 파일이 있는지 확인
ls -la .env

# 없다면 생성
cp env.example .env
nano .env
```

### Docker 명령어 권한 오류

```bash
# 현재 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER

# 로그아웃 후 다시 로그인
# 또는
newgrp docker
```

## 스크립트 커스터마이징

### 백업 보관 기간 변경

`backup-db.sh` 파일에서:

```bash
# 30일 → 60일로 변경
find $BACKUP_DIR -name "*.sql.gz" -type f -mtime +60 -delete
```

### 배포 전 추가 작업

`deploy.sh` 파일에 다음과 같은 작업을 추가할 수 있습니다:

```bash
# 배포 전 백업
./scripts/backup-db.sh

# 배포 전 테스트
npm test

# 배포 전 알림
curl -X POST https://hooks.slack.com/... -d "Deploying..."
```

## 모범 사례

1. **배포 전 백업**: 항상 배포 전에 데이터베이스를 백업하세요.
2. **테스트 환경**: 먼저 테스트 환경에서 스크립트를 실행해보세요.
3. **로그 확인**: 스크립트 실행 후 항상 로그를 확인하세요.
4. **권한 관리**: 스크립트에 민감한 정보를 포함하지 마세요.
5. **버전 관리**: 스크립트 변경 사항을 Git으로 관리하세요.

## 추가 스크립트 (필요시 작성)

### 로그 정리 스크립트

```bash
#!/bin/bash
# scripts/cleanup-logs.sh

# 7일 이상 오래된 로그 삭제
find /var/log/app -name "*.log" -type f -mtime +7 -delete

echo "Logs cleaned up"
```

### 헬스체크 스크립트

```bash
#!/bin/bash
# scripts/health-check.sh

DOMAIN=$DOMAIN_NAME

if curl -f https://$DOMAIN/health > /dev/null 2>&1; then
    echo "✅ Service is healthy"
    exit 0
else
    echo "❌ Service is down"
    exit 1
fi
```

### SSL 인증서 갱신 스크립트

```bash
#!/bin/bash
# scripts/renew-ssl.sh

cd /app/mecipe-was

# SSL 인증서 갱신
docker compose run --rm certbot renew

# Nginx 재시작
docker compose restart nginx

echo "SSL certificate renewed"
```

## 참고 자료

- [Bash 스크립팅 가이드](https://www.gnu.org/software/bash/manual/)
- [Cron 표현식](https://crontab.guru/)
- [Docker 명령어](https://docs.docker.com/engine/reference/commandline/cli/)

