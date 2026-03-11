#!/bin/bash
# ============================================
# Werewolf Game — Deploy Script
# ============================================
# Usage: ./deploy.sh [command]
# Commands: setup | deploy | update | logs | status | stop | restart | backup | rollback
#
# SSL: Uses Cloudflare Origin certs from ssl/cert.pem + ssl/private.key
# If certs are missing/empty → falls back to HTTP automatically.

set -euo pipefail

# ─── Configuration ───
APP_DIR="$HOME/app/werewolf"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
BACKUP_DIR="$HOME/backups/werewolf"
GIT_REPO="https://github.com/tuanngv244/werewolf.git"
GIT_BRANCH="main"
DOMAIN="wolf.nguynchupanh.com"

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

# ─── Check if SSL certs exist and have content ───
has_ssl() {
    [ -s "$APP_DIR/ssl/cert.pem" ] && [ -s "$APP_DIR/ssl/private.key" ]
}

# ─── Auto-configure: pick nginx conf + update .env URLs ───
configure_for_deploy() {
    cd "$APP_DIR"

    if has_ssl; then
        log_ok "SSL certs found (ssl/cert.pem + ssl/private.key) → HTTPS mode"
        cp nginx/nginx-ssl.conf nginx/nginx.conf
        local scheme="https"
    else
        log_warn "No SSL certs (or empty files) → HTTP mode"
        # Restore HTTP-only nginx.conf from git
        git checkout nginx/nginx.conf 2>/dev/null || true
        local scheme="http"
    fi

    # Update .env.production URLs to match
    sed -i "s|CORS_ORIGIN=http[s]*://$DOMAIN|CORS_ORIGIN=${scheme}://$DOMAIN|" "$ENV_FILE"
    sed -i "s|NEXT_PUBLIC_API_URL=http[s]*://$DOMAIN|NEXT_PUBLIC_API_URL=${scheme}://$DOMAIN|" "$ENV_FILE"
    sed -i "s|NEXT_PUBLIC_WS_URL=http[s]*://$DOMAIN|NEXT_PUBLIC_WS_URL=${scheme}://$DOMAIN|" "$ENV_FILE"

    log_ok "URLs set to ${scheme}://$DOMAIN"
}

# ─── Docker compose shorthand ───
dc() {
    cd "$APP_DIR"
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

# ─── Check prerequisites ───
check_deps() {
    local missing=()
    for cmd in docker git; do
        if ! command -v "$cmd" &>/dev/null; then
            missing+=("$cmd")
        fi
    done

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
    log_info "Domain: $DOMAIN"

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

    # Create directories
    mkdir -p "$APP_DIR"
    mkdir -p "$BACKUP_DIR"

    # Clone repository
    if [ ! -d "$APP_DIR/.git" ]; then
        log_info "Cloning repository..."
        git clone "$GIT_REPO" "$APP_DIR"
        log_ok "Repository cloned to $APP_DIR"
    else
        log_info "Pulling latest code..."
        cd "$APP_DIR"
        git pull origin "$GIT_BRANCH"
        log_ok "Repository updated at $APP_DIR"
    fi

    # Check env file
    cd "$APP_DIR"
    if [ -f "$ENV_FILE" ]; then
        log_ok "Environment file found: $APP_DIR/$ENV_FILE"
    else
        log_error "Missing $ENV_FILE in repository!"
        exit 1
    fi

    # Check SSL certs
    if has_ssl; then
        log_ok "SSL certs found → HTTPS will be enabled"
    else
        log_warn "SSL certs empty or missing (ssl/cert.pem, ssl/private.key)"
        log_warn "App will run on HTTP. Add Cloudflare Origin certs to enable HTTPS."
    fi

    echo ""
    log_ok "═══════════════════════════════════════"
    log_ok "  Server setup complete!"
    log_ok "═══════════════════════════════════════"
    echo ""
    echo "  Next: cd $APP_DIR && ./deploy.sh deploy"
    echo ""
    if ! groups "$USER" | grep -q docker; then
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

    # Auto-detect SSL and configure nginx + env
    configure_for_deploy

    log_info "Building and starting containers..."
    dc build --no-cache
    dc up -d

    log_info "Waiting for services to be healthy..."
    sleep 10

    cmd_status

    local scheme="http"
    has_ssl && scheme="https"

    echo ""
    log_ok "═══════════════════════════════════════"
    log_ok "  Deployment complete!"
    log_ok "  ${scheme}://$DOMAIN"
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

    # Auto-detect SSL and configure
    configure_for_deploy

    log_info "Rebuilding and restarting containers..."
    dc build
    dc up -d

    docker image prune -f

    log_info "Waiting for services..."
    sleep 10

    cmd_status

    local scheme="http"
    has_ssl && scheme="https"

    echo ""
    log_ok "Update complete! ${scheme}://$DOMAIN"
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
        dc logs -f "$service"
    else
        dc logs -f
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
    dc ps
    echo ""

    if has_ssl; then
        log_info "Mode: HTTPS (Cloudflare Origin SSL)"
        log_info "URL:  https://$DOMAIN"
        local expiry
        expiry=$(openssl x509 -enddate -noout -in "$APP_DIR/ssl/cert.pem" 2>/dev/null | cut -d= -f2 || echo "unknown")
        log_info "Cert expires: $expiry"
    else
        log_info "Mode: HTTP (no SSL)"
        log_info "URL:  http://$DOMAIN"
        log_warn "Add certs to ssl/cert.pem + ssl/private.key for HTTPS"
    fi
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
    dc down
    log_ok "All services stopped"
}

# ============================================
# Command: restart
# Restart all services
# ============================================
cmd_restart() {
    check_deps
    cd "$APP_DIR"

    configure_for_deploy

    log_info "Restarting all services..."
    dc restart
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

    source "$ENV_FILE"

    dc exec -T postgres \
        pg_dump -U "${POSTGRES_USER:-werewolf}" "${POSTGRES_DB:-werewolf}" | gzip > "$backup_file"

    log_ok "Backup saved: $backup_file"
    log_info "Backup size: $(du -h "$backup_file" | cut -f1)"

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

    configure_for_deploy

    log_info "Rebuilding..."
    dc build
    dc up -d

    sleep 10
    cmd_status

    log_ok "Rolled back to: $(git log --oneline -1)"
}

# ============================================
# Command: diagnose
# Test nginx for redirect loops
# ============================================
cmd_diagnose() {
    check_deps
    cd "$APP_DIR"

    echo ""
    log_info "═══ Redirect Loop Diagnostics ═══"
    echo ""

    # 1. Check what nginx config is actually mounted
    log_info "1. Checking nginx config for redirects..."
    if docker exec werewolf-nginx cat /etc/nginx/conf.d/default.conf 2>/dev/null | grep -q "return 301"; then
        log_error "FOUND 'return 301' redirect in active nginx config! This causes redirect loops with Cloudflare."
        echo "   Fix: Run './deploy.sh deploy' to rebuild with updated config."
    else
        log_ok "No 301 redirects found in active nginx config."
    fi
    echo ""

    # 2. Test HTTP port 80 directly (bypassing Cloudflare)
    log_info "2. Testing HTTP port 80 (direct, no Cloudflare)..."
    local http_response
    http_response=$(curl -s -o /dev/null -w "%{http_code} redirect→%{redirect_url}" --max-redirs 0 http://localhost:80/ 2>&1 || true)
    echo "   Response: $http_response"
    if echo "$http_response" | grep -q "301\|302\|307\|308"; then
        log_error "Port 80 is REDIRECTING! This causes loops when Cloudflare connects via HTTP."
    else
        log_ok "Port 80 serves content directly (no redirect)."
    fi
    echo ""

    # 3. Test HTTPS port 443 directly
    log_info "3. Testing HTTPS port 443 (direct, no Cloudflare)..."
    local https_response
    https_response=$(curl -sk -o /dev/null -w "%{http_code} redirect→%{redirect_url}" --max-redirs 0 https://localhost:443/ 2>&1 || true)
    echo "   Response: $https_response"
    if echo "$https_response" | grep -q "301\|302\|307\|308"; then
        log_warn "Port 443 returned a redirect (could be Next.js locale redirect — OK if it's not back to HTTPS root)."
    else
        log_ok "Port 443 serves content directly."
    fi
    echo ""

    # 4. Check container health
    log_info "4. Container status..."
    dc ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null || dc ps
    echo ""

    # 5. Check nginx error logs
    log_info "5. Recent nginx errors (last 10 lines)..."
    docker logs werewolf-nginx --tail 10 2>&1 | grep -i "error\|emerg\|warn" || log_ok "No recent nginx errors."
    echo ""

    # 6. Show what SSL config is in use
    log_info "6. SSL cert info..."
    if has_ssl; then
        local expiry
        expiry=$(openssl x509 -enddate -noout -in "$APP_DIR/ssl/cert.pem" 2>/dev/null | cut -d= -f2 || echo "unknown")
        log_ok "SSL cert present, expires: $expiry"
    else
        log_warn "No SSL certs found."
    fi
    echo ""

    log_info "═══ Diagnostics Complete ═══"
    echo ""
}

# ============================================
# Main
# ============================================
case "${1:-help}" in
    setup)      cmd_setup ;;
    deploy)     cmd_deploy ;;
    update)     cmd_update ;;
    logs)       cmd_logs "${2:-}" ;;
    status)     cmd_status ;;
    stop)       cmd_stop ;;
    restart)    cmd_restart ;;
    backup)     cmd_backup ;;
    rollback)   cmd_rollback ;;
    diagnose)   cmd_diagnose ;;
    help|*)
        echo ""
        echo "  Werewolf Game — Deploy Tool"
        echo "  ──────────────────────────────"
        echo "  Domain: $DOMAIN"
        if has_ssl; then
            echo "  Mode:   HTTPS (Cloudflare Origin SSL)"
        else
            echo "  Mode:   HTTP (no certs — add ssl/cert.pem + ssl/private.key)"
        fi
        echo ""
        echo "  Usage: ./deploy.sh <command>"
        echo ""
        echo "  Commands:"
        echo "    setup      First-time server setup (Docker, Git, firewall)"
        echo "    deploy     Full build and deploy (pull + build + start)"
        echo "    update     Quick update (pull + rebuild changed + restart)"
        echo "    logs       View logs (optional: ./deploy.sh logs server)"
        echo "    status     Check service status + SSL info"
        echo "    stop       Stop all services"
        echo "    restart    Restart all services"
        echo "    backup     Backup PostgreSQL database"
        echo "    rollback   Rollback to previous git commit"
        echo "    diagnose   Test nginx for redirect loops"
        echo ""
        ;;
esac
