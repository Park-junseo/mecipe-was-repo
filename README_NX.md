# Nx Monorepo 설정 완료

## 설치 및 실행

### 1. pnpm 설치

```bash
# 전역 설치
npm install -g pnpm

# 또는 corepack 사용 (Node.js 16.13+)
corepack enable
corepack prepare pnpm@latest --activate
```

### 2. 의존성 설치

```bash
pnpm install
```

### 3. 프로젝트 확인

```bash
# 프로젝트 목록 확인
npx nx show projects

# 의존성 그래프 확인
npx nx graph
```

## 사용 방법

### 빌드

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

### 개발 서버 실행

```bash
# place-indexer-service 개발 서버
npx nx serve place-indexer-service

# mecipe-was 개발 서버
npx nx serve mecipe-was
```

### 테스트

```bash
# 모든 프로젝트 테스트
pnpm test

# 특정 프로젝트 테스트
npx nx test place-indexer-service
npx nx test mecipe-was
```

### 린트

```bash
# 모든 프로젝트 린트
pnpm lint

# 특정 프로젝트 린트
npx nx lint place-indexer-service
npx nx lint mecipe-was
```

## 주요 변경사항

### 빌드 출력 경로

- **이전**: `apps/place-indexer-service/dist/`, `mecipe-was/dist/`
- **이후**: `dist/apps/place-indexer-service/`, `dist/mecipe-was/`

### package.json 스크립트

각 앱의 `package.json`에서:
- `build`: `nx build <project-name>`
- `start`: `nx serve <project-name>`
- `test`: `nx test <project-name>`
- `lint`: `nx lint <project-name>`

## 다음 단계

1. ✅ Nx 기본 설정 완료
2. ⏳ 공용 모듈 (libs) 생성
3. ⏳ mecipe-was → apps/search-service 이동
4. ⏳ Dockerfile 업데이트
5. ⏳ CI/CD 워크플로우 업데이트


