Write-Host "🚀 Avvio Predictio Dev Environment..." -ForegroundColor Cyan

# 1. Avvia Postgres via Docker
Write-Host "📦 Avvio Postgres..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml up -d postgres

# 2. Aspetta che Postgres sia pronto
Write-Host "⏳ Attendo Postgres (8 secondi)..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# 3. Verifica che Postgres risponda
$pg = Test-NetConnection localhost -Port 5433 -WarningAction SilentlyContinue
if (-not $pg.TcpTestSucceeded) {
    Write-Host "❌ Postgres non risponde sulla 5433. Controlla Docker." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Postgres online" -ForegroundColor Green

# 4. Avvia backend in nuova finestra
Write-Host "🔧 Avvio Backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm run dev"

# 5. Aspetta che backend sia pronto
Start-Sleep -Seconds 5

# 6. Avvia frontend in nuova finestra
Write-Host "🎨 Avvio Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run dev"

Write-Host "✅ Tutto avviato!" -ForegroundColor Green
Write-Host "🌐 Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "🔧 Backend:  http://localhost:3001" -ForegroundColor Cyan
Write-Host "📊 Admin:    http://localhost:5173/admin/event-curation" -ForegroundColor Cyan
