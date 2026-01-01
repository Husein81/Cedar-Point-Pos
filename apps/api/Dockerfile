# ==============================================================================
# Base Stage - Node 20.x with pnpm
# ==============================================================================
FROM node:20.18.1-alpine AS base

# Set pnpm version explicitly
ENV PNPM_VERSION=10.26.1
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true

# Install pnpm using npm (more reliable than corepack prepare)
RUN npm install -g pnpm@${PNPM_VERSION}

WORKDIR /app

# ==============================================================================
# Pruner Stage - Extract only what's needed for API using Turbo
# ==============================================================================
FROM base AS pruner

# Install Turbo globally
RUN pnpm add -g turbo@2.6.1

# Copy entire monorepo
COPY . .

# Prune to only include API dependencies and related packages
RUN turbo prune api --docker

# ==============================================================================
# Dependencies Stage - Install all dependencies
# ==============================================================================
FROM base AS deps

# Install build dependencies for native modules (Prisma, bcrypt, etc.)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssl \
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

# Generate Prisma Client (build-time generation for dev/build stages)
WORKDIR /app/apps/api
RUN pnpm db:generate

# ==============================================================================
# Development Stage - For local development with hot reload
# ==============================================================================
FROM deps AS dev

WORKDIR /app

# Install development tools
RUN apk add --no-cache curl

ENV NODE_ENV=development

# Expose API port and debug port
EXPOSE 5000 9229

WORKDIR /app/apps/api

# Default command (can be overridden in docker-compose.dev.yml)
CMD ["pnpm", "dev"]

# ==============================================================================
# Builder Stage - Build production artifacts
# ==============================================================================
FROM deps AS builder

WORKDIR /app

ENV NODE_ENV=production

# Build the API using Turbo
RUN pnpm turbo run build --filter=api...

# Prune dev dependencies after build
RUN pnpm prune --prod --no-optional

# ==============================================================================
# Runner Stage - Production runtime (minimal image)
# ==============================================================================
FROM node:20.18.1-alpine AS runner

# Install runtime dependencies only
RUN apk add --no-cache \
    openssl \
    libc6-compat \
    curl \
    dumb-init

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Create non-root user
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

# Copy pnpm for running migration script
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@10.26.1

# Copy production node_modules from builder
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy shared packages (types, etc.)
COPY --from=builder --chown=nestjs:nodejs /app/packages ./packages

# Copy API build artifacts
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/node_modules ./apps/api/node_modules

# Copy Prisma schema and generated client (required for migrations)
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/generated ./apps/api/generated

# Copy startup script
COPY --chown=nestjs:nodejs apps/api/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Switch to non-root user
USER nestjs

EXPOSE 5000

WORKDIR /app/apps/api

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Run migrations and start app
CMD ["/usr/local/bin/docker-entrypoint.sh"]
