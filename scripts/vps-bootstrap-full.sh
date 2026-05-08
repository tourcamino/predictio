#!/usr/bin/env bash
# Full VPS bootstrap: Postgres → migrate → backend temporaneo → npm run smoke:runtime (SMOKE_STRICT=1).
# Linux/VPS only. Requires Docker.
#
# Usage (on VPS, repo root):
#   chmod +x scripts/vps-bootstrap-full.sh
#   ./scripts/vps-bootstrap-full.sh
#
# Env:
#   DATABASE_URL — default postgresql://postgres:postgres@127.0.0.1:5432/predictio
#   SKIP_BACKEND_KILL=1 — non terminare i processi sulle porte 3001/8080 dopo lo smoke (se il backend resta in esecuzione)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:5432/predictio}"

echo "==> [1/5] Docker: Postgres"
docker compose -f docker-compose.dev.yml up -d

echo "==> [2/5] Wait for Postgres"
for _ in $(seq 1 60); do
  if docker compose -f docker-compose.dev.yml exec -T postgres pg_isready -U postgres -d predictio 2>/dev/null; then
    break
  fi
  sleep 1
done

echo "==> [3/5] prisma migrate deploy"
npx prisma migrate deploy

cleanup() {
  if [[ "${SKIP_BACKEND_KILL:-}" == "1" ]]; then
    echo "==> SKIP_BACKEND_KILL=1 — non chiudo le porte 3001/8080"
    return 0
  fi
  echo "==> Chiudo listener temporanei su 3001 e 8080 (backend smoke)"
  command -v fuser >/dev/null 2>&1 && fuser -k 3001/tcp 2>/dev/null || true
  command -v fuser >/dev/null 2>&1 && fuser -k 8080/tcp 2>/dev/null || true
}
trap cleanup EXIT

echo "==> [4/5] Avvio backend (nohup, log /tmp/predictio-backend-smoke.log)"
(
  cd "$ROOT/backend"
  nohup npm run dev >> /tmp/predictio-backend-smoke.log 2>&1 &
)

echo "==> Attendo /api/v1/health su :3001"
OK=0
for _ in $(seq 1 90); do
  if curl -sf "http://127.0.0.1:3001/api/v1/health" >/dev/null 2>&1; then
    OK=1
    break
  fi
  sleep 1
done

if [[ "$OK" != "1" ]]; then
  echo "ERRORE: backend non risponde. Ultime righe log:" >&2
  tail -80 /tmp/predictio-backend-smoke.log >&2 || true
  exit 1
fi

echo "==> [5/5] smoke:runtime (SMOKE_STRICT=1)"
cd "$ROOT"
SMOKE_STRICT=1 npm run smoke:runtime

echo "OK: bootstrap + smoke strict completati"
