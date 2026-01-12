FROM node:20-slim AS builder

WORKDIR /app

# pnpm 설치
RUN npm install -g pnpm@9.0.0 prisma@6.19.0

# Debian에서 Prisma 실행을 위한 OpenSSL 설치
RUN apt-get update -y && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

# Copy package files (for better layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nx.json tsconfig.base.json ./

# Copy source code (only what's needed)
COPY apps/place-api-service ./apps/place-api-service
COPY libs/common ./libs/common

# Install dependencies (monorepo-wide)
RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/place-api-service

# Prisma Client generation (required before build)
# Schema path is relative to current working directory
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build the application (from root, Nx handles the workspace)
# WORKDIR을 루트로 되돌려야 webpack이 루트의 node_modules를 찾을 수 있음
WORKDIR /app
RUN pnpm build place-api-service --configuration=production

FROM node:20-slim AS production

WORKDIR /app

# Install pnpm and Prisma CLI
RUN npm install -g pnpm@9.0.0 prisma@6.19.0

# Install OpenSSL for Prisma (required on Debian)
RUN apt-get update -y && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

# Copy package files and workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nx.json tsconfig.base.json ./
COPY apps/place-api-service/package.json ./apps/place-api-service/
COPY libs/common/package.json ./libs/common/

# Install production dependencies only
# This installs root dependencies (@nestjs/common, @nestjs/core, etc.)
# and place-api-service dependencies (express, etc.)
# pm2 is in dependencies, so it will be installed
RUN pnpm install --frozen-lockfile --prod

# Install pm2 globally for easier access
RUN npm install -g pm2

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy Prisma files (required for migrate deploy and runtime)
COPY apps/place-api-service/prisma/schema.prisma ./apps/place-api-service/prisma/schema.prisma
COPY apps/place-api-service/prisma/migrations ./apps/place-api-service/prisma/migrations

# Copy generated Prisma Client and native binaries from builder
# (includes Query Engine, Schema Engine, etc.)
COPY --from=builder /app/apps/place-api-service/prisma/basic ./apps/place-api-service/prisma/basic

ENV NODE_ENV=production

# Run migrations and start the application with pm2-runtime (container-friendly)
# pm2-runtime is designed for Docker containers and handles signals properly
# -i 2: Start 2 instances (clustering mode)
CMD ["sh", "-c", "set -e && echo 'Running Prisma migrate deploy...' && prisma migrate deploy --schema=./apps/place-api-service/prisma/schema.prisma && echo 'Starting application with PM2...' && pm2-runtime start dist/apps/place-api-service/main.js -i 2 --name place-api-service"]
