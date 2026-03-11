# Deploy Guide — Werewolf Game (Ma Soi)

Complete deployment guide for Ubuntu server with Docker.

**Live URL:** https://wolf.nguynchupanh.com

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
                    │        wolf.nguynchupanh.com              │
                    │                                          │
  User ──► :443 ─► │  ┌─────────┐                             │
       ──► :80  ─► │  │  Nginx  │──► /          → Client:3000 │
     (redirect)    │  │ (proxy) │──► /api/      → Server:3001 │
                    │  │  + SSL  │──► /socket.io → Server:3001 │
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

| Service  | Technology    | Port     | Purpose                            |
| -------- | ------------- | -------- | ---------------------------------- |
| nginx    | Nginx Alpine  | 80 + 443 | Reverse proxy, SSL, static caching |
| client   | Next.js 15    | 3000     | Frontend (SSR + 3D game)           |
| server   | NestJS        | 3001     | API + Socket.io game engine        |
| postgres | PostgreSQL 16 | 5432     | User data, game records, stats     |
| redis    | Redis 7       | 6379     | Game state, sessions, cache        |

---

## Prerequisites

**Server Requirements:**

- Ubuntu 20.04+ (22.04 or 24.04 recommended)
- Minimum 2 CPU, 4GB RAM (recommended: 4 CPU, 8GB RAM)
- 20GB+ disk space
- SSH access with sudo privileges
- Port 80 (HTTP) and 443 (HTTPS) open

**DNS:**

- `wolf.nguynchupanh.com` A record pointing to your server IP (159.223.65.161)

**Local Machine:**

- Git installed
- SSH key configured for server access

---

## Quick Deploy

SSH into your server and run:

```bash
# 1. Download and run setup
curl -fsSL https://raw.githubusercontent.com/tuanngv244/werewolf/main/deploy.sh -o deploy.sh
chmod +x deploy.sh
sudo ./deploy.sh setup

# 2. Get SSL certificate
cd ~/app/werewolf
./deploy.sh ssl

# 3. Deploy
./deploy.sh deploy
```

That's it! Your game is live at `https://wolf.nguynchupanh.com`

---

## Step-by-Step Manual Setup

### Step 1: Connect to Your Server

```bash
ssh root@159.223.65.161
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

### Step 4: Install Git & Certbot

```bash
sudo apt install -y git certbot
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
mkdir -p ~/app/werewolf

# Clone
git clone https://github.com/tuanngv244/werewolf.git ~/app/werewolf
cd ~/app/werewolf
```

### Step 7: Get SSL Certificate

```bash
# Make sure DNS is pointing wolf.nguynchupanh.com → your server IP
# Then get certificate:
./deploy.sh ssl
```

### Step 8: Build and Deploy

```bash
# Build all containers (first time takes 5-10 minutes)
./deploy.sh deploy

# Or manually:
docker compose -f docker-compose.prod.yml --env-file .env.production build
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

### Step 9: Verify

```bash
# Check all containers are running
docker compose -f docker-compose.prod.yml --env-file .env.production ps

# Check logs for errors
docker compose -f docker-compose.prod.yml --env-file .env.production logs server
docker compose -f docker-compose.prod.yml --env-file .env.production logs client

# Test from server
curl -s https://wolf.nguynchupanh.com/health
```

Open your browser: `https://wolf.nguynchupanh.com`

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
ssh root@159.223.65.161
cd ~/app/werewolf
./deploy.sh update
```

**Option B: Manual commands**

```bash
ssh root@159.223.65.161
cd ~/app/werewolf

# Pull latest code
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.prod.yml --env-file .env.production build
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

**Option C: One-liner from local machine (SSH command)**

```bash
ssh root@159.223.65.161 "cd ~/app/werewolf && ./deploy.sh update"
```

### Auto-Deploy with Git Hook (Optional)

You can set up automatic deployment when you push to GitHub:

**On the server**, create a simple webhook listener or use a cron job:

```bash
# Create auto-update cron job (checks every 5 minutes)
crontab -e

# Add this line:
*/5 * * * * cd ~/app/werewolf && git fetch origin main && [ $(git rev-parse HEAD) != $(git rev-parse origin/main) ] && ./deploy.sh update >> /var/log/werewolf-deploy.log 2>&1
```

---

## SSL/HTTPS Setup

SSL is **already configured** for `wolf.nguynchupanh.com`. The deploy script handles everything:

### Get SSL Certificate (first time)

```bash
cd ~/app/werewolf
./deploy.sh ssl
```

This will:
1. Install Certbot if not present
2. Stop nginx temporarily
3. Obtain certificate from Let's Encrypt for `wolf.nguynchupanh.com`
4. Set up auto-renewal cron job (runs every 2 months)

### Force Renew SSL

```bash
./deploy.sh ssl-renew
```

### Check SSL Status

```bash
./deploy.sh status
# Shows SSL expiry date
```

### Auto-Renewal

The `ssl` command automatically sets up a cron job:
```
0 3 1 */2 * certbot renew --pre-hook "docker stop werewolf-nginx" --post-hook "docker start werewolf-nginx"
```

---

## Domain Setup

### DNS Records

The domain `wolf.nguynchupanh.com` should have the following DNS record:

| Type | Name | Value           | TTL  |
| ---- | ---- | --------------- | ---- |
| A    | wolf | 159.223.65.161  | Auto |

### Verify DNS

```bash
dig wolf.nguynchupanh.com +short
# Should return: 159.223.65.161
```

---

## Management Commands

All commands are available via `deploy.sh`:

```bash
cd ~/app/werewolf

# First-time setup
./deploy.sh setup

# Get SSL certificate
./deploy.sh ssl

# Force renew SSL
./deploy.sh ssl-renew

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

# Check status + SSL info
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
cd ~/app/werewolf

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
curl -s https://wolf.nguynchupanh.com/health

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
mkdir -p ~/backups/werewolf/full_$(date +%Y%m%d)
cd ~/app/werewolf

# Database
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres \
  pg_dump -U werewolf werewolf | gzip > ~/backups/werewolf/full_$(date +%Y%m%d)/db.sql.gz

# Redis
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T redis \
  redis-cli -a YOUR_REDIS_PASSWORD BGSAVE

# Config
cp .env.production ~/backups/werewolf/full_$(date +%Y%m%d)/
cp nginx/nginx.conf ~/backups/werewolf/full_$(date +%Y%m%d)/
```

---

## Troubleshooting

### Container won't start

```bash
# Check logs
docker compose -f docker-compose.prod.yml --env-file .env.production logs server

# Check if port is in use
sudo lsof -i :80
sudo lsof -i :443
sudo lsof -i :3001

# Restart from scratch
docker compose -f docker-compose.prod.yml --env-file .env.production down
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

### SSL certificate issues

```bash
# Check certificate
sudo certbot certificates

# Test SSL
curl -vI https://wolf.nguynchupanh.com 2>&1 | grep -E "SSL|subject|expire"

# Re-obtain certificate
./deploy.sh ssl-renew
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
curl -s https://wolf.nguynchupanh.com/socket.io/?EIO=4&transport=polling
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
cd ~/app/werewolf

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
│   └── nginx.conf              ← Reverse proxy + SSL + WebSocket + caching
├── docker-compose.dev.yml      ← Dev: Postgres + Redis only
├── docker-compose.prod.yml     ← Prod: All 5 services + SSL volumes
├── .env.production             ← Production env vars (domain: wolf.nguynchupanh.com)
├── .dockerignore               ← Docker build exclusions
├── deploy.sh                   ← Deployment automation script (with SSL)
└── Deploy.md                   ← This file
```

### Environment Variables Reference

| Variable                     | Where Used          | Description               |
| ---------------------------- | ------------------- | ------------------------- |
| `POSTGRES_DB`                | docker-compose      | Database name             |
| `POSTGRES_USER`              | docker-compose      | Database user             |
| `POSTGRES_PASSWORD`          | docker-compose      | Database password         |
| `REDIS_PASSWORD`             | docker-compose      | Redis auth password       |
| `JWT_SECRET`                 | server              | JWT token signing         |
| `JWT_REFRESH_SECRET`         | server              | Refresh token signing     |
| `DOMAIN`                     | deploy.sh           | Domain name               |
| `CORS_ORIGIN`                | server              | Allowed CORS origin       |
| `NEXT_PUBLIC_API_URL`        | client (build-time) | API endpoint URL          |
| `NEXT_PUBLIC_WS_URL`         | client (build-time) | WebSocket server URL      |
| `NEXT_PUBLIC_APP_NAME`       | client (build-time) | App display name          |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | client (build-time) | Default language          |
| `APP_PORT`                   | docker-compose      | Host port for HTTP (80)   |
| `APP_SSL_PORT`               | docker-compose      | Host port for HTTPS (443) |

> **Note:** `NEXT_PUBLIC_*` variables are embedded into the client at **build time**. If you change them, you must rebuild the client container.
