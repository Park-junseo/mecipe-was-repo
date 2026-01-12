FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nx.json tsconfig.base.json ./

# Copy source code (only what's needed for api-gateway)
COPY apps/api-gateway ./apps/api-gateway
COPY libs/common ./libs/common

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the application (from root, Nx handles the workspace)
# WORKDIR을 루트로 되돌려야 webpack이 루트의 node_modules를 찾을 수 있음
RUN pnpm build api-gateway --configuration=production   

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy package files and workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nx.json tsconfig.base.json ./
COPY apps/api-gateway/package.json ./apps/api-gateway/
COPY libs/common/package.json ./libs/common/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Install pm2 globally for easier access
# api-gateway doesn't have pm2 in dependencies, so install it globally
RUN npm install -g pm2

# Copy built application (only dist, not node_modules)
COPY --from=base /app/dist ./dist

# Expose port
EXPOSE 3000

ENV NODE_ENV=production

# Start the application with pm2-runtime (container-friendly)
# pm2-runtime is designed for Docker containers and handles signals properly
# api-gateway typically doesn't need clustering, but using pm2 for consistency
CMD ["pm2-runtime", "start", "dist/apps/api-gateway/main.js", "--name", "api-gateway"]




