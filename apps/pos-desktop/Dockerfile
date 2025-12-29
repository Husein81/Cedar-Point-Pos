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
RUN turbo prune --scope=pos-desktop --docker

# ------------------------------------------------------------------------------
# Deps Stage
# ------------------------------------------------------------------------------
FROM base AS deps
WORKDIR /app

# Native modules build tools (just in case for better-sqlite3 or others)
RUN apk add --no-cache python3 make g++

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .

# ------------------------------------------------------------------------------
# Build Stage
# ------------------------------------------------------------------------------
FROM deps AS build-prod
WORKDIR /app/apps/pos-desktop
RUN pnpm build:web

# ------------------------------------------------------------------------------
# Runner Stage
# ------------------------------------------------------------------------------
FROM nginx:alpine AS runner
COPY apps/pos-desktop/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build-prod /app/apps/pos-desktop/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
