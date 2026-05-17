#!/usr/bin/env bash
# Install /etc/cron.d/predictio-settlement (every 5 minutes).
set -euo pipefail

: "${VPS_REPO_DIR:=/root/predictio}"
CRON_FILE="/etc/cron.d/predictio-settlement"
LOG="/var/log/predictio-settlement.log"

cat >"$CRON_FILE" <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
*/5 * * * * root cd ${VPS_REPO_DIR} && ${VPS_REPO_DIR}/scripts/vps-run-settlement-tick.sh >>${LOG} 2>&1
EOF

chmod 644 "$CRON_FILE"
touch "$LOG"
chmod 644 "$LOG"
echo "Installed $CRON_FILE (logs: $LOG)"
