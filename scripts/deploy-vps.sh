#!/usr/bin/env bash
# Deploy da macchina locale → VPS (richiede ssh verso il server).
# Usa lo stesso flusso di produzione: compose prod, SQL deactivate, rebuild backend.
set -euo pipefail

HOST="${VPS_HOST:-root@72.62.114.251}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Deploy su $HOST (stdin → bash -s sul server)"
ssh -o BatchMode=yes "$HOST" "bash -s" <"$ROOT_DIR/scripts/vps-prod-reload-curation.sh"

echo "==> Health pubblico"
curl -fsS "https://api.predictio.live/api/v1/health"
echo ""
echo "OK: deploy completato"
