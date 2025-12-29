FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ------------------------------------------------------------------------------
# Pruner Stage
# ------------------------------------------------------------------------------
FROM base AS pruner
WORKDIR /app
RUN pnpm add -g turbo
COPY . .
RUN turbo prune --scope=admin --docker

# ------------------------------------------------------------------------------
# Deps Stage
# ------------------------------------------------------------------------------
FROM base AS deps
WORKDIR /app

# Ensure we have libc6 for some standard libraries
RUN apk add --no-cache libc6-compat

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .

# ------------------------------------------------------------------------------
# Build Stage
# ------------------------------------------------------------------------------
FROM deps AS build-prod
WORKDIR /app/apps/system-admin
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ------------------------------------------------------------------------------
# Runner Stage
# ------------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=build-prod /app/apps/system-admin/public ./apps/system-admin/public
COPY --from=build-prod --chown=nextjs:nodejs /app/apps/system-admin/.next/standalone ./
COPY --from=build-prod --chown=nextjs:nodejs /app/apps/system-admin/.next/static ./apps/system-admin/.next/static

USER nextjs
EXPOSE 3000

WORKDIR /app/apps/system-admin
CMD ["node", "server.js"]
