#!/usr/bin/env bash
# Deactivate all curated rows, then run the standard backend deploy (same as manual deploy).
# Prefer calling scripts/vps-deploy-backend.sh directly with DEACTIVATE_CURATED=1.
set -euo pipefail
export DEACTIVATE_CURATED=1
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/vps-deploy-backend.sh"
