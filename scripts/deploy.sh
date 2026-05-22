#!/usr/bin/env bash
# CurioCalc deploy script — run this on ryzen4u to pull latest and restart
set -euo pipefail

DEPLOY_DIR="/opt/curiocalc"
cd "$DEPLOY_DIR"

echo "🚀 Deploying CurioCalc..."

# Pull latest code
git pull origin main

# Rebuild changed images
docker compose build --parallel

# Rolling restart (postgres/redis stay up)
docker compose up -d --no-deps backend frontend

echo "✅ Deploy complete"
docker compose ps
