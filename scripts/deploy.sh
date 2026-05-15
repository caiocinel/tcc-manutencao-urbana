#!/bin/bash
# Deploy to Hetzner VPS (tcc.josemurilors.com.br)
# Run from project root after merging to master
set -e

VPS_SSH_KEY="$HOME/ssh-hetzner.key"
VPS_USER="root"
VPS_HOST="tcc.josemurilors.com.br"

echo "=== Build frontend ==="
cd frontend
npm run build
cd ..

echo "=== Copy files to VPS ==="
rsync -avz --delete \
  -e "ssh -i $VPS_SSH_KEY -o StrictHostKeyChecking=no" \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'frontend/node_modules' \
  --exclude 'backend/node_modules' \
  --exclude 'ia/__pycache__' \
  . "${VPS_USER}@${VPS_HOST}:/app/tcc-manutencao-urbana/"

echo "=== SSH: build and restart ==="
ssh -i "$VPS_SSH_KEY" -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" << 'EOF'
  set -e
  cd /app/tcc-manutencao-urbana

  # Migrate DB schema
  docker compose exec -T postgres psql -U urbana -d manutencao_urbana -c "
    ALTER TABLE defeitos ADD COLUMN IF NOT EXISTS atendente_id UUID REFERENCES users(id);
  " || true

  # Rebuild and restart all services
  docker compose up -d --build

  # Clean up old images
  docker image prune -f -a --filter "until=24h"

  echo "=== Deploy complete ==="
EOF

echo "=== Deploy finished successfully ==="
