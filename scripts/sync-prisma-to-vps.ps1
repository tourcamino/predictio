# Sync prisma/ (schema + migrations) to VPS. Run from repo root or any dir:
#   pwsh -File scripts/sync-prisma-to-vps.ps1
# Requires OpenSSH scp and SSH key access to the server.

param(
    [string]$VpsHost = "72.62.114.251",
    [string]$User = "root",
    [string]$RemotePath = "/root/predictio"
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$proj = Resolve-Path (Join-Path $here "..")
$prismaLocal = Join-Path $proj "prisma"

if (-not (Test-Path $prismaLocal)) {
    throw "Missing prisma folder: $prismaLocal"
}

Write-Host "Syncing prisma -> ${User}@${VpsHost}:${RemotePath}/prisma ..."
scp -r "$prismaLocal" "${User}@${VpsHost}:${RemotePath}/"
Write-Host "Done. Verify HTTP from PC: npm run vps:verify -- -VpsHost $VpsHost"
Write-Host "Or on VPS: cd $RemotePath && bash scripts/vps-smoke.sh"
