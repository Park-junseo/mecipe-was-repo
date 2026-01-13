FROM node:20-slim AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.0.0

# Copy package files (for better layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nx.json tsconfig.base.json ./

# Copy source code (only what's needed)
COPY apps/meta-viewer-service ./apps/meta-viewer-service
COPY libs/common ./libs/common

# Install dependencies (monorepo-wide)
RUN pnpm install --frozen-lockfile

# Build the application (from root, Nx handles the workspace)
# WORKDIR을 변경하지 않아야 webpack이 루트의 node_modules를 찾을 수 있음
RUN pnpm build meta-viewer-service --configuration=production

FROM node:20-slim AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.0.0

# Copy package files and workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nx.json tsconfig.base.json ./
COPY apps/meta-viewer-service/package.json ./apps/meta-viewer-service/
COPY libs/common/package.json ./libs/common/

# Install production dependencies only
# This installs root dependencies (@nestjs/common, @nestjs/core, etc.)
# and meta-viewer-service dependencies (express, socket.io, etc.)
# pm2 is in dependencies, so it will be installed
RUN pnpm install --frozen-lockfile --prod

# Install pm2 globally for easier access
RUN npm install -g pm2

# Copy built application
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

# Start the application with pm2-runtime (container-friendly)
# pm2-runtime is designed for Docker containers and handles signals properly
CMD ["pm2-runtime", "start", "dist/apps/meta-viewer-service/main.js", "-i", "3", "--name", "meta-viewer-service"]
