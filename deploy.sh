#!/bin/bash
# ============================================
# Werewolf Game — Deploy Script
# ============================================
# Usage: ./deploy.sh [command]
# Commands: setup | deploy | update | logs | status | stop | restart | backup | rollback

set -euo pipefail

# ─── Configuration ───
APP_DIR="/opt/werewolf-game"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
BACKUP_DIR="/opt/werewolf-backups"
GIT_REPO="https://github.com/tuanngv244/werewolf.git"
GIT_BRANCH="main"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ─── Check prerequisites ───
check_deps() {
    local missing=()
    for cmd in docker git; do
        if ! command -v "$cmd" &>/dev/null; then
            missing+=("$cmd")
        fi
    done

    # Check docker compose (v2 plugin)
    if ! docker compose version &>/dev/null; then
        missing+=("docker-compose-plugin")
    fi

    if [ ${#missing[@]} -gt 0 ]; then
        log_error "Missing required tools: ${missing[*]}"
        echo "Run './deploy.sh setup' first to install dependencies."
        exit 1
    fi
}

# ============================================
# Command: setup
# First-time server setup
# ============================================
cmd_setup() {
    log_info "Setting up Ubuntu server for Werewolf Game..."

    # Update system
    log_info "Updating system packages..."
    sudo apt update && sudo apt upgrade -y

    # Install Docker
    if ! command -v docker &>/dev/null; then
        log_info "Installing Docker..."
        curl -fsSL https://get.docker.com | sudo sh
        sudo usermod -aG docker "$USER"
        sudo systemctl enable docker
        sudo systemctl start docker
        log_ok "Docker installed"
    else
        log_ok "Docker already installed"
    fi

    # Install Docker Compose plugin
    if ! docker compose version &>/dev/null; then
        log_info "Installing Docker Compose plugin..."
        sudo apt install -y docker-compose-plugin
        log_ok "Docker Compose plugin installed"
    else
        log_ok "Docker Compose already installed"
    fi

    # Install Git
    if ! command -v git &>/dev/null; then
        log_info "Installing Git..."
        sudo apt install -y git
        log_ok "Git installed"
    else
        log_ok "Git already installed"
    fi

    # Setup firewall
    log_info "Configuring firewall..."
    sudo ufw allow OpenSSH
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    echo "y" | sudo ufw enable || true
    log_ok "Firewall configured (SSH + HTTP + HTTPS)"

    # Create app directory
    sudo mkdir -p "$APP_DIR"
    sudo chown "$USER:$USER" "$APP_DIR"

    # Create backup directory
    sudo mkdir -p "$BACKUP_DIR"
    sudo chown "$USER:$USER" "$BACKUP_DIR"

    # Clone repository
    if [ ! -d "$APP_DIR/.git" ]; then
        log_info "Cloning repository..."
        git clone "$GIT_REPO" "$APP_DIR"
        log_ok "Repository cloned to $APP_DIR"
    else
        log_ok "Repository already exists at $APP_DIR"
    fi

    # Setup env file
    if [ ! -f "$APP_DIR/$ENV_FILE" ]; then
        log_info "Creating production environment file..."
        cd "$APP_DIR"
        cp .env.production.example .env.production

        # Generate secure secrets
        JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
        JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
        POSTGRES_PW=$(openssl rand -base64 32 | tr -d '\n' | tr -d '/' | head -c 32)
        REDIS_PW=$(openssl rand -base64 32 | tr -d '\n' | tr -d '/' | head -c 32)

        # Get server IP
        SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

        # Replace placeholders
        sed -i "s|CHANGE_ME_strong_password_here|$POSTGRES_PW|g" "$ENV_FILE"
        sed -i "s|CHANGE_ME_strong_redis_password|$REDIS_PW|g" "$ENV_FILE"
        sed -i "s|CHANGE_ME_generate_with_openssl_rand_base64_64|$JWT_SECRET|" "$ENV_FILE"
        sed -i "0,/CHANGE_ME_generate_with_openssl_rand_base64_64/s|CHANGE_ME_generate_with_openssl_rand_base64_64|$JWT_REFRESH_SECRET|" "$ENV_FILE"
        sed -i "s|YOUR_DOMAIN_OR_IP|$SERVER_IP|g" "$ENV_FILE"

        log_ok "Environment file created with auto-generated secrets"
        log_warn "Review $APP_DIR/$ENV_FILE and update domain/IP if needed"
    else
        log_ok "Environment file already exists"
    fi

    echo ""
    log_ok "═══════════════════════════════════════"
    log_ok "  Server setup complete!"
    log_ok "═══════════════════════════════════════"
    echo ""
    echo "  Next steps:"
    echo "  1. Review: nano $APP_DIR/$ENV_FILE"
    echo "  2. Deploy: cd $APP_DIR && ./deploy.sh deploy"
    echo ""
    if groups "$USER" | grep -q docker; then
        true
    else
        log_warn "Log out and back in for docker group to take effect!"
    fi
}

# ============================================
# Command: deploy
# Full build and deploy
# ============================================
cmd_deploy() {
    check_deps
    cd "$APP_DIR"

    if [ ! -f "$ENV_FILE" ]; then
        log_error "Missing $ENV_FILE — run './deploy.sh setup' first"
        exit 1
    fi

    log_info "Pulling latest code..."
    git pull origin "$GIT_BRANCH"

    log_info "Building and starting containers..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

    # Wait for health checks
    log_info "Waiting for services to be healthy..."
    sleep 10

    # Show status
    cmd_status

    echo ""
    log_ok "═══════════════════════════════════════"
    log_ok "  Deployment complete!"
    log_ok "═══════════════════════════════════════"
}

# ============================================
# Command: update
# Quick update (rebuild only changed services)
# ============================================
cmd_update() {
    check_deps
    cd "$APP_DIR"

    if [ ! -f "$ENV_FILE" ]; then
        log_error "Missing $ENV_FILE"
        exit 1
    fi

    log_info "Pulling latest code..."
    git pull origin "$GIT_BRANCH"

    log_info "Rebuilding and restarting containers..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

    # Cleanup old images
    docker image prune -f

    log_info "Waiting for services..."
    sleep 10

    cmd_status

    echo ""
    log_ok "Update complete!"
}

# ============================================
# Command: logs
# View container logs
# ============================================
cmd_logs() {
    check_deps
    cd "$APP_DIR"
    local service="${1:-}"
    if [ -n "$service" ]; then
        docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f "$service"
    else
        docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f
    fi
}

# ============================================
# Command: status
# Check service status
# ============================================
cmd_status() {
    check_deps
    cd "$APP_DIR"
    echo ""
    log_info "Service Status:"
    echo "────────────────────────────────────────"
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
    echo ""
}

# ============================================
# Command: stop
# Stop all services
# ============================================
cmd_stop() {
    check_deps
    cd "$APP_DIR"
    log_info "Stopping all services..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
    log_ok "All services stopped"
}

# ============================================
# Command: restart
# Restart all services
# ============================================
cmd_restart() {
    check_deps
    cd "$APP_DIR"
    log_info "Restarting all services..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" restart
    sleep 5
    cmd_status
    log_ok "All services restarted"
}

# ============================================
# Command: backup
# Backup database
# ============================================
cmd_backup() {
    check_deps
    cd "$APP_DIR"

    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/werewolf_db_$timestamp.sql.gz"

    log_info "Creating database backup..."

    # Source env vars
    source "$ENV_FILE"

    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
        pg_dump -U "${POSTGRES_USER:-werewolf}" "${POSTGRES_DB:-werewolf}" | gzip > "$backup_file"

    log_ok "Backup saved: $backup_file"
    log_info "Backup size: $(du -h "$backup_file" | cut -f1)"

    # Keep only last 10 backups
    ls -t "$BACKUP_DIR"/werewolf_db_*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm
    log_info "Old backups cleaned (keeping last 10)"
}

# ============================================
# Command: rollback
# Rollback to previous git commit
# ============================================
cmd_rollback() {
    check_deps
    cd "$APP_DIR"

    log_warn "Current commit: $(git log --oneline -1)"
    log_info "Rolling back to previous commit..."

    git checkout HEAD~1

    log_info "Rebuilding..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

    sleep 10
    cmd_status

    log_ok "Rolled back to: $(git log --oneline -1)"
}

# ============================================
# Main
# ============================================
case "${1:-help}" in
    setup)    cmd_setup ;;
    deploy)   cmd_deploy ;;
    update)   cmd_update ;;
    logs)     cmd_logs "${2:-}" ;;
    status)   cmd_status ;;
    stop)     cmd_stop ;;
    restart)  cmd_restart ;;
    backup)   cmd_backup ;;
    rollback) cmd_rollback ;;
    help|*)
        echo ""
        echo "  Werewolf Game — Deploy Tool"
        echo "  ──────────────────────────────"
        echo ""
        echo "  Usage: ./deploy.sh <command>"
        echo ""
        echo "  Commands:"
        echo "    setup      First-time server setup (Docker, Git, firewall, env)"
        echo "    deploy     Full build and deploy (pull + build + start)"
        echo "    update     Quick update (pull + rebuild changed + restart)"
        echo "    logs       View logs (optional: ./deploy.sh logs server)"
        echo "    status     Check service status"
        echo "    stop       Stop all services"
        echo "    restart    Restart all services"
        echo "    backup     Backup PostgreSQL database"
        echo "    rollback   Rollback to previous git commit"
        echo ""
        ;;
esac
