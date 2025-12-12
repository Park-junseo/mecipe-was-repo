# Nx + pnpm 마이그레이션 가이드

## 개요

현재 프로젝트를 Nx monorepo로 전환하고 pnpm을 패키지 매니저로 사용하기 위한 준비사항 및 마이그레이션 계획입니다.

## 현재 구조

```
virtualcafe-was-repo/
├── apps/
│   └── place-indexer-service/    # NestJS 앱
│       ├── package.json
│       ├── package-lock.json
│       ├── node_modules/
│       ├── tsconfig.json
│       ├── tsconfig.build.json
│       ├── eslint.config.mjs
│       └── nest-cli.json
├── mecipe-was/                    # NestJS 앱
│   ├── package.json
│   ├── package-lock.json
│   ├── node_modules/
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   ├── .eslintrc.js
│   └── nest-cli.json
└── (기타 파일들)
```

## 마이그레이션 목표 구조

```
virtualcafe-was-repo/
├── apps/
│   ├── place-indexer-service/    # 기존 유지
│   ├── search-service/           # mecipe-was에서 이동 예정
│   └── mecipe-was/              # (임시, 나중에 제거)
├── libs/                         # 공용 모듈
│   ├── common/                  # 공통 유틸리티
│   ├── database/                # Prisma 등 DB 관련
│   └── ...
├── package.json                  # 루트 workspace 설정
├── pnpm-workspace.yaml          # pnpm workspace 설정
├── nx.json                       # Nx 설정
├── tsconfig.base.json           # 통합 TypeScript 설정
├── .eslintrc.json               # 통합 ESLint 설정
└── pnpm-lock.yaml               # pnpm lock 파일
```

## 준비사항 체크리스트

### 1. 기존 파일 정리

```bash
# 기존 node_modules 제거
rm -rf apps/place-indexer-service/node_modules
rm -rf mecipe-was/node_modules
rm -rf load-tests/node_modules

# 기존 package-lock.json 제거
rm -f apps/place-indexer-service/package-lock.json
rm -f mecipe-was/package-lock.json
rm -f load-tests/package-lock.json

# 기존 dist 폴더 정리 (선택사항)
rm -rf apps/place-indexer-service/dist
rm -rf mecipe-was/dist
```

### 2. pnpm 설치

```bash
# pnpm 전역 설치
npm install -g pnpm

# 또는 corepack 사용 (Node.js 16.13+)
corepack enable
corepack prepare pnpm@latest --activate
```

### 3. 루트 package.json 생성

```json
{
  "name": "virtualcafe-was-repo",
  "version": "1.0.0",
  "private": true,
  "description": "Virtual Cafe WAS Monorepo",
  "scripts": {
    "build": "nx run-many --target=build --all",
    "test": "nx run-many --target=test --all",
    "lint": "nx run-many --target=lint --all",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "prepare": "husky install || true"
  },
  "devDependencies": {
    "@nx/devkit": "^20.0.0",
    "@nx/eslint": "^20.0.0",
    "@nx/jest": "^20.0.0",
    "@nx/node": "^20.0.0",
    "@nx/nest": "^20.0.0",
    "@nx/workspace": "^20.0.0",
    "@types/node": "^20.0.0",
    "eslint": "^9.0.0",
    "nx": "^20.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.9.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

### 4. pnpm-workspace.yaml 생성

```yaml
packages:
  - 'apps/*'
  - 'libs/*'
  - 'mecipe-was'  # 임시, 나중에 제거
```

### 5. Nx 초기화

```bash
# Nx 초기화
npx create-nx-workspace@latest . --preset=apps --packageManager=pnpm --nxCloud=skip

# 또는 수동으로 nx.json 생성
```

### 6. 통합 tsconfig.base.json 생성

```json
{
  "compileOnSave": false,
  "compilerOptions": {
    "rootDir": ".",
    "sourceMap": true,
    "declaration": false,
    "moduleResolution": "node",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "importHelpers": true,
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "skipLibCheck": true,
    "skipDefaultLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@virtualcafe/common": ["libs/common/src/index.ts"],
      "@virtualcafe/database": ["libs/database/src/index.ts"],
      "@virtualcafe/place-indexer-service": ["apps/place-indexer-service/src/index.ts"],
      "@virtualcafe/search-service": ["apps/search-service/src/index.ts"]
    },
    "strict": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "strictPropertyInitialization": false,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "exclude": ["node_modules", "tmp", "dist"]
}
```

### 7. 통합 ESLint 설정

```json
// .eslintrc.json (루트)
{
  "root": true,
  "ignorePatterns": ["**/*"],
  "plugins": ["@nx"],
  "overrides": [
    {
      "files": ["*.ts", "*.tsx", "*.js", "*.jsx"],
      "rules": {
        "@nx/enforce-module-boundaries": [
          "error",
          {
            "enforceBuildableLibDependency": true,
            "allow": [],
            "depConstraints": [
              {
                "sourceTag": "*",
                "onlyDependOnLibsWithTags": ["*"]
              }
            ]
          }
        ]
      }
    },
    {
      "files": ["*.ts", "*.tsx"],
      "extends": ["plugin:@nx/typescript"],
      "rules": {}
    },
    {
      "files": ["*.js", "*.jsx"],
      "extends": ["plugin:@nx/javascript"],
      "rules": {}
    }
  ]
}
```

### 8. 각 앱의 tsconfig.json 업데이트

```json
// apps/place-indexer-service/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2022",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

### 9. Dockerfile 업데이트 (pnpm 사용)

```dockerfile
# mecipe-was/Dockerfile
FROM node:20-slim AS builder

WORKDIR /app

# pnpm 설치
RUN npm install -g pnpm

# OpenSSL 설치
RUN apt-get update -y && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

# 루트 package.json 및 pnpm-workspace.yaml 복사
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY nx.json tsconfig.base.json ./

# 앱별 package.json 복사
COPY apps/place-indexer-service/package.json ./apps/place-indexer-service/
COPY mecipe-was/package.json ./mecipe-was/

# 의존성 설치
RUN pnpm install --frozen-lockfile

# 소스 코드 복사
COPY . .

# Prisma Client 생성
RUN pnpm --filter mecipe-was prisma

# 빌드
RUN pnpm --filter mecipe-was build

FROM node:20-slim

RUN apt-get update -y && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 프로덕션 의존성만 설치
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY mecipe-was/package.json ./mecipe-was/
RUN pnpm install --prod --frozen-lockfile --filter mecipe-was

COPY --from=builder /app/mecipe-was/dist ./mecipe-was/dist
COPY --from=builder /app/mecipe-was/prisma ./mecipe-was/prisma

ENV NODE_ENV=production

WORKDIR /app/mecipe-was

CMD ["sh", "-c", "npx prisma migrate deploy && pnpm start:prod"]
```

### 10. CI/CD 워크플로우 업데이트

```yaml
# .github/workflows/deploy-helm.yml 수정
- name: Install dependencies
  run: |
    npm install -g pnpm
    pnpm install --frozen-lockfile

- name: Build application
  run: |
    pnpm --filter mecipe-was build

- name: Build place-indexer-service
  run: |
    pnpm --filter place-indexer-service build
```

## mecipe-was → apps/search-service 마이그레이션

### 고려사항

1. **경로 변경**
   - `mecipe-was/` → `apps/search-service/`
   - 모든 import 경로 업데이트 필요

2. **package.json 이름 변경**
   ```json
   {
     "name": "@virtualcafe/search-service",
     "version": "1.0.0"
   }
   ```

3. **Dockerfile 경로 업데이트**
   - `mecipe-was/Dockerfile` → `apps/search-service/Dockerfile`
   - COPY 경로 수정

4. **Helm 차트 업데이트**
   - `helm/mecipe-instance-a/values.yaml`에서 이미지 경로 변경
   - `mecipeWAS` → `searchService`로 변경

5. **환경변수 및 설정**
   - 모든 환경변수는 그대로 유지
   - Prisma 스키마 위치 확인

### 마이그레이션 단계

```bash
# 1. apps/search-service 디렉토리 생성
mkdir -p apps/search-service

# 2. mecipe-was 내용 복사
cp -r mecipe-was/* apps/search-service/

# 3. package.json 이름 변경
# apps/search-service/package.json에서 name 수정

# 4. tsconfig.json 경로 수정
# extends 경로: "../../tsconfig.base.json"

# 5. Dockerfile 경로 수정
# COPY 경로들 업데이트

# 6. 테스트
pnpm --filter search-service build
pnpm --filter search-service test

# 7. mecipe-was 제거 (모든 것이 정상 작동 확인 후)
rm -rf mecipe-was
```

## 공용 모듈 (libs) 구조

### libs/common/

공통 유틸리티, 데코레이터, 가드 등

```
libs/common/
├── src/
│   ├── decorators/
│   ├── guards/
│   ├── interceptors/
│   ├── pipes/
│   └── utils/
├── package.json
└── tsconfig.json
```

### libs/database/

Prisma 클라이언트, 스키마 등

```
libs/database/
├── src/
│   └── prisma/
├── prisma/
│   └── schema.prisma
├── package.json
└── tsconfig.json
```

## 마이그레이션 순서

1. ✅ **1단계: 기초 설정**
   - pnpm 설치
   - 루트 package.json 생성
   - pnpm-workspace.yaml 생성
   - 기존 node_modules, package-lock.json 제거

2. ✅ **2단계: Nx 설정**
   - Nx 초기화
   - nx.json 생성
   - 통합 tsconfig.base.json 생성
   - 통합 ESLint 설정

3. ✅ **3단계: 앱 마이그레이션**
   - apps/place-indexer-service를 Nx 프로젝트로 변환
   - mecipe-was를 Nx 프로젝트로 변환
   - 각 앱의 tsconfig.json 업데이트

4. ✅ **4단계: 공용 모듈 생성**
   - libs/common 생성
   - libs/database 생성 (Prisma)
   - 공용 코드 이동

5. ✅ **5단계: mecipe-was → apps/search-service**
   - 디렉토리 이동
   - 경로 업데이트
   - Dockerfile 업데이트
   - Helm 차트 업데이트

6. ✅ **6단계: CI/CD 업데이트**
   - GitHub Actions 워크플로우 수정
   - Docker 빌드 스크립트 수정

7. ✅ **7단계: 테스트 및 검증**
   - 모든 앱 빌드 테스트
   - 테스트 실행
   - Docker 이미지 빌드 테스트

## 주의사항

1. **Prisma 스키마 위치**
   - 현재: `mecipe-was/prisma/schema.prisma`
   - 옵션 1: `libs/database/prisma/schema.prisma` (권장)
   - 옵션 2: `apps/search-service/prisma/schema.prisma` (유지)

2. **환경변수**
   - 모든 환경변수는 그대로 유지
   - `.env` 파일 위치 확인

3. **Docker 빌드 컨텍스트**
   - 루트에서 빌드하도록 변경 필요
   - `.dockerignore` 업데이트

4. **Git 히스토리**
   - 대규모 리팩토링이므로 별도 브랜치에서 진행 권장
   - 단계별 커밋 권장

## 참고 자료

- [Nx 공식 문서](https://nx.dev)
- [pnpm 공식 문서](https://pnpm.io)
- [Nx + NestJS 가이드](https://nx.dev/nx-api/nest)
- [pnpm workspace 가이드](https://pnpm.io/workspaces)

