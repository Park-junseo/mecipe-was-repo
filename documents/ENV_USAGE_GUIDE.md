# 환경 변수 사용 가이드

이 문서는 `.env` 파일의 환경 변수가 어떻게 NestJS 애플리케이션으로 전달되는지 설명합니다.

## 환경 변수 전달 흐름

```
1. .env 파일 생성 (GitHub Actions 또는 수동)
   ↓
2. Docker Compose가 .env 읽기
   ↓
3. docker-compose.yml의 ${변수명} 치환
   ↓
4. environment 섹션을 통해 컨테이너에 전달
   ↓
5. NestJS에서 process.env.변수명으로 접근
```

## 설정 방법

### 1. `.env` 파일 작성

루트 디렉토리에 `.env` 파일 생성:

```env
# 애플리케이션
NODE_ENV=production
PORT=4000
SOCKET_PORT=4100

# 데이터베이스
DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public"

# JWT
JWT_SECRET=your_secret_key
SECRET_LOGIN_CRYPTO=your_crypto_key

# API Keys
API_KEY=your_api_key
BUILD_API_KEY=your_build_api_key

# Secret Keys
COUPON_SECRET=your_coupon_secret
PRODUCT_SECRET=your_product_secret
```

### 2. `docker-compose.yml` 설정

**중요**: `.env`의 모든 환경 변수를 `app` 서비스의 `environment`에 명시해야 합니다!

```yaml
services:
  app:
    environment:
      # .env 파일의 변수를 컨테이너로 전달
      - NODE_ENV=${NODE_ENV:-production}
      - PORT=${PORT:-4000}
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - SECRET_LOGIN_CRYPTO=${SECRET_LOGIN_CRYPTO}
      - API_KEY=${API_KEY}
      - BUILD_API_KEY=${BUILD_API_KEY}
      - COUPON_SECRET=${COUPON_SECRET}
      - PRODUCT_SECRET=${PRODUCT_SECRET}
```

### 3. NestJS에서 사용

#### ConfigModule 사용 (권장)

`app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', // Docker에서는 process.env 사용
    }),
  ],
})
export class AppModule {}
```

서비스에서 사용:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getConfig() {
    const port = this.configService.get<number>('PORT');
    const dbUrl = this.configService.get<string>('DATABASE_URL');
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    
    return { port, dbUrl, jwtSecret };
  }
}
```

#### 직접 접근

```typescript
// main.ts
const port = process.env.PORT || 4000;
const socketPort = process.env.SOCKET_PORT || 4100;

await app.listen(port);

// 서비스에서
const apiKey = process.env.API_KEY;
const couponSecret = process.env.COUPON_SECRET;
```

## Docker 환경에서의 주의사항

### ❌ 잘못된 방법: .env 파일만 생성

```yaml
# 이렇게 하면 안 됩니다!
services:
  app:
    # environment 없음 - NestJS가 변수에 접근 불가!
```

### ✅ 올바른 방법: environment로 전달

```yaml
services:
  app:
    environment:
      - DATABASE_URL=${DATABASE_URL}  # .env에서 읽어서 전달
```

### env_file 사용 (대안)

`.env` 파일 전체를 컨테이너에 전달:

```yaml
services:
  app:
    env_file:
      - .env
```

**하지만** 이 방법은 `.env`의 모든 변수가 노출되므로 권장하지 않습니다. 필요한 변수만 명시적으로 전달하는 것이 안전합니다.

## 환경 변수 확인 방법

### 로컬에서 확인

```bash
# .env 파일 확인
cat .env

# Docker Compose 설정 확인 (변수 치환 결과)
docker compose config

# 컨테이너 내부에서 확인
docker compose exec app printenv
docker compose exec app printenv DATABASE_URL
docker compose exec app printenv JWT_SECRET
```

### NestJS에서 확인

디버깅용 엔드포인트 추가:

```typescript
// app.controller.ts (개발 환경에서만!)
@Get('env-check')
getEnvCheck() {
  if (process.env.NODE_ENV === 'production') {
    throw new ForbiddenException('Not allowed in production');
  }
  
  return {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL ? '***configured***' : undefined,
    JWT_SECRET: process.env.JWT_SECRET ? '***configured***' : undefined,
  };
}
```

## GitHub Actions에서의 환경 변수

### Workflow에서 .env 생성

`.github/workflows/deploy-self-hosted.yml`:

```yaml
- name: Create .env file
  run: |
    cat > .env << 'EOF'
    NODE_ENV=production
    PORT=${{ secrets.PORT || 4000 }}
    DATABASE_URL=${{ secrets.DATABASE_URL }}
    JWT_SECRET=${{ secrets.JWT_SECRET }}
    SECRET_LOGIN_CRYPTO=${{ secrets.SECRET_LOGIN_CRYPTO }}
    API_KEY=${{ secrets.API_KEY }}
    BUILD_API_KEY=${{ secrets.BUILD_API_KEY }}
    COUPON_SECRET=${{ secrets.COUPON_SECRET }}
    PRODUCT_SECRET=${{ secrets.PRODUCT_SECRET }}
    EOF
```

### GitHub Secrets 설정

Repository > Settings > Secrets and variables > Actions

| Secret 이름 | 설명 |
|-------------|------|
| `PORT` | 애플리케이션 포트 (기본: 4000) |
| `SOCKET_PORT` | WebSocket 포트 (기본: 4100) |
| `DATABASE_URL` | PostgreSQL 연결 URL |
| `JWT_SECRET` | JWT 시크릿 키 |
| `SECRET_LOGIN_CRYPTO` | 로그인 암호화 키 |
| `API_KEY` | API 키 |
| `BUILD_API_KEY` | 빌드 API 키 |
| `COUPON_SECRET` | 쿠폰 시크릿 |
| `PRODUCT_SECRET` | 상품 시크릿 |

## 환경별 설정

### 개발 환경 (.env.development)

```env
NODE_ENV=development
PORT=4000
SOCKET_PORT=4100
DATABASE_URL="postgresql://postgres:password@localhost:5432/mecipe_dev?schema=public"
JWT_SECRET=dev_secret_not_for_production
SECRET_LOGIN_CRYPTO=dev_crypto_key
API_KEY=dev_api_key
BUILD_API_KEY=dev_build_key
COUPON_SECRET=dev_coupon_secret
PRODUCT_SECRET=dev_product_secret
```

### 프로덕션 환경 (.env)

```env
NODE_ENV=production
PORT=4000
SOCKET_PORT=4100
DATABASE_URL="postgresql://user:strong_password@db-host:5432/mecipe_db?schema=public"
JWT_SECRET=very_long_random_production_secret_key
SECRET_LOGIN_CRYPTO=production_crypto_key
API_KEY=production_api_key
BUILD_API_KEY=production_build_key
COUPON_SECRET=production_coupon_secret
PRODUCT_SECRET=production_product_secret
```

## 환경 변수 검증

### Joi를 사용한 검증 (권장)

```typescript
// src/config/validation.ts
import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(4000),
  SOCKET_PORT: Joi.number().default(4100),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  SECRET_LOGIN_CRYPTO: Joi.string().required(),
  API_KEY: Joi.string().optional(),
  BUILD_API_KEY: Joi.string().optional(),
  COUPON_SECRET: Joi.string().required(),
  PRODUCT_SECRET: Joi.string().required(),
});

// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
    }),
  ],
})
export class AppModule {}
```

### 수동 검증

```typescript
// main.ts
async function bootstrap() {
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'SECRET_LOGIN_CRYPTO',
    'COUPON_SECRET',
    'PRODUCT_SECRET',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Environment variable ${envVar} is required but not set`);
    }
  }

  const app = await NestJS.create(AppModule);
  await app.listen(process.env.PORT || 4000);
}
```

## 트러블슈팅

### 문제: NestJS에서 환경 변수가 undefined

**원인**: `docker-compose.yml`의 `environment`에 변수가 없음

**해결**:
```yaml
services:
  app:
    environment:
      - YOUR_VAR=${YOUR_VAR}  # 추가!
```

### 문제: Docker Compose에서 변수가 치환되지 않음

**원인**: `.env` 파일이 없거나 잘못된 위치

**해결**:
```bash
# 루트 디렉토리에 .env 파일이 있는지 확인
ls -la .env

# Docker Compose config로 확인
docker compose config
```

### 문제: 민감한 정보가 로그에 노출

**해결**: 환경 변수를 직접 출력하지 말고 마스킹하세요

```typescript
console.log({
  DATABASE_URL: process.env.DATABASE_URL ? '***configured***' : 'not set',
  JWT_SECRET: process.env.JWT_SECRET ? '***configured***' : 'not set',
});
```

## 보안 권장사항

1. **.env 파일을 Git에 커밋하지 않기**
   ```gitignore
   .env
   .env.*
   !.env.example
   ```

2. **프로덕션에서는 강력한 비밀번호 사용**
   ```bash
   # 랜덤 시크릿 생성
   openssl rand -base64 32
   ```

3. **환경 변수를 코드에 하드코딩하지 않기**
   ```typescript
   // ❌ 나쁜 예
   const secret = 'my-secret-key';
   
   // ✅ 좋은 예
   const secret = process.env.JWT_SECRET;
   ```

4. **민감한 정보는 로그에 출력하지 않기**

5. **ConfigService를 통해 타입 안전성 확보**

## 참고 자료

- [NestJS Configuration](https://docs.nestjs.com/techniques/configuration)
- [Docker Compose Environment Variables](https://docs.docker.com/compose/environment-variables/)
- [The Twelve-Factor App: Config](https://12factor.net/config)

