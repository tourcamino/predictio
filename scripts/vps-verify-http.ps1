# Verify Vinxi (__APP_PORT__) and Nginx (:80) on the VPS over SSH — short session, SSH timeouts (reduces hang / exit 255).
# Prefer cross-platform: npm run vps:verify -- YOUR_IP  (uses scripts/vps-verify-remote.mjs)
# Or: pwsh -File scripts/vps-verify-http.ps1 -VpsHost YOUR_IP
#
param(
    [Parameter(Mandatory = $true)]
    [string]$VpsHost,
    [string]$User = "root",
    [int]$AppPort = 3050
)

$ErrorActionPreference = "Stop"

# Bash runs on the VPS only — placeholders replaced below (no PowerShell $(…)).
$remoteBash = @'
set -euo pipefail
B=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:__APP_PORT__/)
N=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/)
L=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:__APP_PORT__/api/live)
echo "backend :__APP_PORT__ -> HTTP $B"
echo "nginx :80 -> HTTP $N"
echo "/api/live -> HTTP $L"
test "$B" = "200"
test "$N" = "200"
test "$L" = "200"
echo "OK: backend + nginx + /api/live"
'@

$remoteBash = $remoteBash.Replace("__APP_PORT__", "$AppPort")

$sshArgs = @(
    "-o", "BatchMode=yes"
    "-o", "ConnectTimeout=15"
    "-o", "ServerAliveInterval=10"
    "-o", "ServerAliveCountMax=2"
    "-o", "StrictHostKeyChecking=accept-new"
    "${User}@${VpsHost}"
    $remoteBash
)

Write-Host "SSH -> ${User}@${VpsHost} (verify HTTP on :${AppPort}, :80, /api/live) ..."
& ssh @sshArgs
$code = $LASTEXITCODE
if ($code -ne 0) {
    Write-Host "FAIL: remote verify exited $code"
}
exit $code
