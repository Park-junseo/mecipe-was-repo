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

# 앱별 package.json 복사
COPY mecipe-was/package.json ./mecipe-was/

# 의존성 설치 (모노레포 전체)
RUN pnpm install --frozen-lockfile

# Prisma 스키마 및 소스 코드 복사
COPY mecipe-was/prisma ./mecipe-was/prisma
COPY mecipe-was ./mecipe-was

# Prisma Client 생성 (필수!)
# 모노레포에서는 루트에서 실행해야 루트 node_modules를 사용할 수 있음
WORKDIR /app
RUN rm -rf mecipe-was/prisma/basic && \
    pnpm exec prisma generate --schema=./mecipe-was/prisma/schema.prisma

# Nx 빌드 실행
# 모노레포에서는 루트 node_modules의 @nestjs/cli를 사용해야 함
WORKDIR /app
RUN cd mecipe-was && \
    pnpm exec nest build

FROM node:20-slim

# 프로덕션 이미지에도 OpenSSL 필요
RUN apt-get update -y && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

# pnpm 설치
RUN npm install -g pnpm@9.0.0

WORKDIR /app

# 프로덕션 의존성만 설치
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nx.json tsconfig.base.json ./
COPY mecipe-was/package.json ./mecipe-was/

# 프로덕션 의존성만 설치
RUN pnpm install --frozen-lockfile --prod

# 빌드된 파일 및 Prisma 복사
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/mecipe-was/prisma ./mecipe-was/prisma

# 환경변수 설정
ENV NODE_ENV=production

# 시작 스크립트: 마이그레이션 실행 후 앱 시작
# Nx 빌드 출력 경로에 맞게 실행
CMD ["sh", "-c", "cd mecipe-was && npx prisma migrate deploy && cd .. && node dist/mecipe-was/src/main.js"]