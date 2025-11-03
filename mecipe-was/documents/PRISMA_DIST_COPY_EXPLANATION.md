# Prisma 파일을 dist로 복사해야 하는 이유

## 문제 상황

`dist` 폴더를 삭제한 후 서버를 시작하면 다음 에러가 발생:

```
Error: Cannot find module '../../prisma/basic/index.js'
```

## 원인 분석

### Prisma 설정

`prisma/schema.prisma`에서 커스텀 output을 사용:

```prisma
generator client {
  provider = "prisma-client-js"
  output = "./basic"  // 👈 기본 위치가 아닌 커스텀 위치
}
```

이 설정으로 인해 Prisma Client가 `prisma/basic` 폴더에 생성됩니다.

### Import 경로

코드에서 다음과 같이 import:

```typescript
import { Prisma } from 'prisma/basic';
import { PrismaClient } from 'prisma/basic';
```

### 빌드 후 경로 문제

TypeScript 컴파일 후:

**소스 파일:**
- `src/auth/auth.service.ts` → `import { User } from 'prisma/basic'`

**빌드된 파일:**
- `dist/src/auth/auth.service.js` → `require('../../prisma/basic/index.js')`

**문제:**
- 빌드된 파일은 `dist/src/auth/auth.service.js`에서 실행됨
- 상대 경로 `../../prisma/basic/index.js`는 `dist/prisma/basic/index.js`를 가리킴
- 하지만 실제 파일은 `prisma/basic/index.js`에 있음 (dist 밖)

## 왜 이전에는 문제가 없었나?

### 가능한 이유들

1. **`dist` 폴더가 삭제되지 않았음**
   - 개발 중 `dist` 폴더가 계속 유지됨
   - Prisma 파일이 이미 복사되어 있었음
   - 빌드 과정에서 수동으로 복사했거나 다른 프로세스가 복사했을 수 있음

2. **최근에 새로운 코드 추가**
   - `grphql-prisma-parser.util.ts` 등에서 `prisma/basic` import
   - 이전에는 이런 import가 적었을 수 있음

3. **빌드 설정 변경**
   - `nest-cli.json` 또는 `tsconfig.json` 변경
   - 이전에는 자동 복사가 설정되어 있었을 수 있음

## 해결 방법

### 방법 1: nest-cli.json에 assets 추가 (권장)

이미 설정되어 있습니다:

```json
{
  "compilerOptions": {
    "assets": [
      {
        "include": "../prisma/basic/**/*",
        "outDir": "dist",
        "watchAssets": true
      }
    ]
  }
}
```

**장점:**
- NestJS가 자동으로 복사
- Watch 모드에서도 자동 업데이트

### 방법 2: postbuild 스크립트 사용

`package.json`에 추가되어 있습니다:

```json
{
  "scripts": {
    "postbuild": "node scripts/prisma/copy-prisma-to-dist.js"
  }
}
```

**장점:**
- 빌드 후 자동 실행
- 수동 실행 가능 (`npm run copy:prisma`)

### 방법 3: Prisma output을 기본값으로 변경

```prisma
generator client {
  provider = "prisma-client-js"
  // output 제거 → 기본값인 node_modules/@prisma/client 사용
}
```

그리고 import 경로 변경:
```typescript
import { Prisma } from '@prisma/client';
```

**단점:**
- 모든 import 경로 수정 필요
- 기존 코드와 호환성 문제

## 현재 설정 상태

✅ **이미 해결됨:**
1. `nest-cli.json`에 assets 설정 추가
2. `scripts/prisma/copy-prisma-to-dist.js` 스크립트 생성
3. `package.json`에 `postbuild` 및 `copy:prisma` 스크립트 추가

## 주의사항

### Watch 모드에서

`npm run start:dev` 실행 시:
- NestJS가 자동으로 Prisma 파일을 복사해야 함
- 만약 안 되면 수동으로 실행: `npm run copy:prisma`

### 빌드 시

`npm run build` 실행 시:
- `postbuild` 스크립트가 자동으로 Prisma 파일 복사

### 프로덕션 배포 시

Dockerfile을 확인하세요:
```dockerfile
COPY --from=builder /app/prisma ./prisma
```

프로덕션에서는 `prisma` 폴더 전체를 복사하므로 문제 없음.

## 요약

**왜 이전에는 문제가 없었나?**
- `dist` 폴더가 삭제되지 않아서 Prisma 파일이 이미 있었음
- 또는 이전 빌드에서 수동으로 복사되었을 수 있음

**왜 지금 문제가 발생했나?**
- `dist` 폴더를 완전히 삭제함
- 새로운 import 경로가 추가됨 (`grphql-prisma-parser.util.ts`)

**해결책:**
- ✅ `nest-cli.json`에 assets 설정 (자동 복사)
- ✅ `postbuild` 스크립트 (빌드 후 복사)
- ✅ `copy:prisma` 스크립트 (수동 복사)

이제 모든 경우에 대비했습니다!

