# Nx 설정 완료 가이드

## 생성된 파일들

### 루트 설정 파일
- ✅ `package.json` - pnpm workspace 루트 설정
- ✅ `pnpm-workspace.yaml` - pnpm workspace 구성
- ✅ `nx.json` - Nx 설정
- ✅ `tsconfig.base.json` - 통합 TypeScript 설정
- ✅ `.eslintrc.json` - 통합 ESLint 설정
- ✅ `jest.preset.js` - Jest 프리셋
- ✅ `.prettierrc` - Prettier 설정
- ✅ `.prettierignore` - Prettier 무시 파일
- ✅ `.nxignore` - Nx 무시 파일

### 프로젝트별 설정
- ✅ `apps/place-indexer-service/project.json` - Nx 프로젝트 설정
- ✅ `apps/place-indexer-service/tsconfig.app.json` - 앱 빌드용 TypeScript 설정
- ✅ `apps/place-indexer-service/tsconfig.spec.json` - 테스트용 TypeScript 설정
- ✅ `apps/place-indexer-service/webpack.config.js` - Webpack 설정
- ✅ `apps/place-indexer-service/jest.config.ts` - Jest 설정 (Nx 호환)
- ✅ `mecipe-was/project.json` - Nx 프로젝트 설정
- ✅ `mecipe-was/tsconfig.app.json` - 앱 빌드용 TypeScript 설정
- ✅ `mecipe-was/tsconfig.spec.json` - 테스트용 TypeScript 설정
- ✅ `mecipe-was/webpack.config.js` - Webpack 설정
- ✅ `mecipe-was/jest.config.ts` - Jest 설정 (Nx 호환)

## 다음 단계

### 1. pnpm 설치 및 의존성 설치

```bash
# pnpm 설치 (전역)
npm install -g pnpm

# 또는 corepack 사용
corepack enable
corepack prepare pnpm@latest --activate

# 의존성 설치
pnpm install
```

### 2. Nx 확인

```bash
# Nx 버전 확인
npx nx --version

# 프로젝트 목록 확인
npx nx show projects

# 그래프 확인
npx nx graph
```

### 3. 빌드 테스트

```bash
# 모든 프로젝트 빌드
pnpm build

# 특정 프로젝트 빌드
npx nx build place-indexer-service
npx nx build mecipe-was

# 또는 pnpm 사용
pnpm --filter place-indexer-service build
pnpm --filter mecipe-was build
```

### 4. 테스트 실행

```bash
# 모든 프로젝트 테스트
pnpm test

# 특정 프로젝트 테스트
npx nx test place-indexer-service
npx nx test mecipe-was
```

### 5. 린트 실행

```bash
# 모든 프로젝트 린트
pnpm lint

# 특정 프로젝트 린트
npx nx lint place-indexer-service
npx nx lint mecipe-was
```

## 주요 변경사항

### package.json 스크립트

**이전:**
```json
{
  "scripts": {
    "build": "nest build"
  }
}
```

**이후:**
```json
{
  "scripts": {
    "build": "nx build mecipe-was"
  }
}
```

### TypeScript 설정

- 모든 `tsconfig.json`이 `tsconfig.base.json`을 상속
- `tsconfig.app.json` - 빌드용
- `tsconfig.spec.json` - 테스트용

### 빌드 출력 경로

**이전:**
- `mecipe-was/dist/`
- `apps/place-indexer-service/dist/`

**이후:**
- `dist/mecipe-was/`
- `dist/apps/place-indexer-service/`

## 주의사항

1. **Dockerfile 업데이트 필요**
   - 빌드 출력 경로 변경됨
   - `dist/main.js` → `dist/mecipe-was/main.js`

2. **CI/CD 워크플로우 업데이트 필요**
   - `npm ci` → `pnpm install --frozen-lockfile`
   - 빌드 명령어 변경

3. **환경변수 및 설정**
   - 모든 환경변수는 그대로 유지
   - Prisma 스키마 위치 확인

## 문제 해결

### 빌드 실패 시

```bash
# 캐시 클리어
npx nx reset

# 다시 빌드
pnpm build
```

### 의존성 문제

```bash
# node_modules 재설치
rm -rf node_modules
pnpm install
```

### TypeScript 경로 문제

```bash
# tsconfig.base.json의 paths 확인
cat tsconfig.base.json | grep paths
```

## 다음 마이그레이션 단계

1. ✅ Nx 기본 설정 완료
2. ⏳ 공용 모듈 (libs) 생성
3. ⏳ mecipe-was → apps/search-service 이동
4. ⏳ Dockerfile 업데이트
5. ⏳ CI/CD 워크플로우 업데이트


