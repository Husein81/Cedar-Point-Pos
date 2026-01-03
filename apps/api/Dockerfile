# ==============================================================================
# Base
# ==============================================================================
FROM node:20.19.6-alpine AS base

ENV PNPM_VERSION=10.26.1
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true

RUN npm install -g pnpm@${PNPM_VERSION}

WORKDIR /app

# ==============================================================================
# Pruner
# ==============================================================================
FROM base AS pruner

RUN pnpm add -g turbo@2.6.1

COPY . .
RUN turbo prune api --docker

# ==============================================================================
# Dependencies
# ==============================================================================
FROM base AS deps

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssl \
    libc6-compat

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .

# Generate Prisma client
WORKDIR /app/apps/api
RUN pnpm db:generate

# ==============================================================================
# Builder
# ==============================================================================
FROM deps AS builder

WORKDIR /app
ENV NODE_ENV=production

RUN pnpm turbo run build --filter=api

# ==============================================================================
# Runner
# ==============================================================================
FROM node:20.19.6-alpine AS runner

RUN apk add --no-cache \
    openssl \
    libc6-compat \
    curl \
    dumb-init

ENV NODE_ENV=production
ENV PORT=5000
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN npm install -g pnpm@10.26.1

WORKDIR /app

# Non-root user
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

# Root dependencies (pnpm symlinks)
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nestjs:nodejs /app/packages ./packages

# API build
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/generated ./apps/api/generated

# Entrypoint
COPY --chown=nestjs:nodejs apps/api/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nestjs
WORKDIR /app/apps/api

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["/usr/local/bin/docker-entrypoint.sh"]
