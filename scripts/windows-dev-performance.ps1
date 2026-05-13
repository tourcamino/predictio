<#
.SYNOPSIS
  Optional Windows tweaks for faster npm/pnpm installs (Defender exclusion + OneDrive warning).

.EXAMPLE
  # From repo root — show checks only
  .\scripts\windows-dev-performance.ps1

.EXAMPLE
  # Run PowerShell as Administrator, then:
  .\scripts\windows-dev-performance.ps1 -AddDefenderExclusion
#>
param(
  [switch] $AddDefenderExclusion
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$nodeModules = Join-Path $repoRoot "node_modules"

Write-Host "Repo root: $repoRoot"
Write-Host "node_modules: $nodeModules"

if ($repoRoot.Path -match "OneDrive") {
  Write-Warning "Path is under OneDrive. Installs will be slower; see docs/WINDOWS_DEV_PERFORMANCE.md — prefer e.g. C:\dev\<repo>."
} else {
  Write-Host "Path does not look like OneDrive (good for I/O)." -ForegroundColor Green
}

if (-not (Test-Path $nodeModules)) {
  Write-Host "node_modules not present yet (run npm install first). Defender exclusion can still be added for future installs." -ForegroundColor Yellow
}

if ($AddDefenderExclusion) {
  $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)
  if (-not $isAdmin) {
    Write-Error "Re-run in an elevated PowerShell (Run as administrator) to add Defender exclusions."
  }
  try {
    Add-MpPreference -ExclusionPath $nodeModules
    Write-Host "Added Defender exclusion for: $nodeModules" -ForegroundColor Green
  } catch {
    Write-Error "Add-MpPreference failed: $_"
  }
} else {
  Write-Host "Skip -AddDefenderExclusion to add a Windows Defender folder exclusion for node_modules (requires admin)." -ForegroundColor Cyan
}
