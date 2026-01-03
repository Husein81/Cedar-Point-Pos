# ==============================================================================
# Pointverse Docker Makefile
# ==============================================================================
# Simplifies Docker Compose commands for development and production
#
# Usage:
#   make dev          - Start development environment
#   make prod         - Start production environment
#   make build        - Build all production images
#   make logs         - View all logs
#   make clean        - Stop and remove containers
#   make help         - Show this help message
# ==============================================================================

.PHONY: help dev prod build logs clean restart migrate shell-api shell-pos shell-admin ps health test

# Default target
.DEFAULT_GOAL := help

# Colors for output
YELLOW := \033[1;33m]
GREEN := \033[1;32m]
RED := \033[1;31m]
NC := \033[0m] # No Color

# Docker Compose files
COMPOSE_BASE := docker-compose.yml
COMPOSE_DEV := docker-compose.dev.yml
COMPOSE_PROD := docker-compose.prod.yml

##@ Development

dev: ## Start development environment with hot reload
	@echo "$(GREEN)🚀 Starting development environment...$(NC)"
	docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_DEV) up

dev-build: ## Build and start development environment
	@echo "$(GREEN)🔨 Building and starting development environment...$(NC)"
	docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_DEV) up --build

dev-down: ## Stop development environment
	@echo "$(YELLOW)🛑 Stopping development environment...$(NC)"
	docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_DEV) down

dev-reset: ## Stop development and remove volumes (deletes data!)
	@echo "$(RED)⚠️  Resetting development environment (deletes data!)...$(NC)"
	docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_DEV) down -v

##@ Production

prod: ## Start production environment
	@echo "$(GREEN)🚀 Starting production environment...$(NC)"
	docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_PROD) up -d

prod-build: ## Build production images
	@echo "$(GREEN)🔨 Building production images...$(NC)"
	docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_PROD) build

prod-down: ## Stop production environment
	@echo "$(YELLOW)🛑 Stopping production environment...$(NC)"
	docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_PROD) down

prod-logs: ## View production logs
	@echo "$(GREEN)📋 Viewing production logs...$(NC)"
	docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_PROD) logs -f

##@ General Operations

build: prod-build ## Build all production images (alias for prod-build)

logs: ## View all logs (follow mode)
	docker compose logs -f

logs-api: ## View API logs only
	docker compose logs -f api

logs-pos: ## View POS logs only
	docker compose logs -f pos

logs-admin: ## View admin logs only
	docker compose logs -f system-admin

logs-db: ## View PostgreSQL logs only
	docker compose logs -f postgres

ps: ## Show running containers
	docker compose ps

health: ## Check health status of all services
	@echo "$(GREEN)🏥 Checking service health...$(NC)"
	@docker compose ps
	@echo ""
	@echo "$(YELLOW)API Health:$(NC)"
	@curl -s http://localhost:5000/health || echo "$(RED)API is not responding$(NC)"

restart: ## Restart all services
	@echo "$(YELLOW)🔄 Restarting all services...$(NC)"
	docker compose restart

restart-api: ## Restart API service only
	docker compose restart api

restart-pos: ## Restart POS service only
	docker compose restart pos

restart-admin: ## Restart admin service only
	docker compose restart system-admin

##@ Database Operations

migrate: ## Run Prisma migrations
	@echo "$(GREEN)🗄️  Running database migrations...$(NC)"
	docker compose exec api pnpm --filter api prisma migrate deploy

migrate-status: ## Check migration status
	docker compose exec api pnpm --filter api prisma migrate status

db-reset: ## Reset database (development only - deletes all data!)
	@echo "$(RED)⚠️  Resetting database (deletes all data!)...$(NC)"
	docker compose down -v
	docker compose up -d postgres
	@sleep 5
	docker compose up -d api

db-seed: ## Seed database with initial data
	@echo "$(GREEN)🌱 Seeding database...$(NC)"
	docker compose exec api pnpm --filter api prisma db seed

##@ Shell Access

shell-api: ## Open shell in API container
	docker compose exec api sh

shell-pos: ## Open shell in POS container
	docker compose exec pos sh

shell-admin: ## Open shell in system-admin container
	docker compose exec system-admin sh

shell-db: ## Open PostgreSQL shell
	docker compose exec postgres psql -U pointverse -d pointverse

##@ Cleanup

clean: ## Stop containers and remove volumes
	@echo "$(YELLOW)🧹 Cleaning up containers and volumes...$(NC)"
	docker compose down -v

clean-all: ## Remove all containers, volumes, and images
	@echo "$(RED)🧹 Removing all Docker artifacts...$(NC)"
	docker compose down -v --rmi all

prune: ## Prune unused Docker resources
	@echo "$(YELLOW)🧹 Pruning unused Docker resources...$(NC)"
	docker system prune -af --volumes

##@ Utility

env: ## Copy .env.example to .env if not exists
	@if [ ! -f .env ]; then \
		echo "$(GREEN)📝 Creating .env from .env.example...$(NC)"; \
		cp .env.example .env; \
		echo "$(YELLOW)⚠️  Please edit .env with your configuration$(NC)"; \
	else \
		echo "$(YELLOW).env already exists$(NC)"; \
	fi

test: ## Run tests in API container
	docker compose exec api pnpm --filter api test

format: ## Format code in all containers
	docker compose exec api pnpm format

lint: ## Lint code in all containers
	docker compose exec api pnpm lint

help: ## Display this help message
	@echo "$(GREEN)Pointverse Docker Commands$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf ""} /^[a-zA-Z_-]+:.*?##/ { printf "  $(YELLOW)%-18s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(GREEN)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)
	@echo ""
	@echo "$(GREEN)Quick Start:$(NC)"
	@echo "  1. make env      - Create .env file"
	@echo "  2. make dev      - Start development environment"
	@echo "  3. make logs     - View logs"
	@echo ""
	@echo "$(YELLOW)For more details, see DOCKER.md$(NC)"
