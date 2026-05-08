#!/usr/bin/env bash
# Postgres via docker-compose.dev.yml + prisma migrate deploy.
# Run on VPS/Linux from repo root after: git pull
#
#   chmod +x scripts/vps-docker-migrate.sh
#   ./scripts/vps-docker-migrate.sh
#
# Env:
#   DATABASE_URL (default postgresql://postgres:postgres@127.0.0.1:5432/predictio)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:5432/predictio}"

echo "==> Docker: Postgres"
docker compose -f docker-compose.dev.yml up -d

echo "==> Wait for Postgres"
for _ in $(seq 1 60); do
  if docker compose -f docker-compose.dev.yml exec -T postgres pg_isready -U postgres -d predictio 2>/dev/null; then
    break
  fi
  sleep 1
done

echo "==> prisma migrate deploy"
npx prisma migrate deploy

echo "OK: DB ready & migrations applied"
