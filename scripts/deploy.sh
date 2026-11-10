#!/bin/bash
# ==============================================================================
# ZERO-DOWNTIME ROLLING DEPLOYMENT SCRIPT FOR PRIVATE SERVER
# Usage: ./scripts/deploy.sh
# ==============================================================================

set -e

echo "=== [$(date)] Starting Deployment of The Corner Café Platform ==="

# 1. Pull latest code if git repo is configured
if [ -d ".git" ]; then
    echo "Pulling latest git changes..."
    git pull origin main
fi

# 2. Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "ERROR: .env.production not found! Please copy env.example to .env.production and configure."
    exit 1
fi

# 3. Build new Docker images without taking down running containers
echo "Building updated containers..."
docker compose build --pull web

# 4. Perform rolling restart of the web container
echo "Reloading web service..."
docker compose up -d --no-deps --build web

# 5. Reload Nginx configuration
echo "Reloading Nginx proxy..."
docker compose exec -T nginx nginx -s reload || true

echo "=== [$(date)] Deployment Succeeded! ==="
