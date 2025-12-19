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

# 앱별 package.json 복사
COPY apps/place-indexer-service/package.json ./apps/place-indexer-service/

# 의존성 설치 (모노레포 전체)
RUN pnpm install --frozen-lockfile

# 소스 코드 복사
COPY apps/place-indexer-service ./apps/place-indexer-service

# Nx 빌드 실행
RUN pnpm nx build place-indexer-service

FROM node:20-slim

RUN apt-get update -y && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# pnpm 설치
RUN npm install -g pnpm@9.0.0

# 프로덕션 의존성만 설치
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nx.json tsconfig.base.json ./
COPY apps/place-indexer-service/package.json ./apps/place-indexer-service/

# 프로덕션 의존성만 설치
RUN pnpm install --frozen-lockfile --prod

# 빌드된 파일 복사
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

# Nx 빌드 출력 경로에 맞게 실행
CMD ["node", "dist/apps/place-indexer-service/src/main.js"]

