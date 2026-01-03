# ==============================================================================
# Pointverse Docker Helper Script (PowerShell)
# ==============================================================================
# Windows-friendly alternative to Makefile
#
# Usage:
#   .\docker.ps1 dev          - Start development environment
#   .\docker.ps1 prod         - Start production environment
#   .\docker.ps1 build        - Build all production images
#   .\docker.ps1 logs         - View all logs
#   .\docker.ps1 clean        - Stop and remove containers
#   .\docker.ps1 help         - Show help message
# ==============================================================================

param(
    [Parameter(Position = 0)]
    [string]$Command = "help",
    
    [Parameter(Position = 1)]
    [string]$Service = ""
)

$COMPOSE_BASE = "docker-compose.yml"
$COMPOSE_DEV = "docker-compose.dev.yml"
$COMPOSE_PROD = "docker-compose.prod.yml"

function Write-Header($Text) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host " $Text" -ForegroundColor White
    Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Success($Text) {
    Write-Host "✓ $Text" -ForegroundColor Green
}

function Write-Warning($Text) {
    Write-Host "⚠ $Text" -ForegroundColor Yellow
}

function Write-Error-Custom($Text) {
    Write-Host "✗ $Text" -ForegroundColor Red
}

function Write-Info($Text) {
    Write-Host "ℹ $Text" -ForegroundColor Cyan
}

switch ($Command.ToLower()) {
    # Development commands
    "dev" {
        Write-Header "Starting Development Environment"
        docker compose -f $COMPOSE_BASE -f $COMPOSE_DEV up
    }
    
    "dev-build" {
        Write-Header "Building and Starting Development Environment"
        docker compose -f $COMPOSE_BASE -f $COMPOSE_DEV up --build
    }
    
    "dev-down" {
        Write-Header "Stopping Development Environment"
        docker compose -f $COMPOSE_BASE -f $COMPOSE_DEV down
    }
    
    "dev-reset" {
        Write-Warning "This will delete all data!"
        $confirm = Read-Host "Are you sure? (y/N)"
        if ($confirm -eq "y") {
            Write-Header "Resetting Development Environment"
            docker compose -f $COMPOSE_BASE -f $COMPOSE_DEV down -v
        }
        else {
            Write-Info "Operation cancelled"
        }
    }
    
    # Production commands
    "prod" {
        Write-Header "Starting Production Environment"
        docker compose -f $COMPOSE_BASE -f $COMPOSE_PROD up -d
        Write-Success "Production environment started in detached mode"
    }
    
    "prod-build" {
        Write-Header "Building Production Images"
        docker compose -f $COMPOSE_BASE -f $COMPOSE_PROD build
    }
    
    "prod-down" {
        Write-Header "Stopping Production Environment"
        docker compose -f $COMPOSE_BASE -f $COMPOSE_PROD down
    }
    
    "prod-logs" {
        Write-Header "Viewing Production Logs"
        docker compose -f $COMPOSE_BASE -f $COMPOSE_PROD logs -f
    }
    
    # General operations
    "build" {
        Write-Header "Building All Production Images"
        docker compose -f $COMPOSE_BASE -f $COMPOSE_PROD build
    }
    
    "logs" {
        if ($Service) {
            Write-Header "Viewing Logs for $Service"
            docker compose logs -f $Service
        }
        else {
            Write-Header "Viewing All Logs"
            docker compose logs -f
        }
    }
    
    "ps" {
        Write-Header "Running Containers"
        docker compose ps
    }
    
    "health" {
        Write-Header "Checking Service Health"
        docker compose ps
        Write-Host ""
        Write-Info "Checking API health endpoint..."
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -TimeoutSec 5
            Write-Success "API is healthy"
        }
        catch {
            Write-Error-Custom "API is not responding"
        }
    }
    
    "restart" {
        if ($Service) {
            Write-Header "Restarting $Service"
            docker compose restart $Service
        }
        else {
            Write-Header "Restarting All Services"
            docker compose restart
        }
    }
    
    # Database operations
    "migrate" {
        Write-Header "Running Database Migrations"
        docker compose exec api pnpm --filter api prisma migrate deploy
    }
    
    "migrate-status" {
        Write-Header "Checking Migration Status"
        docker compose exec api pnpm --filter api prisma migrate status
    }
    
    "db-reset" {
        Write-Warning "This will delete all database data!"
        $confirm = Read-Host "Are you sure? (y/N)"
        if ($confirm -eq "y") {
            Write-Header "Resetting Database"
            docker compose down -v
            docker compose up -d postgres
            Start-Sleep -Seconds 5
            docker compose up -d api
            Write-Success "Database reset complete"
        }
        else {
            Write-Info "Operation cancelled"
        }
    }
    
    # Shell access
    "shell" {
        if (-not $Service) {
            $Service = "api"
        }
        Write-Header "Opening Shell in $Service Container"
        docker compose exec $Service sh
    }
    
    "shell-db" {
        Write-Header "Opening PostgreSQL Shell"
        docker compose exec postgres psql -U pointverse -d pointverse
    }
    
    # Cleanup
    "clean" {
        Write-Header "Cleaning Up Containers and Volumes"
        docker compose down -v
    }
    
    "clean-all" {
        Write-Warning "This will remove all containers, volumes, and images!"
        $confirm = Read-Host "Are you sure? (y/N)"
        if ($confirm -eq "y") {
            Write-Header "Removing All Docker Artifacts"
            docker compose down -v --rmi all
        }
        else {
            Write-Info "Operation cancelled"
        }
    }
    
    "prune" {
        Write-Warning "This will remove unused Docker resources!"
        $confirm = Read-Host "Are you sure? (y/N)"
        if ($confirm -eq "y") {
            Write-Header "Pruning Unused Docker Resources"
            docker system prune -af --volumes
        }
        else {
            Write-Info "Operation cancelled"
        }
    }
    
    # Utility
    "env" {
        if (Test-Path ".env") {
            Write-Warning ".env file already exists"
        }
        else {
            Write-Header "Creating .env File"
            Copy-Item ".env.example" ".env"
            Write-Success "Created .env from .env.example"
            Write-Warning "Please edit .env with your configuration"
        }
    }
    
    "test" {
        Write-Header "Running Tests"
        docker compose exec api pnpm --filter api test
    }
    
    # Help
    "help" {
        Write-Host ""
        Write-Host "Pointverse Docker Helper Script" -ForegroundColor Green
        Write-Host "================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "DEVELOPMENT COMMANDS:" -ForegroundColor Cyan
        Write-Host "  dev              Start development environment" -ForegroundColor White
        Write-Host "  dev-build        Build and start development environment" -ForegroundColor White
        Write-Host "  dev-down         Stop development environment" -ForegroundColor White
        Write-Host "  dev-reset        Reset development environment (deletes data)" -ForegroundColor White
        Write-Host ""
        Write-Host "PRODUCTION COMMANDS:" -ForegroundColor Cyan
        Write-Host "  prod             Start production environment" -ForegroundColor White
        Write-Host "  prod-build       Build production images" -ForegroundColor White
        Write-Host "  prod-down        Stop production environment" -ForegroundColor White
        Write-Host "  prod-logs        View production logs" -ForegroundColor White
        Write-Host ""
        Write-Host "GENERAL OPERATIONS:" -ForegroundColor Cyan
        Write-Host "  build            Build all production images" -ForegroundColor White
        Write-Host "  logs [service]   View logs (optionally for specific service)" -ForegroundColor White
        Write-Host "  ps               Show running containers" -ForegroundColor White
        Write-Host "  health           Check service health" -ForegroundColor White
        Write-Host "  restart [svc]    Restart services (optionally specific service)" -ForegroundColor White
        Write-Host ""
        Write-Host "DATABASE OPERATIONS:" -ForegroundColor Cyan
        Write-Host "  migrate          Run Prisma migrations" -ForegroundColor White
        Write-Host "  migrate-status   Check migration status" -ForegroundColor White
        Write-Host "  db-reset         Reset database (deletes all data)" -ForegroundColor White
        Write-Host ""
        Write-Host "SHELL ACCESS:" -ForegroundColor Cyan
        Write-Host "  shell [service]  Open shell in container (default: api)" -ForegroundColor White
        Write-Host "  shell-db         Open PostgreSQL shell" -ForegroundColor White
        Write-Host ""
        Write-Host "CLEANUP:" -ForegroundColor Cyan
        Write-Host "  clean            Stop containers and remove volumes" -ForegroundColor White
        Write-Host "  clean-all        Remove all containers, volumes, and images" -ForegroundColor White
        Write-Host "  prune            Prune unused Docker resources" -ForegroundColor White
        Write-Host ""
        Write-Host "UTILITY:" -ForegroundColor Cyan
        Write-Host "  env              Create .env from .env.example" -ForegroundColor White
        Write-Host "  test             Run tests" -ForegroundColor White
        Write-Host "  help             Show this help message" -ForegroundColor White
        Write-Host ""
        Write-Host "EXAMPLES:" -ForegroundColor Yellow
        Write-Host "  .\docker.ps1 dev" -ForegroundColor Gray
        Write-Host "  .\docker.ps1 logs api" -ForegroundColor Gray
        Write-Host "  .\docker.ps1 shell api" -ForegroundColor Gray
        Write-Host "  .\docker.ps1 restart" -ForegroundColor Gray
        Write-Host ""
        Write-Host "For more details, see DOCKER.md" -ForegroundColor Cyan
        Write-Host ""
    }
    
    default {
        Write-Error-Custom "Unknown command: $Command"
        Write-Info "Run '.\docker.ps1 help' for usage information"
        exit 1
    }
}
