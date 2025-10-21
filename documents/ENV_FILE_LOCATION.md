# .env 파일 위치 가이드

NestJS에서 환경 변수를 사용하는 방법은 실행 환경에 따라 다릅니다.

## 1. Docker Compose 환경 (프로덕션 - 현재 설정)

### 파일 구조

```
virtualcafe-was-repo/
├── .env                          ← Docker Compose용 (필수)
├── docker-compose.yml
├── nginx/
└── mecipe-was/
    ├── src/
    ├── package.json
    └── .env                      ← 불필요! (Docker에서는 안 읽음)
```

### 동작 방식

```
┌─────────────────────────────────────────────────────────┐
│  .env (루트 디렉토리)                                      │
│  JWT_SECRET=my_secret                                   │
│  DATABASE_URL=postgresql://...                          │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│  docker-compose.yml                                     │
│  environment:                                           │
│    - JWT_SECRET=${JWT_SECRET}    ← .env에서 치환        │
│    - DATABASE_URL=${DATABASE_URL}                       │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│  NestJS Container                                       │
│  process.env.JWT_SECRET = "my_secret"  ✅               │
│  process.env.DATABASE_URL = "postgresql://..."  ✅      │
└─────────────────────────────────────────────────────────┘
```

### 설정 방법

#### 1. 루트에 .env 파일 생성

```bash
# 프로젝트 루트 (docker-compose.yml과 같은 위치)
cat > .env << 'EOF'
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=your_secret_key
COUPON_SECRET=your_coupon_secret
PRODUCT_SECRET=your_product_secret
EOF
```

#### 2. docker-compose.yml에서 전달 (이미 설정됨)

```yaml
services:
  app:
    environment:
      - JWT_SECRET=${JWT_SECRET}      # .env에서 읽어서 전달
      - DATABASE_URL=${DATABASE_URL}
      - COUPON_SECRET=${COUPON_SECRET}
```

#### 3. NestJS에서 사용

```typescript
// ConfigModule 설정 필요 없음! (환경 변수로 이미 전달됨)
const jwtSecret = process.env.JWT_SECRET;
const dbUrl = process.env.DATABASE_URL;
```

### 주의사항

❌ **mecipe-was/.env는 읽히지 않습니다!**
- Docker 컨테이너는 빌드 시 소스 코드를 복사하지만, .env는 .dockerignore에 의해 제외됩니다.
- 환경 변수는 docker-compose.yml의 `environment` 섹션을 통해서만 전달됩니다.

---

## 2. 로컬 개발 환경 (Docker 없이)

### 파일 구조

```
virtualcafe-was-repo/
├── .env                          ← Docker Compose용 (선택)
├── docker-compose.yml
└── mecipe-was/
    ├── .env                      ← NestJS가 읽는 파일 (필수!)
    ├── src/
    ├── package.json
    └── nest-cli.json
```

### 동작 방식

```
┌─────────────────────────────────────────────────────────┐
│  mecipe-was/.env                                        │
│  JWT_SECRET=dev_secret                                  │
│  DATABASE_URL=postgresql://localhost:5432/db            │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│  @nestjs/config (ConfigModule)                          │
│  envFilePath: '.env'                                    │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│  NestJS Application                                     │
│  process.env.JWT_SECRET = "dev_secret"  ✅              │
│  process.env.DATABASE_URL = "postgresql://..."  ✅      │
└─────────────────────────────────────────────────────────┘
```

### 설정 방법

#### 1. mecipe-was/.env 파일 생성

```bash
cd mecipe-was

cat > .env << 'EOF'
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://postgres:password@localhost:5432/mecipe_dev
JWT_SECRET=dev_secret_not_for_production
SECRET_LOGIN_CRYPTO=dev_crypto_key
API_KEY=dev_api_key
COUPON_SECRET=dev_coupon_secret
PRODUCT_SECRET=dev_product_secret
EOF
```

#### 2. ConfigModule 설정 (app.module.ts)

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',  // mecipe-was/.env 읽기
    }),
  ],
})
export class AppModule {}
```

#### 3. 실행

```bash
cd mecipe-was
npm run start:dev
```

---

## 3. 환경별 .env 파일 관리

### 다중 .env 파일

```
mecipe-was/
├── .env                  # 기본 (로컬 개발)
├── .env.development      # 개발 환경
├── .env.production       # 프로덕션 (Docker에서는 사용 안 함)
└── .env.test             # 테스트 환경
```

### ConfigModule 설정

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV}`,  // .env.development, .env.production
        '.env',                           // 기본값
      ],
    }),
  ],
})
export class AppModule {}
```

### 실행 방법

```bash
# 개발 환경
NODE_ENV=development npm run start:dev

# 프로덕션 환경 (로컬 테스트)
NODE_ENV=production npm run start:prod

# 테스트 환경
NODE_ENV=test npm run test
```

---

## 4. 파일 위치 비교표

| 환경 | .env 파일 위치 | 읽는 방법 | NestJS에서 접근 |
|------|---------------|----------|----------------|
| **Docker Compose** | `프로젝트루트/.env` | Docker Compose → environment | `process.env.*` ✅ |
| **로컬 개발** | `mecipe-was/.env` | @nestjs/config | `process.env.*` ✅ |
| **GitHub Actions** | GitHub Secrets → .env 생성 | Docker Compose → environment | `process.env.*` ✅ |

---

## 5. 실전 예제

### 시나리오 1: Docker Compose로 실행

```bash
# 1. 루트에 .env 파일 생성
cat > .env << 'EOF'
PORT=4000
JWT_SECRET=production_secret
DATABASE_URL=postgresql://user:pass@db-host:5432/mecipe_db
EOF

# 2. Docker Compose 실행
docker compose up -d

# 3. 컨테이너에서 확인
docker compose exec app printenv JWT_SECRET
# 출력: production_secret ✅
```

### 시나리오 2: 로컬에서 개발

```bash
# 1. mecipe-was/.env 파일 생성
cd mecipe-was
cat > .env << 'EOF'
PORT=4000
JWT_SECRET=dev_secret
DATABASE_URL=postgresql://postgres:password@localhost:5432/mecipe_dev
EOF

# 2. NestJS 실행
npm run start:dev

# 3. 코드에서 확인
console.log(process.env.JWT_SECRET);
// 출력: dev_secret ✅
```

---

## 6. .dockerignore 설정

**.dockerignore** 파일에서 `.env` 제외:

```
node_modules
.env              # Docker 빌드 시 제외
.env.*            # 모든 .env 파일 제외
!.env.example     # .env.example만 포함
dist
*.log
```

**이유**: 
- .env 파일은 빌드 시 포함하지 않음
- 환경 변수는 docker-compose.yml의 `environment`로 전달
- 보안상 민감한 정보가 이미지에 포함되지 않도록

---

## 7. .gitignore 설정

**.gitignore**에 .env 파일 추가:

```
# Environment variables
.env
.env.*
!.env.example
!env.example

# Dependencies
node_modules/

# Build
dist/
```

---

## 8. 트러블슈팅

### 문제 1: Docker에서 환경 변수가 undefined

**원인**: .env 파일이 루트가 아닌 mecipe-was/에 있음

**해결**:
```bash
# .env 파일을 루트로 이동
mv mecipe-was/.env .env
```

### 문제 2: 로컬 개발에서 환경 변수가 undefined

**원인**: mecipe-was/.env 파일이 없음

**해결**:
```bash
# mecipe-was/.env 생성
cd mecipe-was
cp .env.example .env
```

### 문제 3: ConfigModule에서 .env를 찾을 수 없음

**원인**: envFilePath 설정이 잘못됨

**해결**:
```typescript
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: '.env',  // 상대 경로 (mecipe-was/.env)
})
```

### 문제 4: Docker와 로컬에서 다른 값 사용

**해결**: 환경별로 다른 파일 사용

```bash
# Docker (프로덕션)
루트/.env → DATABASE_URL=postgresql://production-host/db

# 로컬 (개발)
mecipe-was/.env → DATABASE_URL=postgresql://localhost/dev_db
```

---

## 9. 베스트 프랙티스

### ✅ 권장사항

1. **Docker 환경**
   - `.env` 파일은 루트에 위치
   - `docker-compose.yml`의 `environment`에 명시적으로 나열
   - GitHub Secrets로 민감한 정보 관리

2. **로컬 개발**
   - `mecipe-was/.env` 파일 사용
   - `.env.example`을 복사하여 시작
   - ConfigModule로 로드

3. **보안**
   - `.env` 파일은 절대 Git에 커밋하지 않기
   - `.env.example`로 템플릿 제공
   - 프로덕션 비밀번호는 강력하게

4. **문서화**
   - `env.example`에 모든 필수 변수 나열
   - 각 변수의 용도를 주석으로 설명

### ❌ 피해야 할 것

1. `.env` 파일을 여러 곳에 중복 생성
2. 민감한 정보를 코드에 하드코딩
3. Docker 이미지에 .env 파일 포함
4. 프로덕션과 개발 환경에서 같은 .env 사용

---

## 10. 요약

| 환경 | .env 위치 | 사용 목적 |
|------|-----------|----------|
| **프로덕션 (Docker)** | `프로젝트루트/.env` | Docker Compose가 읽어서 컨테이너에 전달 |
| **로컬 개발** | `mecipe-was/.env` | NestJS ConfigModule이 직접 읽음 |
| **CI/CD** | GitHub Actions에서 생성 | Secrets → .env → Docker |

**핵심**: 
- Docker 사용 시: **루트/.env** + docker-compose.yml의 environment
- 로컬 개발 시: **mecipe-was/.env** + ConfigModule

현재 프로젝트는 Docker Compose 기반이므로 **루트 디렉토리의 .env 파일**을 사용합니다! 🎯

