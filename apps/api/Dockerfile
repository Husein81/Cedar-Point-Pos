# ==============================================================================
# Base
# ==============================================================================
FROM node:20-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true

RUN npm install -g pnpm@10.26.1

# ==============================================================================
# Prune stage (Turbo)
# ==============================================================================
FROM base AS pruner
WORKDIR /app

RUN pnpm install turbo@2.6.1 --global
COPY . .
RUN turbo prune --scope=api --docker

# ==============================================================================
# Dependencies stage
# ==============================================================================
FROM base AS deps
WORKDIR /app

# Copy pruned workspace metadata
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Install deps (cached layer)
RUN pnpm install --frozen-lockfile

# Copy actual source
COPY --from=pruner /app/out/full/ .

# Generate Prisma client
WORKDIR /app/apps/api
RUN pnpm db:generate

# ==============================================================================
# Build stage
# ==============================================================================
FROM deps AS build
WORKDIR /app
RUN pnpm turbo run build --filter=api...

# Remove dev deps
WORKDIR /app
RUN pnpm prune --prod

# ==============================================================================
# Runtime stage
# ==============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Non-root user
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

# Copy runtime artifacts only
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/packages ./packages
COPY --from=build --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=nestjs:nodejs /app/apps/api/prisma ./apps/api/prisma

USER nestjs
EXPOSE 5000

WORKDIR /app/apps/api
CMD ["node", "dist/main.js"]
