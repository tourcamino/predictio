#!/bin/bash
echo "🚀 Deploy Predictio su VPS..."

# Pull ultimo codice
ssh root@72.62.114.251 "cd /root/predictio && git pull origin main"

# Rebuild e restart container backend
ssh root@72.62.114.251 "cd /root/predictio && docker-compose build backend && docker-compose up -d backend"

# Aspetta avvio
sleep 10

# Verifica health
curl https://api.predictio.live/api/health

echo "✅ Deploy completato"
