# Deploy Guide — Werewolf Game (Ma Soi)

Complete deployment guide for Ubuntu server with Docker.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Quick Deploy (5 minutes)](#quick-deploy)
4. [Step-by-Step Manual Setup](#step-by-step-manual-setup)
5. [Push Code & Deploy Updates](#push-code--deploy-updates)
6. [SSL/HTTPS Setup](#sslhttps-setup)
7. [Domain Setup](#domain-setup)
8. [Management Commands](#management-commands)
9. [Monitoring & Logs](#monitoring--logs)
10. [Backup & Restore](#backup--restore)
11. [Troubleshooting](#troubleshooting)
12. [File Structure](#file-structure)

---

## Architecture Overview

```
                    ┌──────────────────────────────────────────┐
                    │            Ubuntu Server                  │
                    │                                          │
  User ──► :80 ──► │  ┌─────────┐                             │
                    │  │  Nginx  │──► /          → Client:3000 │
                    │  │ (proxy) │──► /api/      → Server:3001 │
                    │  │         │──► /socket.io → Server:3001 │
                    │  └─────────┘                             │
                    │       │                                   │
                    │  ┌────┴────────────────────────────┐     │
                    │  │                                 │     │
                    │  │  ┌──────────┐  ┌────────────┐  │     │
                    │  │  │ Next.js  │  │  NestJS    │  │     │
                    │  │  │ Client   │  │  Server    │  │     │
                    │  │  │ :3000    │  │  :3001     │  │     │
                    │  │  └──────────┘  └─────┬──────┘  │     │
                    │  │                      │         │     │
                    │  │  ┌──────────┐  ┌─────┴──────┐  │     │
                    │  │  │PostgreSQL│  │   Redis    │  │     │
                    │  │  │ :5432    │  │   :6379    │  │     │
                    │  │  └──────────┘  └────────────┘  │     │
                    │  │         Docker Network          │     │
                    │  └────────────────────────────────┘     │
                    └──────────────────────────────────────────┘
```

**Services:**

| Service    | Technology       | Port | Purpose                          |
|------------|-----------------|------|----------------------------------|
| nginx      | Nginx Alpine     | 80   | Reverse proxy, static caching    |
| client     | Next.js 15       | 3000 | Frontend (SSR + 3D game)         |
| server     | NestJS           | 3001 | API + Socket.io game engine      |
| postgres   | PostgreSQL 16    | 5432 | User data, game records, stats   |
| redis      | Redis 7          | 6379 | Game state, sessions, cache      |

---

## Prerequisites

**Server Requirements:**
- Ubuntu 20.04+ (22.04 or 24.04 recommended)
- Minimum 2 CPU, 4GB RAM (recommended: 4 CPU, 8GB RAM)
- 20GB+ disk space
- SSH access with sudo privileges
- Port 80 (HTTP) and 443 (HTTPS) open

**Local Machine:**
- Git installed
- SSH key configured for server access

---

## Quick Deploy

If you want to deploy fast, SSH into your server and run:

```bash
# 1. Download and run setup
curl -fsSL https://raw.githubusercontent.com/tuanngv244/werewolf/main/deploy.sh -o deploy.sh
chmod +x deploy.sh
sudo ./deploy.sh setup

# 2. Review generated config
nano /opt/werewolf-game/.env.production

# 3. Deploy
cd /opt/werewolf-game
./deploy.sh deploy
```

That's it! Your game is live at `http://YOUR_SERVER_IP`

---

## Step-by-Step Manual Setup

### Step 1: Connect to Your Server

```bash
# From your local machine
ssh root@YOUR_SERVER_IP

# Or with a user
ssh your-user@YOUR_SERVER_IP
```

### Step 2: Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### Step 3: Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com | sudo sh

# Add your user to docker group (no sudo needed for docker commands)
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt install -y docker-compose-plugin

# Apply group changes (or log out and back in)
newgrp docker

# Verify
docker --version
docker compose version
```

### Step 4: Install Git

```bash
sudo apt install -y git
```

### Step 5: Configure Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

### Step 6: Clone Repository

```bash
# Create app directory
sudo mkdir -p /opt/werewolf-game
sudo chown $USER:$USER /opt/werewolf-game

# Clone
git clone https://github.com/tuanngv244/werewolf.git /opt/werewolf-game
cd /opt/werewolf-game
```

### Step 7: Configure Environment

```bash
# Copy template
cp .env.production.example .env.production

# Generate secure secrets
echo "JWT_SECRET: $(openssl rand -base64 64 | tr -d '\n')"
echo "JWT_REFRESH: $(openssl rand -base64 64 | tr -d '\n')"
echo "DB_PASSWORD: $(openssl rand -base64 32 | tr -d '\n/' | head -c 32)"
echo "REDIS_PASS: $(openssl rand -base64 32 | tr -d '\n/' | head -c 32)"

# Edit and paste the generated secrets
nano .env.production
```

**Fill in `.env.production`:**

```env
# Database
POSTGRES_DB=werewolf
POSTGRES_USER=werewolf
POSTGRES_PASSWORD=<paste DB_PASSWORD here>

# Redis
REDIS_PASSWORD=<paste REDIS_PASS here>

# JWT (paste generated values)
JWT_SECRET=<paste JWT_SECRET here>
JWT_REFRESH_SECRET=<paste JWT_REFRESH here>

# URLs — Replace with your server IP or domain
CORS_ORIGIN=http://YOUR_SERVER_IP
NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP/api
NEXT_PUBLIC_WS_URL=http://YOUR_SERVER_IP
NEXT_PUBLIC_APP_NAME=Werewolf Game
NEXT_PUBLIC_DEFAULT_LOCALE=en

# Port
APP_PORT=80
```

### Step 8: Build and Deploy

```bash
# Build all containers (first time takes 5-10 minutes)
docker compose -f docker-compose.prod.yml --env-file .env.production build

# Start all services
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# Check status
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

### Step 9: Verify

```bash
# Check all containers are running
docker compose -f docker-compose.prod.yml --env-file .env.production ps

# Check logs for errors
docker compose -f docker-compose.prod.yml --env-file .env.production logs server
docker compose -f docker-compose.prod.yml --env-file .env.production logs client

# Test from server
curl http://localhost
curl http://localhost/health
```

Open your browser: `http://YOUR_SERVER_IP` — You should see the Werewolf Game!

---

## Push Code & Deploy Updates

### From Your Local Machine (Development)

**Daily workflow to push code and update server:**

```bash
# 1. Make your changes locally
# ... edit code ...

# 2. Commit and push
git add .
git commit -m "your changes"
git push origin main
```

### On the Server (Deploy Update)

**Option A: Using deploy script (recommended)**

```bash
ssh your-user@YOUR_SERVER_IP
cd /opt/werewolf-game
./deploy.sh update
```

**Option B: Manual commands**

```bash
ssh your-user@YOUR_SERVER_IP
cd /opt/werewolf-game

# Pull latest code
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.prod.yml --env-file .env.production build
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

**Option C: One-liner from local machine (SSH command)**

```bash
ssh your-user@YOUR_SERVER_IP "cd /opt/werewolf-game && ./deploy.sh update"
```

### Auto-Deploy with Git Hook (Optional)

You can set up automatic deployment when you push to GitHub:

**On the server**, create a simple webhook listener or use a cron job:

```bash
# Create auto-update cron job (checks every 5 minutes)
crontab -e

# Add this line:
*/5 * * * * cd /opt/werewolf-game && git fetch origin main && [ $(git rev-parse HEAD) != $(git rev-parse origin/main) ] && ./deploy.sh update >> /var/log/werewolf-deploy.log 2>&1
```

---

## SSL/HTTPS Setup

### Option A: Certbot (Free SSL with Let's Encrypt)

**Requirements:** A domain name pointing to your server IP.

```bash
# Install Certbot
sudo apt install -y certbot

# Stop nginx temporarily
cd /opt/werewolf-game
docker compose -f docker-compose.prod.yml --env-file .env.production stop nginx

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Certificate files will be at:
#   /etc/letsencrypt/live/yourdomain.com/fullchain.pem
#   /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

**Update `nginx/nginx.conf`** — replace the server block:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    # ... rest of nginx config stays the same ...
}
```

**Update `docker-compose.prod.yml`** — add SSL volumes to nginx:

```yaml
nginx:
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - /etc/letsencrypt/live/yourdomain.com/fullchain.pem:/etc/letsencrypt/fullchain.pem:ro
      - /etc/letsencrypt/live/yourdomain.com/privkey.pem:/etc/letsencrypt/privkey.pem:ro
```

**Update `.env.production`** URLs to use https:

```env
CORS_ORIGIN=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
NEXT_PUBLIC_WS_URL=https://yourdomain.com
```

**Rebuild client** (NEXT_PUBLIC vars are baked at build time):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production build client
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

**Auto-renew SSL:**

```bash
# Add cron job for auto-renewal
sudo crontab -e

# Add:
0 3 * * * certbot renew --pre-hook "docker stop werewolf-nginx" --post-hook "docker start werewolf-nginx" >> /var/log/certbot-renew.log 2>&1
```

### Option B: Cloudflare (Easiest)

1. Add your domain to Cloudflare (free plan)
2. Point DNS A record to your server IP
3. Enable "Flexible SSL" in Cloudflare SSL/TLS settings
4. No changes needed on server — Cloudflare handles HTTPS

---

## Domain Setup

### Point Domain to Server

1. Go to your domain registrar (Namecheap, GoDaddy, Cloudflare, etc.)
2. Add/edit DNS records:

| Type | Name | Value           | TTL  |
|------|------|-----------------|------|
| A    | @    | YOUR_SERVER_IP  | Auto |
| A    | www  | YOUR_SERVER_IP  | Auto |

3. Wait for DNS propagation (5 min — 48 hours)

4. Update `.env.production`:

```env
CORS_ORIGIN=http://yourdomain.com
NEXT_PUBLIC_API_URL=http://yourdomain.com/api
NEXT_PUBLIC_WS_URL=http://yourdomain.com
```

5. Rebuild client (because NEXT_PUBLIC vars are embedded at build time):

```bash
cd /opt/werewolf-game
docker compose -f docker-compose.prod.yml --env-file .env.production build client
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

---

## Management Commands

All commands are available via `deploy.sh`:

```bash
cd /opt/werewolf-game

# First-time setup
./deploy.sh setup

# Full deploy (pull + build from scratch + start)
./deploy.sh deploy

# Quick update (pull + rebuild changed + restart)
./deploy.sh update

# View all logs (follow mode)
./deploy.sh logs

# View specific service logs
./deploy.sh logs server
./deploy.sh logs client
./deploy.sh logs nginx
./deploy.sh logs postgres
./deploy.sh logs redis

# Check status
./deploy.sh status

# Stop everything
./deploy.sh stop

# Restart everything
./deploy.sh restart

# Backup database
./deploy.sh backup

# Rollback to previous version
./deploy.sh rollback
```

### Direct Docker Compose Commands

```bash
cd /opt/werewolf-game

# Shorthand alias (add to ~/.bashrc)
alias ww="docker compose -f docker-compose.prod.yml --env-file .env.production"

# Then use:
ww ps
ww logs -f server
ww restart server
ww exec server sh
ww exec postgres psql -U werewolf werewolf
```

---

## Monitoring & Logs

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f

# Specific service with last 100 lines
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f --tail 100 server

# Check for errors only
docker compose -f docker-compose.prod.yml --env-file .env.production logs server 2>&1 | grep -i error
```

### Resource Usage

```bash
# Container resource usage
docker stats

# Disk usage
docker system df

# Clean up unused resources
docker system prune -a --volumes
```

### Health Checks

```bash
# Nginx health
curl -s http://localhost/health

# Check individual services
docker compose -f docker-compose.prod.yml --env-file .env.production ps

# Database connection
docker compose -f docker-compose.prod.yml --env-file .env.production exec postgres pg_isready -U werewolf

# Redis connection
docker compose -f docker-compose.prod.yml --env-file .env.production exec redis redis-cli ping
```

---

## Backup & Restore

### Backup Database

```bash
# Using deploy script
./deploy.sh backup

# Manual backup
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres \
  pg_dump -U werewolf werewolf | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restore Database

```bash
# Restore from backup
gunzip -c backup_20260311_120000.sql.gz | \
  docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres \
  psql -U werewolf werewolf
```

### Backup Everything (DB + Redis + Config)

```bash
# Full backup
mkdir -p /opt/werewolf-backups/full_$(date +%Y%m%d)
cd /opt/werewolf-game

# Database
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres \
  pg_dump -U werewolf werewolf | gzip > /opt/werewolf-backups/full_$(date +%Y%m%d)/db.sql.gz

# Redis
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T redis \
  redis-cli -a YOUR_REDIS_PASSWORD BGSAVE

# Config
cp .env.production /opt/werewolf-backups/full_$(date +%Y%m%d)/
cp nginx/nginx.conf /opt/werewolf-backups/full_$(date +%Y%m%d)/
```

---

## Troubleshooting

### Container won't start

```bash
# Check logs
docker compose -f docker-compose.prod.yml --env-file .env.production logs server

# Check if port is in use
sudo lsof -i :80
sudo lsof -i :3001

# Restart from scratch
docker compose -f docker-compose.prod.yml --env-file .env.production down
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

### Build fails

```bash
# Clean Docker build cache
docker builder prune -af

# Rebuild without cache
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache
```

### Database connection error

```bash
# Check if postgres is running
docker compose -f docker-compose.prod.yml --env-file .env.production ps postgres

# Check postgres logs
docker compose -f docker-compose.prod.yml --env-file .env.production logs postgres

# Connect to database manually
docker compose -f docker-compose.prod.yml --env-file .env.production exec postgres psql -U werewolf werewolf
```

### WebSocket not connecting

```bash
# Check nginx logs for WebSocket upgrade errors
docker compose -f docker-compose.prod.yml --env-file .env.production logs nginx | grep -i upgrade

# Verify Socket.io endpoint
curl -s http://localhost/socket.io/?EIO=4&transport=polling
```

### Out of disk space

```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -a --volumes

# Clean old logs
truncate -s 0 $(docker inspect --format='{{.LogPath}}' werewolf-server)
```

### Out of memory

```bash
# Check memory
free -h

# Check container memory
docker stats --no-stream

# Restart services to free memory
./deploy.sh restart
```

### Reset everything (nuclear option)

```bash
cd /opt/werewolf-game

# Stop and remove everything (WARNING: deletes database!)
docker compose -f docker-compose.prod.yml --env-file .env.production down -v

# Rebuild from scratch
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

---

## File Structure

```
werewolf-game/
├── client/
│   └── Dockerfile              ← Next.js multi-stage build (standalone)
├── server/
│   └── Dockerfile              ← NestJS multi-stage build
├── nginx/
│   └── nginx.conf              ← Reverse proxy + WebSocket + caching
├── docker-compose.dev.yml      ← Dev: Postgres + Redis only
├── docker-compose.prod.yml     ← Prod: All 5 services
├── .env.production.example     ← Template for production env vars
├── .env.production             ← Actual production env (gitignored)
├── .dockerignore               ← Docker build exclusions
├── deploy.sh                   ← Deployment automation script
└── Deploy.md                   ← This file
```

### Environment Variables Reference

| Variable | Where Used | Description |
|----------|-----------|-------------|
| `POSTGRES_DB` | docker-compose | Database name |
| `POSTGRES_USER` | docker-compose | Database user |
| `POSTGRES_PASSWORD` | docker-compose | Database password |
| `REDIS_PASSWORD` | docker-compose | Redis auth password |
| `JWT_SECRET` | server | JWT token signing |
| `JWT_REFRESH_SECRET` | server | Refresh token signing |
| `CORS_ORIGIN` | server | Allowed CORS origin |
| `NEXT_PUBLIC_API_URL` | client (build-time) | API endpoint URL |
| `NEXT_PUBLIC_WS_URL` | client (build-time) | WebSocket server URL |
| `NEXT_PUBLIC_APP_NAME` | client (build-time) | App display name |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | client (build-time) | Default language |
| `APP_PORT` | docker-compose | Host port for nginx |

> **Note:** `NEXT_PUBLIC_*` variables are embedded into the client at **build time**. If you change them, you must rebuild the client container.
