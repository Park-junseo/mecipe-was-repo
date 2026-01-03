FROM node:20-slim AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.0.0

# Install OpenSSL (required for some native modules)
RUN apt-get update -y && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

# Copy package files (for better layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nx.json tsconfig.base.json ./

# Copy source code (only what's needed)
COPY apps/place-indexer-service ./apps/place-indexer-service
COPY libs/common ./libs/common

# Install dependencies (monorepo-wide)
RUN pnpm install --frozen-lockfile

# Build the application (from root, Nx handles the workspace)
# WORKDIR을 루트로 되돌려야 webpack이 루트의 node_modules를 찾을 수 있음
RUN pnpm build place-indexer-service --configuration=production

FROM node:20-slim AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.0.0

# Install OpenSSL (required for some native modules)
RUN apt-get update -y && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

# Copy package files and workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nx.json tsconfig.base.json ./
COPY apps/place-indexer-service/package.json ./apps/place-indexer-service/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/apps/place-indexer-service/main.js"]
