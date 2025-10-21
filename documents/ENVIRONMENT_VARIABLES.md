# 환경 변수 가이드

이 문서는 프로젝트에서 사용하는 모든 환경 변수를 설명합니다.

## 환경 변수 파일

프로젝트는 `.env` 파일을 사용하여 환경 변수를 관리합니다.

```bash
# .env 파일 생성
cp env.example .env

# .env 파일 편집
nano .env
```

## 필수 환경 변수

### 애플리케이션 설정

| 변수명 | 설명 | 기본값 | 예시 |
|--------|------|--------|------|
| `NODE_ENV` | 실행 환경 | `production` | `development`, `production` |
| `PORT` | NestJS 애플리케이션 포트 | `4000` | `4000` |

### 도메인 설정

| 변수명 | 설명 | 기본값 | 예시 |
|--------|------|--------|------|
| `DOMAIN_NAME` | 서비스 도메인 (Nginx 자동 적용) | - | `api.yourdomain.com` |
| `SSL_EMAIL` | Let's Encrypt 인증서 이메일 | - | `admin@yourdomain.com` |

**중요**: `DOMAIN_NAME`은 Nginx 설정에 자동으로 적용됩니다. 수동으로 설정 파일을 수정할 필요가 없습니다.

### 데이터베이스 설정 (PostgreSQL)

| 변수명 | 설명 | 기본값 | 예시 |
|--------|------|--------|------|
| `POSTGRES_DB` | 데이터베이스 이름 | `mecipe_db` | `mecipe_db` |
| `POSTGRES_USER` | 데이터베이스 사용자 | `mecipe_user` | `mecipe_user` |
| `POSTGRES_PASSWORD` | 데이터베이스 비밀번호 | - | `strong_password_123` |
| `DATABASE_URL` | Prisma 연결 URL | - | `postgresql://user:pass@db:5432/db?schema=public` |

**DATABASE_URL 형식:**
```
postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]?schema=public
```

### 인증 설정

| 변수명 | 설명 | 기본값 | 예시 |
|--------|------|--------|------|
| `JWT_SECRET` | JWT 토큰 시크릿 키 | - | `your_32_character_secret_key` |
| `API_KEY` | API Key (선택사항) | - | `your_api_key` |

## 환경별 설정

### 개발 환경 (.env.development)

```env
NODE_ENV=development
PORT=4000
DOMAIN_NAME=localhost
DATABASE_URL="postgresql://mecipe_user:password@localhost:5432/mecipe_db?schema=public"
JWT_SECRET=dev_secret_key_for_testing_only
```

### 프로덕션 환경 (.env.production 또는 .env)

```env
NODE_ENV=production
PORT=4000
DOMAIN_NAME=api.yourdomain.com
SSL_EMAIL=admin@yourdomain.com

POSTGRES_DB=mecipe_db
POSTGRES_USER=mecipe_user
POSTGRES_PASSWORD=your_strong_production_password
DATABASE_URL="postgresql://mecipe_user:your_strong_production_password@db:5432/mecipe_db?schema=public"

JWT_SECRET=your_very_long_random_production_secret_key
```

## Docker Compose에서 환경 변수 사용

Docker Compose는 자동으로 `.env` 파일을 읽어 환경 변수를 적용합니다.

### 직접 환경 변수 전달

```yaml
services:
  nginx:
    environment:
      - DOMAIN_NAME=${DOMAIN_NAME}
  
  app:
    environment:
      - NODE_ENV=${NODE_ENV}
      - PORT=${PORT}
      - DATABASE_URL=${DATABASE_URL}
```

### env_file 사용

```yaml
services:
  app:
    env_file:
      - .env
```

## GitHub Actions Secrets

CI/CD에서 사용하는 환경 변수는 GitHub Secrets로 관리합니다.

### 필수 Secrets

GitHub Repository > Settings > Secrets and variables > Actions

| Secret 이름 | 설명 | 예시 |
|-------------|------|------|
| `SERVER_HOST` | 배포 서버 IP | `123.45.67.89` |
| `SERVER_USERNAME` | SSH 사용자명 | `ubuntu` |
| `SERVER_SSH_KEY` | SSH Private Key | `-----BEGIN RSA PRIVATE KEY-----...` |
| `SERVER_PORT` | SSH 포트 | `22` |
| `DOMAIN_NAME` | 도메인 이름 | `api.yourdomain.com` |
| `SSL_EMAIL` | SSL 인증서 이메일 | `admin@yourdomain.com` |

### 선택적 Secrets

| Secret 이름 | 설명 | 용도 |
|-------------|------|------|
| `DOCKER_USERNAME` | Docker Hub 사용자명 | Docker 이미지 푸시 |
| `DOCKER_PASSWORD` | Docker Hub 비밀번호 | Docker 이미지 푸시 |

## 환경 변수 검증

### 애플리케이션 시작 전 검증

```bash
# 필수 환경 변수 확인 스크립트
#!/bin/bash

required_vars=(
  "DOMAIN_NAME"
  "DATABASE_URL"
  "JWT_SECRET"
  "POSTGRES_PASSWORD"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "Error: $var is not set"
    exit 1
  fi
done

echo "All required environment variables are set"
```

### NestJS에서 검증

```typescript
// src/config/validation.ts
import { plainToClass } from 'class-transformer';
import { IsString, IsNumber, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  NODE_ENV: string;

  @IsNumber()
  PORT: number;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  JWT_SECRET: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(
    EnvironmentVariables,
    config,
    { enableImplicitConversion: true },
  );

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
```

## 보안 모범 사례

### 1. .env 파일 보호

```bash
# .env 파일 권한 설정
chmod 600 .env

# Git에서 제외 (.gitignore에 추가)
echo ".env" >> .gitignore
```

### 2. 강력한 비밀번호 생성

```bash
# 32자 랜덤 비밀번호 생성
openssl rand -base64 32

# 또는
cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1
```

### 3. 환경별 분리

개발, 스테이징, 프로덕션 환경마다 다른 값을 사용하세요:

```bash
.env.development    # 개발 환경
.env.staging        # 스테이징 환경
.env.production     # 프로덕션 환경 (또는 .env)
```

### 4. 민감한 정보 암호화

프로덕션 환경에서는 민감한 정보를 암호화하여 저장:

- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault
- Google Cloud Secret Manager

## 환경 변수 디버깅

### 현재 환경 변수 확인

```bash
# 모든 환경 변수 출력
docker compose exec app env

# 특정 변수만 확인
docker compose exec app printenv DATABASE_URL
docker compose exec app printenv DOMAIN_NAME

# Nginx 환경 변수 확인
docker compose exec nginx printenv DOMAIN_NAME
```

### 환경 변수가 적용되지 않을 때

1. `.env` 파일 존재 확인
   ```bash
   ls -la .env
   ```

2. 파일 형식 확인 (BOM 제거)
   ```bash
   dos2unix .env  # Windows에서 생성한 경우
   ```

3. Docker Compose 재시작
   ```bash
   docker compose down
   docker compose up -d
   ```

4. 환경 변수 로드 확인
   ```bash
   docker compose config
   ```

## Nginx 환경 변수 동작 원리

Nginx는 기본적으로 환경 변수를 직접 읽지 못하므로, `envsubst`를 사용하여 템플릿을 처리합니다:

### 1. 템플릿 파일 (default.conf.template)
```nginx
server_name ${DOMAIN_NAME} www.${DOMAIN_NAME};
ssl_certificate /etc/letsencrypt/live/${DOMAIN_NAME}/fullchain.pem;
```

### 2. Entrypoint 스크립트 (docker-entrypoint.sh)
```bash
envsubst '${DOMAIN_NAME}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf
```

### 3. Docker Compose에서 환경 변수 전달
```yaml
nginx:
  environment:
    - DOMAIN_NAME=${DOMAIN_NAME}
```

이렇게 하면 Nginx 시작 시 자동으로 환경 변수가 치환됩니다.

## 환경 변수 우선순위

1. `docker-compose.yml`에서 직접 지정한 값
2. `.env` 파일의 값
3. 시스템 환경 변수
4. Dockerfile의 ENV 값

## 추가 환경 변수

프로젝트 요구사항에 따라 추가할 수 있는 환경 변수:

### 로깅
```env
LOG_LEVEL=info
LOG_FILE=/var/log/app/app.log
```

### Redis (캐싱용)
```env
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```

### S3 (파일 스토리지)
```env
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

### SMTP (이메일)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your_app_password
```

## 참고 자료

- [Docker Compose 환경 변수](https://docs.docker.com/compose/environment-variables/)
- [NestJS Configuration](https://docs.nestjs.com/techniques/configuration)
- [12-Factor App: Config](https://12factor.net/config)
- [envsubst 문서](https://www.gnu.org/software/gettext/manual/html_node/envsubst-Invocation.html)

