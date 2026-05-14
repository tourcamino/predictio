#!/bin/bash
set -e

# Compose V2 (`docker compose`) vs legacy `docker-compose` binary
docker_compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  else
    docker-compose "$@"
  fi
}

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Deploying Predictio — predictio.live${NC}"

# 1. Prerequisites
echo -e "${YELLOW}[1/8] Checking prerequisites...${NC}"
command -v docker >/dev/null || { 
  echo -e "${RED}Docker not found${NC}"; exit 1; }
[ -f .env ] || { 
  echo -e "${RED}.env missing${NC}"; exit 1; }
command -v node >/dev/null || {
  echo -e "${RED}Node not found (required for env validation)${NC}"; exit 1; }

echo -e "${YELLOW}Validating .env...${NC}"
node ./scripts/validate-env.mjs .env

# 2. Pull code
echo -e "${YELLOW}[2/8] Pulling latest code...${NC}"
git pull origin master

# 3. Build (embed git identity into backend image — required for /api/v1/version)
echo -e "${YELLOW}[3/8] Building images...${NC}"
export GIT_COMMIT_SHA="$(git rev-parse HEAD)"
export GIT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
export BUILD_TIME_ISO="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
docker_compose -f docker-compose.prod.yml build

# 4. Stop
echo -e "${YELLOW}[4/8] Stopping containers...${NC}"
docker_compose -f docker-compose.prod.yml down

# 5. Migrate DB
echo -e "${YELLOW}[5/8] Running migrations...${NC}"
docker_compose -f docker-compose.prod.yml run --rm \
  backend npx prisma migrate deploy

# 6. Start
echo -e "${YELLOW}[6/8] Starting services...${NC}"
docker_compose -f docker-compose.prod.yml up -d

# 7. Health check
echo -e "${YELLOW}[7/8] Health check...${NC}"
sleep 15
HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
  https://api.predictio.live/api/v1/health)
if [ "$HTTP" = "200" ]; then
  echo -e "${GREEN}✅ Backend healthy${NC}"
else
  echo -e "${RED}❌ Health check failed (HTTP $HTTP)${NC}"
  docker_compose -f docker-compose.prod.yml logs \
    backend --tail=50
  exit 1
fi

# 8. SSL (solo prima volta)
if [ ! -f /etc/letsencrypt/live/predictio.live/fullchain.pem ]; then
  echo -e "${YELLOW}[8/8] Setting up SSL...${NC}"
  certbot --nginx \
    -d predictio.live \
    -d www.predictio.live \
    -d api.predictio.live \
    --non-interactive \
    --agree-tos \
    --email admin@predictio.live
else
  echo -e "${YELLOW}[8/8] SSL already configured ✅${NC}"
  nginx -t && systemctl reload nginx
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Predictio live!${NC}"
echo ""
echo -e "Frontend:  ${GREEN}https://predictio.live${NC}"
echo -e "API:       ${GREEN}https://api.predictio.live${NC}"
echo -e "Health:    ${GREEN}https://api.predictio.live/api/v1/health${NC}"
echo -e "WebSocket: ${GREEN}wss://api.predictio.live/ws${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
docker_compose -f docker-compose.prod.yml ps
