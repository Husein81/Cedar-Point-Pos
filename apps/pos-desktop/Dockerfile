# ==============================================================================
# Base Stage - Node 20.x with pnpm
# ==============================================================================
FROM node:20.18.1-alpine AS base

# Set pnpm version explicitly
ENV PNPM_VERSION=10.26.1
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Install pnpm using npm (more reliable than corepack prepare)
RUN npm install -g pnpm@${PNPM_VERSION}

WORKDIR /app

# ==============================================================================
# Pruner Stage - Extract only what's needed for POS using Turbo
# ==============================================================================
FROM base AS pruner

# Install Turbo globally
RUN pnpm add -g turbo@2.6.1

# Copy entire monorepo
COPY . .

# Prune to only include POS dependencies and related packages
RUN turbo prune pos-desktop --docker

# ==============================================================================
# Dependencies Stage - Install all dependencies
# ==============================================================================
FROM base AS deps

# Install native build tools (for better-sqlite3, etc.)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

# Copy pruned lockfile and package.json files
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Install dependencies (frozen lockfile for deterministic builds)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline

# Copy full source code
COPY --from=pruner /app/out/full/ .

# ==============================================================================
# Development Stage - For local development with hot reload
# ==============================================================================
FROM deps AS dev

WORKDIR /app

ENV NODE_ENV=development

# Expose Vite dev server port
EXPOSE 5173

WORKDIR /app/apps/pos-desktop

# Default command (can be overridden in docker-compose.dev.yml)
CMD ["pnpm", "dev", "--host"]

# ==============================================================================
# Builder Stage - Build web POS for production
# ==============================================================================
FROM deps AS builder

WORKDIR /app

ENV NODE_ENV=production

# Build the web version of POS (NOT Electron)
WORKDIR /app/apps/pos-desktop
RUN pnpm build:web

# ==============================================================================
# Runner Stage - Serve with Nginx
# ==============================================================================
FROM nginx:1.27-alpine AS runner

# Copy custom nginx configuration
COPY apps/pos-desktop/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files from builder
COPY --from=builder /app/apps/pos-desktop/dist /usr/share/nginx/html

# Add healthcheck
RUN apk add --no-cache curl

# Create non-root nginx user
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Use non-root user
USER nginx

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:80 || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
