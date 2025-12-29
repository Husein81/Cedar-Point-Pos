FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ------------------------------------------------------------------------------
# Pruner Stage (Isolate needed files)
# ------------------------------------------------------------------------------
FROM base AS pruner
WORKDIR /app
RUN pnpm add -g turbo
COPY . .
RUN turbo prune --scope=api --docker

# ------------------------------------------------------------------------------
# Deps Stage (Install isolated deps)
# ------------------------------------------------------------------------------
FROM base AS deps
WORKDIR /app

# Copy only package.json's from pruner
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Install only allowed dependencies
RUN pnpm install --frozen-lockfile

# Copy source code from pruner
COPY --from=pruner /app/out/full/ .

# Generate Prisma
WORKDIR /app/apps/api
RUN pnpm db:generate

# ------------------------------------------------------------------------------
# Build Stage
# ------------------------------------------------------------------------------
FROM deps AS build-prod
WORKDIR /app/apps/api
RUN pnpm build
# Prune for production
WORKDIR /app
RUN pnpm prune --prod

# ------------------------------------------------------------------------------
# Runner Stage
# ------------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy artifacts
COPY --from=build-prod --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build-prod --chown=nestjs:nodejs /app/packages ./packages
COPY --from=build-prod --chown=nestjs:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build-prod --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=build-prod --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=build-prod --chown=nestjs:nodejs /app/apps/api/prisma ./apps/api/prisma

ENV NODE_ENV=production
ENV PORT=3000

USER nestjs
EXPOSE 3000

WORKDIR /app/apps/api
CMD /bin/sh -c "npx prisma migrate deploy && node dist/main"
