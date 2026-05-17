#!/usr/bin/env bash
#
# Official VPS Docker backend deploy — single entrypoint (branch-safe, verifiable).
#
# Run ON THE VPS from repo root (or pipe via SSH from dev machine).
#
# Env (optional):
#   VPS_REPO_DIR       — default /root/predictio
#   VPS_DEPLOY_BRANCH  — default master (only production branch supported here)
#   COMPOSE_FILE       — default docker-compose.prod.yml
#   DEACTIVATE_CURATED — set to 1 to deactivate all curated rows before rebuild (re-seed on boot)
#   VERSION_CHECK_URL  — default https://api.predictio.live/api/v1/version
#   SKIP_VERSION_CHECK — set to 1 to skip HTTP SHA verification
#
set -euo pipefail

: "${VPS_REPO_DIR:=/root/predictio}"
: "${VPS_DEPLOY_BRANCH:=master}"
: "${COMPOSE_FILE:=docker-compose.prod.yml}"
: "${VERSION_CHECK_URL:=https://api.predictio.live/api/v1/version}"

cd "$VPS_REPO_DIR"

dc() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

echo "==> [1/7] git fetch + pull origin/$VPS_DEPLOY_BRANCH"
git fetch origin "$VPS_DEPLOY_BRANCH"
git checkout "$VPS_DEPLOY_BRANCH"
git pull origin "$VPS_DEPLOY_BRANCH"

EXPECTED_SHA="$(git rev-parse HEAD)"
EXPECTED_SHORT="${EXPECTED_SHA:0:7}"

echo "==>    working tree SHA=$EXPECTED_SHORT ($EXPECTED_SHA)"

export GIT_COMMIT_SHA="$EXPECTED_SHA"
export GIT_BRANCH="$VPS_DEPLOY_BRANCH"
export BUILD_TIME_ISO="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "==>    docker build-args: GIT_COMMIT_SHA=$EXPECTED_SHORT… GIT_BRANCH=$GIT_BRANCH BUILD_TIME_ISO=$BUILD_TIME_ISO"

if [[ "${DEACTIVATE_CURATED:-}" == "1" ]]; then
  echo "==> [2/7] DEACTIVATE_CURATED=1 — deactivate curated_events (re-seed on next boot)"
  PGU="$(dc exec -T postgres printenv POSTGRES_USER | tr -d '\r\n')"
  PGD="$(dc exec -T postgres printenv POSTGRES_DB | tr -d '\r\n')"
  if [[ -f scripts/vps-deactivate-all-curated.sql ]]; then
    cat scripts/vps-deactivate-all-curated.sql | dc exec -T postgres psql -U "$PGU" -d "$PGD" -v ON_ERROR_STOP=1
  else
    printf '%s\n' 'UPDATE "curated_events" SET "isActive" = false;' | dc exec -T postgres psql -U "$PGU" -d "$PGD" -v ON_ERROR_STOP=1
  fi
else
  echo "==> [2/7] skip curated deactivation (set DEACTIVATE_CURATED=1 to force)"
fi

echo "==> [3/7] docker compose build backend (embeds GIT_* into image)"
dc build backend

echo "==> [4/7] docker compose up -d --force-recreate backend"
dc up -d backend --force-recreate

echo "==> [5/7] wait for health"
sleep 12

echo "==> [6/7] backend logs (tail)"
dc logs backend --tail 80

if command -v node >/dev/null 2>&1 && [[ -f src/server/scripts/runGlobalPaperSettlementTick.ts ]]; then
  echo "==> [6b] global paper settlement tick (open orders)"
  node --env-file=.env --import tsx src/server/scripts/runGlobalPaperSettlementTick.ts || echo "WARN: settlement tick failed (non-fatal)"
fi

if [[ "${SKIP_VERSION_CHECK:-}" == "1" ]]; then
  echo "==> [7/7] SKIP_VERSION_CHECK=1 — not calling public version URL"
  echo "OK: deploy finished (no remote SHA check). Expected SHA=$EXPECTED_SHORT"
  exit 0
fi

echo "==> [7/7] verify runtime SHA via $VERSION_CHECK_URL"
if ! command -v node >/dev/null 2>&1; then
  echo "WARN: node not in PATH — cannot parse version JSON. Expected SHA=$EXPECTED_SHORT — verify manually."
  exit 0
fi

RUNTIME_JSON="$(curl -fsS "$VERSION_CHECK_URL" || true)"
if [[ -z "$RUNTIME_JSON" ]]; then
  echo "WARN: version endpoint unreachable. Expected embedded SHA=$EXPECTED_SHORT — verify manually."
  exit 0
fi

RUNTIME_SHA="$(printf '%s' "$RUNTIME_JSON" | node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).gitCommitSha || ''" 2>/dev/null || true)"
if [[ -z "$RUNTIME_SHA" ]]; then
  echo "WARN: could not parse gitCommitSha from version JSON (first 200 chars): ${RUNTIME_JSON:0:200}"
  exit 0
fi

RUNTIME_SHORT="${RUNTIME_SHA:0:7}"
if [[ "$RUNTIME_SHA" != "$EXPECTED_SHA" ]]; then
  echo "ERROR: runtime SHA mismatch. expected=$EXPECTED_SHA ($EXPECTED_SHORT) runtime=$RUNTIME_SHA ($RUNTIME_SHORT)"
  echo "        GitHub updated ≠ container updated — inspect compose build-args / proxy / old container."
  exit 1
fi

echo "OK: deploy verified — runtime SHA matches tree ($RUNTIME_SHORT)"
exit 0
