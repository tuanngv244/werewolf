#!/bin/bash
# ============================================
# Werewolf Game — Deploy Script
# ============================================
# Usage: ./deploy.sh [command]
# Commands: setup | deploy | update | ssl | ssl-renew | logs | status | stop | restart | backup | rollback
#
# SSL is optional. If certs exist → HTTPS. If not → HTTP still works.

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

# ─── Check if SSL certs exist ───
has_ssl() {
    [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]
}

# ─── Configure nginx for SSL or HTTP ───
configure_nginx() {
    cd "$APP_DIR"
    if has_ssl; then
        log_ok "SSL certs found → using HTTPS config"
        cp nginx/nginx-ssl.conf nginx/nginx.conf
    else
        log_warn "No SSL certs → using HTTP-only config"
        # nginx.conf is already the HTTP-only version in the repo
        # Make sure it's not the SSL version
        if grep -q "listen 443 ssl" nginx/nginx.conf 2>/dev/null; then
            git checkout nginx/nginx.conf 2>/dev/null || true
        fi
    fi
}

# ─── Configure docker-compose volumes for SSL ───
# Generates a docker-compose.ssl.yml override when SSL certs exist
configure_ssl_compose() {
    cd "$APP_DIR"
    local override_file="docker-compose.ssl.yml"

    if has_ssl; then
        cat > "$override_file" <<'SSLEOF'
services:
  nginx:
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - /etc/letsencrypt/live/wolf.nguynchupanh.com/fullchain.pem:/etc/letsencrypt/live/wolf.nguynchupanh.com/fullchain.pem:ro
      - /etc/letsencrypt/live/wolf.nguynchupanh.com/privkey.pem:/etc/letsencrypt/live/wolf.nguynchupanh.com/privkey.pem:ro
      - /etc/letsencrypt/archive/wolf.nguynchupanh.com/:/etc/letsencrypt/archive/wolf.nguynchupanh.com/:ro
SSLEOF
        log_ok "SSL compose override created"
    else
        # Remove override if it exists
        rm -f "$override_file"
    fi
}

# ─── Update .env.production URLs for http/https ───
configure_env_urls() {
    cd "$APP_DIR"
    if has_ssl; then
        local scheme="https"
    else
        local scheme="http"
    fi

    # Update CORS_ORIGIN, NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL
    sed -i "s|CORS_ORIGIN=http[s]*://$DOMAIN|CORS_ORIGIN=${scheme}://$DOMAIN|" "$ENV_FILE"
    sed -i "s|NEXT_PUBLIC_API_URL=http[s]*://$DOMAIN|NEXT_PUBLIC_API_URL=${scheme}://$DOMAIN|" "$ENV_FILE"
    sed -i "s|NEXT_PUBLIC_WS_URL=http[s]*://$DOMAIN|NEXT_PUBLIC_WS_URL=${scheme}://$DOMAIN|" "$ENV_FILE"

    log_ok "URLs set to ${scheme}://$DOMAIN"
}

# ─── Get docker compose command with optional SSL override ───
dc() {
    cd "$APP_DIR"
    if [ -f "docker-compose.ssl.yml" ]; then
        docker compose -f "$COMPOSE_FILE" -f docker-compose.ssl.yml --env-file "$ENV_FILE" "$@"
    else
        docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
    fi
}

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

    # Install Certbot (optional, for SSL later)
    if ! command -v certbot &>/dev/null; then
        log_info "Installing Certbot for SSL (optional)..."
        sudo apt install -y certbot || log_warn "Certbot install failed — SSL will not be available"
    else
        log_ok "Certbot already installed"
    fi

    # Setup firewall
    log_info "Configuring firewall..."
    sudo ufw allow OpenSSH
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    echo "y" | sudo ufw enable || true
    log_ok "Firewall configured (SSH + HTTP + HTTPS)"

    # Create app directory
    mkdir -p "$APP_DIR"

    # Create backup directory
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
        log_error "Make sure .env.production is committed and pushed to git."
        exit 1
    fi

    echo ""
    log_ok "═══════════════════════════════════════"
    log_ok "  Server setup complete!"
    log_ok "═══════════════════════════════════════"
    echo ""
    echo "  Next steps:"
    echo "  1. Deploy: cd $APP_DIR && ./deploy.sh deploy"
    echo ""
    echo "  Optional (for HTTPS):"
    echo "  - Make sure DNS A record for $DOMAIN points to this server"
    echo "  - Run: ./deploy.sh ssl"
    echo "  - Then: ./deploy.sh deploy"
    echo ""
    if ! groups "$USER" | grep -q docker; then
        log_warn "Log out and back in for docker group to take effect!"
    fi
}

# ============================================
# Command: ssl
# Obtain SSL certificate with Let's Encrypt
# ============================================
cmd_ssl() {
    log_info "Obtaining SSL certificate for $DOMAIN..."

    # Check if certificate already exists
    if has_ssl; then
        log_ok "SSL certificate already exists for $DOMAIN"
        log_info "To renew, run: ./deploy.sh ssl-renew"
        return 0
    fi

    # Check certbot
    if ! command -v certbot &>/dev/null; then
        log_error "Certbot not installed. Run: sudo apt install -y certbot"
        exit 1
    fi

    # Stop nginx if running (certbot needs port 80)
    log_info "Stopping nginx container if running..."
    cd "$APP_DIR"
    dc stop nginx 2>/dev/null || true

    # Get certificate using standalone mode
    log_info "Requesting certificate from Let's Encrypt..."
    sudo certbot certonly \
        --standalone \
        --non-interactive \
        --agree-tos \
        --email admin@nguynchupanh.com \
        -d "$DOMAIN"

    if has_ssl; then
        log_ok "SSL certificate obtained successfully!"

        # Setup auto-renewal cron job
        log_info "Setting up SSL auto-renewal..."
        local cron_job="0 3 1 */2 * certbot renew --pre-hook \"docker stop werewolf-nginx 2>/dev/null || true\" --post-hook \"docker start werewolf-nginx 2>/dev/null || true\" >> /var/log/certbot-renew.log 2>&1"

        if ! sudo crontab -l 2>/dev/null | grep -q "certbot renew"; then
            (sudo crontab -l 2>/dev/null; echo "$cron_job") | sudo crontab -
            log_ok "SSL auto-renewal cron job configured"
        fi

        echo ""
        log_ok "SSL setup complete! Run './deploy.sh deploy' to apply."
    else
        log_error "Failed to obtain SSL certificate!"
        log_warn "The app will still work over HTTP at http://$DOMAIN"
    fi
}

# ============================================
# Command: ssl-renew
# Renew SSL certificate
# ============================================
cmd_ssl_renew() {
    log_info "Renewing SSL certificate for $DOMAIN..."

    cd "$APP_DIR"
    dc stop nginx 2>/dev/null || true

    sudo certbot renew --force-renewal

    # Reconfigure and restart
    configure_nginx
    configure_ssl_compose
    configure_env_urls
    dc start nginx 2>/dev/null || true

    log_ok "SSL certificate renewed!"
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

    # Auto-detect SSL and configure
    configure_nginx
    configure_ssl_compose
    configure_env_urls

    log_info "Building and starting containers..."
    dc build --no-cache
    dc up -d

    # Wait for health checks
    log_info "Waiting for services to be healthy..."
    sleep 10

    # Show status
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
    configure_nginx
    configure_ssl_compose
    configure_env_urls

    log_info "Rebuilding and restarting containers..."
    dc build
    dc up -d

    # Cleanup old images
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
        log_info "Mode: HTTPS"
        log_info "URL: https://$DOMAIN"
        local expiry
        expiry=$(sudo openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null | cut -d= -f2)
        log_info "SSL expires: $expiry"
    else
        log_info "Mode: HTTP (no SSL)"
        log_info "URL: http://$DOMAIN"
        log_warn "Run './deploy.sh ssl' to enable HTTPS"
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

    # Re-detect SSL on restart
    configure_nginx
    configure_ssl_compose
    configure_env_urls

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

    # Source env vars
    source "$ENV_FILE"

    dc exec -T postgres \
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

    # Re-detect SSL
    configure_nginx
    configure_ssl_compose
    configure_env_urls

    log_info "Rebuilding..."
    dc build
    dc up -d

    sleep 10
    cmd_status

    log_ok "Rolled back to: $(git log --oneline -1)"
}

# ============================================
# Main
# ============================================
case "${1:-help}" in
    setup)      cmd_setup ;;
    deploy)     cmd_deploy ;;
    update)     cmd_update ;;
    ssl)        cmd_ssl ;;
    ssl-renew)  cmd_ssl_renew ;;
    logs)       cmd_logs "${2:-}" ;;
    status)     cmd_status ;;
    stop)       cmd_stop ;;
    restart)    cmd_restart ;;
    backup)     cmd_backup ;;
    rollback)   cmd_rollback ;;
    help|*)
        echo ""
        echo "  Werewolf Game — Deploy Tool"
        echo "  ──────────────────────────────"
        echo "  Domain: $DOMAIN"
        if has_ssl; then
            echo "  Mode:   HTTPS (SSL active)"
        else
            echo "  Mode:   HTTP (no SSL — run './deploy.sh ssl' to enable)"
        fi
        echo ""
        echo "  Usage: ./deploy.sh <command>"
        echo ""
        echo "  Commands:"
        echo "    setup      First-time server setup (Docker, Git, firewall)"
        echo "    deploy     Full build and deploy (pull + build + start)"
        echo "    update     Quick update (pull + rebuild changed + restart)"
        echo "    ssl        Obtain SSL certificate (optional, for HTTPS)"
        echo "    ssl-renew  Force renew SSL certificate"
        echo "    logs       View logs (optional: ./deploy.sh logs server)"
        echo "    status     Check service status"
        echo "    stop       Stop all services"
        echo "    restart    Restart all services"
        echo "    backup     Backup PostgreSQL database"
        echo "    rollback   Rollback to previous git commit"
        echo ""
        ;;
esac
