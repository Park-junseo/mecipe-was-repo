FROM node:20-slim AS builder

WORKDIR /app

# pnpm 설치
RUN npm install -g pnpm@9.0.0

# OpenSSL 설치 (Prisma 필요)
RUN apt-get update -y && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

# 모노레포 루트 파일들 복사
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nx.json tsconfig.base.json ./

# 앱별 package.json 및 기타 필요한 파일 복사 (통째로 복사)
COPY apps/place-indexer-service ./apps/place-indexer-service

# 의존성 설치 (모노레포 전체)
RUN pnpm install --frozen-lockfile
RUN pnpm recursive rebuild --filter=place-indexer-service

# Nx 빌드 실행
RUN pnpm build place-indexer-service --configuration=production

FROM node:20-slim
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# pnpm 설치
RUN npm install -g pnpm@9.0.0

# 프로덕션 의존성만 설치
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nx.json tsconfig.base.json ./
COPY apps/place-indexer-service/package.json ./apps/place-indexer-service/

RUN pnpm install --prod --frozen-lockfile

# 빌드된 파일 복사
COPY --from=builder /app/dist ./dist

# 환경변수 설정
ENV NODE_ENV=production

# 빌드된 파일이 dist/apps/place-indexer-service에 있으므로 직접 node로 실행
CMD ["node", "dist/apps/place-indexer-service/main.js"]
