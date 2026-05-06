#!/usr/bin/env bash
# Run ON THE VPS from repo root: bash scripts/vps-smoke.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "ERROR: .env missing in $ROOT"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

echo "==> prisma validate"
npx prisma validate

echo "==> prisma migrate deploy"
npx prisma migrate deploy

echo "==> DB smoke (User row count)"
printf 'SELECT COUNT(*)::bigint AS n FROM "User";' | npx prisma db execute --stdin 2>/dev/null || echo "WARN: prisma db execute skipped or failed (CLI/permissions)."

APP_PORT="${APP_PORT:-3050}"
if curl -sf -o /dev/null "http://127.0.0.1:${APP_PORT}/"; then
  echo "==> HTTP OK on http://127.0.0.1:${APP_PORT}/"
else
  echo "WARN: no HTTP on port ${APP_PORT} — run npm run dev (or your prod server) for full smoke."
fi

if curl -sf "http://127.0.0.1:${APP_PORT}/api/live" | grep -q '"ok":true'; then
  echo "==> /api/live OK (process up)"
else
  echo "WARN: /api/live unreachable."
fi

if curl -sf "http://127.0.0.1:${APP_PORT}/api/health" | grep -q '"ok":true'; then
  echo "==> /api/health OK (DB reachable)"
elif curl -sf "http://127.0.0.1:${APP_PORT}/api/health" | grep -q .; then
  echo "WARN: /api/health responded but DB check failed (see JSON)"
else
  echo "WARN: /api/health unreachable — server may be down or route not mounted yet."
fi

if curl -sf -o /dev/null "http://127.0.0.1/"; then
  echo "==> Nginx OK on http://127.0.0.1/ (port 80)"
else
  echo "WARN: nothing on :80 — configure Nginx proxy when deploying behind a domain."
fi

echo "==> Smoke finished."
