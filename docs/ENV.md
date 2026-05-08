# Environment Variables — Predictio.live

**CRITICAL:** Never commit real values to GitHub. Always use `.env.example` for templates.

This document lists all environment variables required for Predictio.live across frontend, backend, and autonomous bots.

---

## 📦 FRONTEND (.env.local)

Copy `.env.example` to `.env.local` and fill in values.

```bash
# Application Identity
VITE_APP_NAME=Predictio
VITE_APP_URL=https://predictio.live
VITE_ENVIRONMENT=production                    # development | production

# API Endpoints
VITE_API_URL=https://api.predictio.live        # Backend REST API
VITE_WS_URL=wss://api.predictio.live/ws       # WebSocket server

# Blockchain Configuration
VITE_BASE_RPC_URL=https://mainnet.base.org
VITE_BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
VITE_CHAIN_ID=8453                             # Base mainnet (84532 for Sepolia)
VITE_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# Wallet Connect
VITE_WALLETCONNECT_PROJECT_ID=                 # Get from cloud.walletconnect.com
                                               # Current: Not required (demo mode works)
                                               # Production: MUST set for real wallet connection

# Azuro Protocol (Sports Data Oracle)
VITE_AZURO_API_URL=https://thegraph.com/hosted-service/subgraph/azuro-protocol/azuro-api-gnosis
VITE_AZURO_API_KEY=                            # Get from azuro.org
VITE_AZURO_CHAIN_ID=100                        # Gnosis Chain (where Azuro is deployed)
                                               # Current: Optional (fallback mock data works)
                                               # Production: MUST set for real sports data

# AI Content Generation
VITE_OPENROUTER_KEY=                           # Get from openrouter.ai (for AI insights)
                                               # Current: Optional (UI works without AI features)
                                               # Production: MUST set for AI-powered content
```

**Frontend Environment Status:**
- ✅ **Working without changes:** App runs in demo mode with mock data
- ⚠️ **Required for production:**
  - `VITE_WALLETCONNECT_PROJECT_ID` — For real wallet connections
  - `VITE_AZURO_API_KEY` — For live sports data
  - `VITE_OPENROUTER_KEY` — For AI-generated insights
  - `VITE_API_URL` — Must point to real backend (currently uses mock tRPC)

---

## 🖥️ BACKEND (.env)

Backend is **NOT YET IMPLEMENTED**. This section defines what will be needed when building the Express.js API (see `docs/FEATURES.md` section C1).

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/predictio
# Local dev: use `localhost` (see docker-compose.dev.yml port mapping). Hostname `postgres` only works when the Node process runs inside the same Docker Compose network.
# Example production: postgresql://predictio:STRONG_PASSWORD@postgres:5432/predictio
# Optional Prisma logs (quieter default in development — see src/server/db.ts): PRISMA_LOG=silent | verbose | query,warn,error
# Current: NOT SET (backend not built yet)
# Production: MUST create PostgreSQL database and set this

# Redis Cache
REDIS_URL=redis://localhost:6379
# Example production: redis://redis:6379
# Current: NOT SET (backend not built yet)
# Production: MUST set for caching and rate limiting

# Authentication & Security
JWT_SECRET=                                    # Generate: openssl rand -hex 64
                                               # Current: NOT SET
                                               # Production: MUST set (64+ char random string)

ADMIN_PASSWORD=                                # Admin dashboard password
                                               # Current: NOT SET
                                               # Production: MUST set (strong password)

ADMIN_SECRET=                                  # API secret for bot authentication
                                               # Generate: openssl rand -hex 32
                                               # Current: NOT SET
                                               # Production: MUST set for bot endpoints

# Blockchain RPC
BASE_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
PRIVATE_KEY=                                   # Wallet private key for contract deployment
                                               # Current: NOT SET
                                               # Production: MUST set (keep EXTREMELY secure)

USDC_BASE=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# Azuro Protocol Integration
AZURO_API_KEY=                                 # Same as frontend
AZURO_GRAPHQL_URL=https://thegraph.com/hosted-service/subgraph/azuro-protocol/azuro-api-gnosis

# AI Services
OPENROUTER_KEY=                                # Same as frontend (for server-side AI)

# Social Media APIs
X_API_KEY=                                     # Twitter/X API v2 credentials
X_API_SECRET=                                  # Get from developer.twitter.com
X_ACCESS_TOKEN=                                # Current: NOT SET
X_ACCESS_SECRET=                               # Production: MUST set for Growth Engine bot

TELEGRAM_BOT_TOKEN=                            # Get from @BotFather on Telegram
                                               # Current: NOT SET
                                               # Production: MUST set for Telegram notifications

# Vault & AMM Configuration
VAULT_SEED_AMOUNT=500                          # Initial liquidity in USDC
VAULT_MAX_CAP_PER_MARKET=0.30                 # 30% max allocation per market (hardcoded rule)
AMM_SPREAD=0.02                                # 2% target spread
AMM_INTERVAL_SECONDS=30                        # Bot rebalance frequency

# Server Configuration
CORS_ORIGIN=https://predictio.live            # Comma-separated for multiple: https://predictio.live,https://www.predictio.live
PORT=3001                                      # Backend API port
NODE_ENV=production                            # development | production
```

**Backend Environment Status:**
- ❌ **Not implemented yet:** Entire backend needs to be built (C1 priority)
- 📋 **When building backend:**
  - Set up PostgreSQL with Prisma schema (see `prisma/schema.prisma`)
  - Implement all REST endpoints (see `docs/FEATURES.md` for API list)
  - Configure Redis for caching
  - Set up JWT authentication
  - Create admin authentication middleware

---

## 🤖 BOT: MARKET MAKER (.env)

Market Maker bot is **PARTIALLY IMPLEMENTED** (mock loop exists in frontend, real bot needs to be built).

```bash
# Bot Authentication
BOT_API_KEY=                                   # Must match backend ADMIN_SECRET
                                               # Current: NOT SET
                                               # Production: MUST set

# Backend Connection
API_URL=https://api.predictio.live/api/v1     # Backend REST API
                                               # Current: NOT SET (bot not built)
                                               # Production: MUST point to real backend

# Market Maker Configuration
MARKET_MAKER_MAX_EXPOSURE=5000                # Max USDC per market
MARKET_MAKER_TARGET_SPREAD=0.02               # 2% spread target
MARKET_MAKER_REBALANCE_INTERVAL=30            # Seconds between rebalance cycles
MARKET_MAKER_MIN_LIQUIDITY=100                # Minimum liquidity threshold

# Azuro Integration (for fair value)
AZURO_API_KEY=                                 # Same as backend
AZURO_GRAPHQL_URL=https://thegraph.com/hosted-service/subgraph/azuro-protocol/azuro-api-gnosis

# Risk Management
MARKET_MAKER_MAX_POSITION_SIZE=0.30           # 30% of vault per market (hardcoded)
MARKET_MAKER_STOP_LOSS=0.10                   # 10% stop loss per market
```

**Market Maker Bot Status:**
- ⚠️ **Partially implemented:** Mock AMM logic exists in frontend (`src/components/admin/AMMBotPanel.tsx`)
- ❌ **Not deployed:** Real bot process needs to be created (C2 priority)
- 📋 **To build:**
  - Create `/bots/marketMaker/index.ts` (see `docs/FEATURES.md` C2)
  - Fetch fair value from Azuro every 30s
  - Place limit orders via backend API
  - Respect 30% cap per market
  - Log all activity

---

## 🤖 BOT: GROWTH ENGINE (.env)

Growth Engine bot is **PARTIALLY IMPLEMENTED** (UI exists in admin panel, real bot needs to be built).

```bash
# Bot Authentication
BOT_API_KEY=                                   # Must match backend ADMIN_SECRET

# Backend Connection
API_URL=https://api.predictio.live/api/v1

# AI Content Generation
OPENROUTER_KEY=                                # For Claude API (content generation)
GROWTH_ENGINE_MODEL=anthropic/claude-3-haiku  # AI model to use
GROWTH_ENGINE_MAX_TOKENS=500                   # Max tokens per generation

# Social Media
X_API_KEY=                                     # Twitter/X credentials
X_API_SECRET=
X_ACCESS_TOKEN=
X_ACCESS_SECRET=
TELEGRAM_BOT_TOKEN=                            # Telegram bot token
TELEGRAM_CHANNEL_ID=@predictio                # Telegram channel to post to

# Bot Behavior
GROWTH_ENGINE_CYCLE_HOURS=2                    # Hours between content cycles (2-3)
GROWTH_ENGINE_MAX_DMS=5                        # Max DMs per day to users
GROWTH_ENGINE_ENGAGEMENT_THRESHOLD=3           # Min interactions before DM
GROWTH_ENGINE_CONTENT_TYPES=preMatch,lastHour,controversial
```

**Growth Engine Bot Status:**
- ⚠️ **Partially implemented:** Admin UI exists (`src/routes/admin/growth/index.tsx`)
- ⚠️ **Frontend logic exists:** Content generation logic in `src/growthEngine/` folder
- ❌ **Not deployed:** Real bot process needs to be created (C3 priority)
- 📋 **To build:**
  - Create `/bots/growthEngine/index.ts`
  - Use existing logic from `src/growthEngine/` as reference
  - Run as persistent Node.js process on VPS
  - Post to X/Twitter and Telegram
  - Track engagement in database

---

## 🔧 DEPLOYMENT / VPS (.env or shell)

Additional variables for deployment scripts and VPS management.

```bash
# VPS Access
VPS_HOST=                                      # IP address of Hostinger VPS
VPS_USER=root                                  # SSH user
SSH_KEY_PATH=~/.ssh/predictio_rsa             # Path to SSH private key

# Domain Configuration
DOMAIN_API=api.predictio.live
DOMAIN_FRONTEND=predictio.live
DOMAIN_WWW=www.predictio.live

# Docker Registry (if using private registry)
DOCKER_REGISTRY=                               # Optional: ghcr.io/your-org
DOCKER_USERNAME=
DOCKER_PASSWORD=

# Monitoring & Alerts
SENTRY_DSN=                                    # Optional: Sentry error tracking
SLACK_WEBHOOK=                                 # Optional: Slack alerts
```

---

## 📊 ENVIRONMENT VARIABLE SUMMARY

### ✅ Currently Working (Demo Mode)
- Frontend runs with mock data
- No backend required
- No API keys required
- Perfect for development and testing

### ⚠️ Required for Production Launch
**Critical (app won't work without these):**
1. `DATABASE_URL` — PostgreSQL connection
2. `REDIS_URL` — Redis cache
3. `JWT_SECRET` — Authentication
4. `ADMIN_SECRET` — Bot authentication
5. `VITE_API_URL` — Must point to real backend

**Important (features won't work without these):**
1. `VITE_WALLETCONNECT_PROJECT_ID` — Real wallet connection
2. `AZURO_API_KEY` — Live sports data
3. `OPENROUTER_KEY` — AI-powered features
4. `X_API_KEY`, `X_API_SECRET`, etc. — Social media integration
5. `TELEGRAM_BOT_TOKEN` — Telegram notifications

**Optional (nice to have):**
1. `SENTRY_DSN` — Error tracking
2. `SLACK_WEBHOOK` — Team alerts
3. `UNSPLASH_ACCESS_KEY` — Auto blog images

---

## 🔐 Security Best Practices

1. **Never commit `.env` or `.env.local` to Git**
   - Already in `.gitignore`
   - Always use `.env.example` for templates

2. **Generate strong secrets:**
   ```bash
   # JWT_SECRET (64 characters)
   openssl rand -hex 64
   
   # ADMIN_SECRET (32 characters)
   openssl rand -hex 32
   
   # ADMIN_PASSWORD (use password manager)
   openssl rand -base64 32
   ```

3. **Rotate secrets regularly:**
   - Change `JWT_SECRET` every 90 days
   - Change `ADMIN_SECRET` if bot is compromised
   - Change `ADMIN_PASSWORD` every 30 days

4. **Restrict CORS:**
   - Set `CORS_ORIGIN` to exact domain
   - Never use `*` in production

5. **Use environment-specific values:**
   - Development: localhost URLs, test API keys
   - Staging: staging URLs, test API keys
   - Production: real URLs, real API keys

---

## 📝 Quick Setup Checklist

### Frontend Development
```bash
cp .env.example .env.local
# Edit .env.local - no API keys needed for demo mode
npm install
npm run dev
```

### Backend Development (when C1 is built)
```bash
# Set up PostgreSQL
createdb predictio

# Create .env
cp .env.example .env
# Edit .env - add DATABASE_URL, REDIS_URL, JWT_SECRET

# Run migrations
npx prisma migrate dev

# Start backend
cd backend
npm run dev
```

### Production Deployment
```bash
# 1. Set all environment variables on VPS
nano /var/www/predictio/.env

# 2. Set environment variables on Vercel
# Go to Vercel dashboard → Settings → Environment Variables
# Add: VITE_API_URL, VITE_WALLETCONNECT_PROJECT_ID, etc.

# 3. Deploy
./deploy.sh
```

---

## 🆘 Troubleshooting

**Frontend won't connect to backend:**
- Check `VITE_API_URL` is correct
- Check backend is running on correct port
- Check CORS settings in backend

**Wallet connection not working:**
- Verify `VITE_WALLETCONNECT_PROJECT_ID` is set
- Check WalletConnect project is active
- Try clearing browser cache

**Sports data not loading:**
- Verify `VITE_AZURO_API_KEY` is set
- Check Azuro API status
- Fallback mock data should still work

**Bot not running:**
- Verify `BOT_API_KEY` matches backend `ADMIN_SECRET`
- Check bot logs: `docker-compose logs -f market-maker-bot`
- Verify backend API is accessible from bot

---

**Last Updated:** 2025-01-29  
**Maintainer:** Predictio Team  
**For Questions:** See `docs/CURSOR_HANDOFF.md`
