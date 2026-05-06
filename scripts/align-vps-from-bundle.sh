#!/usr/bin/env bash
# Run ON THE VPS after uploading predictio.git.bundle to /root/
set -euo pipefail
STAMP="$(date +%Y%m%d%H%M%S)"
BUNDLE="${1:-/root/predictio.git.bundle}"
if [[ ! -f "$BUNDLE" ]]; then
  echo "Bundle not found: $BUNDLE"
  exit 1
fi
if [[ -f /root/predictio/.env ]]; then
  cp /root/predictio/.env "/root/predictio.env.backup.${STAMP}"
  echo "Saved .env to predictio.env.backup.${STAMP}"
fi
if [[ -d /root/predictio ]]; then
  mv /root/predictio "/root/predictio.bak.${STAMP}"
  echo "Renamed old tree to predictio.bak.${STAMP}"
fi
cd /root
git clone "$BUNDLE" predictio
LAST_ENV="$(ls -t /root/predictio.env.backup.* 2>/dev/null | head -1 || true)"
if [[ -n "${LAST_ENV}" && -f "${LAST_ENV}" ]]; then
  cp "${LAST_ENV}" /root/predictio/.env
  echo "Restored .env from ${LAST_ENV}"
fi
cd /root/predictio
git remote remove origin 2>/dev/null || true
git log -1 --oneline
git status -sb
echo "Next: cd /root/predictio && pnpm install --no-frozen-lockfile && npx prisma generate"
