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
# Pruner Stage - Extract only what's needed for Admin using Turbo
# ==============================================================================
FROM base AS pruner

# Install Turbo globally
RUN pnpm add -g turbo@2.6.1

# Copy entire monorepo
COPY . .

# Prune to only include admin dependencies and related packages
RUN turbo prune admin --docker

# ==============================================================================
# Dependencies Stage - Install all dependencies
# ==============================================================================
FROM base AS deps

# Install compatibility libraries for Next.js
RUN apk add --no-cache libc6-compat

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
ENV NEXT_TELEMETRY_DISABLED=1

# Expose Next.js dev server port
EXPOSE 3000

WORKDIR /app/apps/system-admin

# Default command (can be overridden in docker-compose.dev.yml)
CMD ["pnpm", "dev"]

# ==============================================================================
# Builder Stage - Build Next.js app for production
# ==============================================================================
FROM deps AS builder

WORKDIR /app/apps/system-admin

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js app (standalone output for minimal runtime)
RUN pnpm build

# ==============================================================================
# Runner Stage - Production runtime (minimal image)
# ==============================================================================
FROM node:20.18.1-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Install runtime dependencies
RUN apk add --no-cache \
    libc6-compat \
    curl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone Next.js build
COPY --from=builder /app/apps/system-admin/public ./apps/system-admin/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/system-admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/system-admin/.next/static ./apps/system-admin/.next/static

# Switch to non-root user
USER nextjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

WORKDIR /app/apps/system-admin

# Start Next.js server
CMD ["node", "server.js"]
