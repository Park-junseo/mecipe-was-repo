FROM node:20-slim AS builder

WORKDIR /app

# Debian에서 Prisma 실행을 위한 OpenSSL 설치
RUN apt-get update -y && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# npm ci 실행 (타임아웃 설정 및 로깅 개선)
RUN npm ci --prefer-offline --no-audit --progress=true

COPY . .

# Prisma Client 생성 (필수!)
RUN npx prisma generate

# NestJS 빌드
RUN npm run build

FROM node:20-slim

# 프로덕션 이미지에도 OpenSSL 필요
RUN apt-get update -y && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# 환경변수 설정
ENV NODE_ENV=production

# 헬스체크 추가 (선택사항)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:${PORT:-4000}/hello', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 시작 스크립트: 마이그레이션 실행 후 앱 시작
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]