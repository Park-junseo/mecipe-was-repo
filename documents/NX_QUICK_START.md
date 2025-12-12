# Nx 빠른 시작 가이드

## 설치

```bash
# pnpm 설치
npm install -g pnpm
# 또는
corepack enable && corepack prepare pnpm@latest --activate

# 의존성 설치
pnpm install
```

## 기본 명령어

### 프로젝트 확인

```bash
# 프로젝트 목록
npx nx show projects

# 의존성 그래프
npx nx graph
```

### 빌드

```bash
# 모든 프로젝트
pnpm build

# 특정 프로젝트
npx nx build place-indexer-service
npx nx build mecipe-was
```

### 개발 서버

```bash
# place-indexer-service
npx nx serve place-indexer-service

# mecipe-was
npx nx serve mecipe-was
```

### 테스트

```bash
# 모든 프로젝트
pnpm test

# 특정 프로젝트
npx nx test place-indexer-service
npx nx test mecipe-was
```

### 린트

```bash
# 모든 프로젝트
pnpm lint

# 특정 프로젝트
npx nx lint place-indexer-service
npx nx lint mecipe-was
```

## 생성된 파일 구조

```
.
├── package.json              # 루트 workspace 설정
├── pnpm-workspace.yaml       # pnpm workspace 구성
├── nx.json                   # Nx 설정
├── tsconfig.base.json        # 통합 TypeScript 설정
├── .eslintrc.json            # 통합 ESLint 설정
├── jest.preset.js            # Jest 프리셋
├── apps/
│   └── place-indexer-service/
│       ├── project.json      # Nx 프로젝트 설정
│       ├── tsconfig.json     # tsconfig.base.json 상속
│       ├── tsconfig.app.json # 빌드용 설정
│       ├── tsconfig.spec.json # 테스트용 설정
│       └── jest.config.ts    # Jest 설정
└── mecipe-was/
    ├── project.json          # Nx 프로젝트 설정
    ├── tsconfig.json         # tsconfig.base.json 상속
    ├── tsconfig.app.json     # 빌드용 설정
    ├── tsconfig.spec.json    # 테스트용 설정
    └── jest.config.ts        # Jest 설정
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
2. ⏳ `pnpm install` 실행
3. ⏳ 빌드 테스트
4. ⏳ 공용 모듈 (libs) 생성
5. ⏳ mecipe-was → apps/search-service 이동


