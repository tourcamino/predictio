#!/usr/bin/env bash
# Esegui SUL VPS dalla root del repo (es. /root/predictio), oppure da Windows:
#   Get-Content scripts/vps-prod-reload-curation.sh -Raw | ssh root@HOST "bash -s"
#
# Disattiva tutti i curated → pull → rebuild backend prod → log tail.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
COMPOSE_FILE="docker-compose.prod.yml"

dc() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

echo "==> [1/5] git pull origin main"
git pull origin main

echo "==> [2/5] Disattiva curated_events (re-seed al boot)"
PGU="$(dc exec -T postgres printenv POSTGRES_USER | tr -d '\r\n')"
PGD="$(dc exec -T postgres printenv POSTGRES_DB | tr -d '\r\n')"
if [[ -f scripts/vps-deactivate-all-curated.sql ]]; then
  dc exec -T postgres psql -U "$PGU" -d "$PGD" -v ON_ERROR_STOP=1 < scripts/vps-deactivate-all-curated.sql
else
  printf '%s\n' 'UPDATE "curated_events" SET "isActive" = false;' | dc exec -T postgres psql -U "$PGU" -d "$PGD" -v ON_ERROR_STOP=1
fi

echo "==> [3/5] docker compose build backend"
dc build backend

echo "==> [4/5] docker compose up -d backend"
dc up -d backend --force-recreate

echo "==> [5/5] Attendo boot e log backend"
sleep 20
dc logs backend --tail 80

echo "OK: reload curation + backend completato"
