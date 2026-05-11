Write-Host "[Predictio] Republish eventi italiani su DB..." -ForegroundColor Cyan

$adminKey = $env:ADMIN_SECRET_KEY
if ([string]::IsNullOrWhiteSpace($adminKey)) { $adminKey = $env:ADMIN_SECRET }
if ([string]::IsNullOrWhiteSpace($adminKey)) { $adminKey = "dev_bot_key" }

# Chiama admin endpoint per caricare eventi Azuro
$azuroEvents = Invoke-RestMethod -Uri "http://localhost:3001/api/admin/azuro-events" `
    -Headers @{"x-admin-key" = $adminKey } `
    -Method GET

Write-Host "Trovati $($azuroEvents.total) eventi" -ForegroundColor Yellow

# Prendi i primi 9 per importanceScore
$list = $azuroEvents.events
if (-not $list -or $list.Count -eq 0) { $list = $azuroEvents.games }
$top9 = $list | Sort-Object -Property importanceScore -Descending | Select-Object -First 9

foreach ($event in $top9) {
    Write-Host "  Pubblico: $($event.title)" -ForegroundColor White
    # API expects `selected` (see adminCuration POST /api/admin/events/select)
    $body = @{ gameId = $event.gameId; selected = $true } | ConvertTo-Json
    $null = Invoke-RestMethod -Uri "http://localhost:3001/api/admin/events/select" `
        -Headers @{"x-admin-key" = $adminKey; "Content-Type" = "application/json"} `
        -Method POST `
        -Body $body
}

Write-Host "OK Pubblicati $($top9.Count) eventi!" -ForegroundColor Green
Write-Host "Verifica: http://localhost:5173/markets" -ForegroundColor Cyan
