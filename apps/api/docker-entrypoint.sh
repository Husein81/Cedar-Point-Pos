#!/bin/sh
set -e

# ==============================================================================
# Docker Entrypoint for Pointverse API
# ==============================================================================
# This script:
# 1. Waits for PostgreSQL to be ready
# 2. Runs Prisma migrations (NOT during build time)
# 3. Starts the NestJS application
#
# Why migrations at runtime?
# - Database may not exist during build time
# - Allows same image to work across environments
# - Compatible with CI/CD and zero-downtime deployments
# ==============================================================================

echo "🚀 Starting Pointverse API..."

# ------------------------------------------------------------------------------
# Step 1: Wait for PostgreSQL
# ------------------------------------------------------------------------------
echo "⏳ Waiting for PostgreSQL to be ready..."

until pg_isready -h "$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')" > /dev/null 2>&1; do
  echo "   PostgreSQL is unavailable - waiting..."
  sleep 2
done

echo "✅ PostgreSQL is ready!"

# ------------------------------------------------------------------------------
# Step 2: Run Prisma Migrations
# ------------------------------------------------------------------------------
echo "🔄 Running Prisma migrations..."

# Change to API directory where prisma schema is located
cd /app/apps/api

# Run migrations (deploy mode - production safe)
# This will apply pending migrations without prompts
pnpm prisma migrate deploy

if [ $? -eq 0 ]; then
    echo "✅ Migrations completed successfully!"
else
    echo "❌ Migration failed! Exiting..."
    exit 1
fi

# Optional: Generate Prisma Client if not already done (safety check)
echo "🔄 Ensuring Prisma Client is generated..."
pnpm db:generate

# ------------------------------------------------------------------------------
# Step 3: Start the Application
# ------------------------------------------------------------------------------
echo "🎯 Starting NestJS application..."
echo "   Environment: $NODE_ENV"
echo "   Port: $PORT"
echo ""

# Execute the main application
# NestJS outputs to dist/src/main.js (preserving src folder structure)
exec node dist/src/main.js
