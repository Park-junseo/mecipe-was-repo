FROM node:20-slim AS builder

WORKDIR /app

# pnpm 설치
RUN npm install -g pnpm@9.0.0

# Debian에서 Prisma 실행을 위한 OpenSSL 설치
RUN apt-get update -y && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

# 모노레포 루트 파일들 복사
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nx.json tsconfig.base.json ./

# 앱별 package.json 및 기타 필요한 파일 복사 (통째로 복사)
COPY mecipe-was ./mecipe-was

# 의존성 설치 (모노레포 전체)
RUN pnpm install --frozen-lockfile

WORKDIR /app/mecipe-was

# # Prisma Client 생성 (빌드 전에 필수)
# # 모노레포에서는 루트에서 실행하고 --schema로 스키마 경로 지정
RUN npx prisma generate --schema=./prisma/schema.prisma

# Nx 빌드 실행
RUN pnpm build --configuration=production

FROM node:20-slim
WORKDIR /app

RUN npm install -g pnpm@9.0.0 prisma@6.19.0
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# 🔥 런타임에서 다시 설치 (production only)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nx.json tsconfig.base.json ./
COPY mecipe-was/package.json ./mecipe-was/

# pnpm 모노레포 전체를 프로덕션 모드로 설치
# 루트의 공통 의존성(@nestjs/common, @nestjs/core 등)과 
# mecipe-was의 의존성(express 등) 모두 설치됨
RUN pnpm install --prod --frozen-lockfile

# 빌드 산출물만 복사
COPY --from=builder /app/dist ./dist
# Prisma schema 및 migrations 복사 (migrate deploy에 필요)
COPY mecipe-was/prisma/schema.prisma ./mecipe-was/prisma/schema.prisma
COPY mecipe-was/prisma/migrations ./mecipe-was/prisma/migrations
# Builder에서 생성된 Prisma Client 및 네이티브 바이너리 복사
# (Query Engine, Schema Engine 등이 포함되어 있음)
COPY --from=builder /app/mecipe-was/prisma/basic ./mecipe-was/prisma/basic

ENV NODE_ENV=production

CMD ["sh", "-c", "set -e && echo 'Running Prisma migrate deploy...' && prisma migrate deploy --schema=./mecipe-was/prisma/schema.prisma && echo 'Starting application...' && node dist/mecipe-was/main.js"]
