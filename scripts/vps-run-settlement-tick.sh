#!/usr/bin/env bash
# Run global paper settlement on the VPS host (cron + post-deploy).
# Requires postgres published on 127.0.0.1:5432 and repo node_modules.
set -euo pipefail

ROOT="${VPS_REPO_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "ERROR: .env missing in $ROOT"
  exit 1
fi

SETTLE_DB_URL="$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//')"
SETTLE_DB_URL="${SETTLE_DB_URL//@postgres:/@127.0.0.1:}"
SETTLE_DB_URL="${SETTLE_DB_URL//@predictio-postgres-1:/@127.0.0.1:}"

if [[ -z "$SETTLE_DB_URL" ]]; then
  echo "ERROR: DATABASE_URL not set in .env"
  exit 1
fi

export DATABASE_URL="$SETTLE_DB_URL"
export NODE_TLS_REJECT_UNAUTHORIZED="${NODE_TLS_REJECT_UNAUTHORIZED:-0}"

# Host Prisma client must match root schema (CuratedEvent, Order, etc.)
if [[ -f prisma/schema.prisma ]]; then
  npx prisma generate --schema=prisma/schema.prisma
fi

# Azuro REST oracle (PR22) — settlement must not use stale data-feed subgraph
export AZURO_USE_REST_ORACLE="${AZURO_USE_REST_ORACLE:-true}"
export AZURO_USE_REST_FEED="${AZURO_USE_REST_FEED:-true}"
export AZURO_ENVIRONMENT="${AZURO_ENVIRONMENT:-PolygonUSDT}"
export AZURO_REST_API_BASE="${AZURO_REST_API_BASE:-https://api.onchainfeed.org/api/v1/public/market-manager}"

# Legacy subgraph — fallback only when REST oracle disabled
FEED="$(grep -E '^AZURO_DATA_FEED_URL=' .env 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//')"
if [[ -n "$FEED" ]]; then
  export AZURO_DATA_FEED_URL="$FEED"
  unset AZURO_GRAPHQL_URL 2>/dev/null || true
fi

exec node --import tsx src/server/scripts/runGlobalPaperSettlementTick.ts
