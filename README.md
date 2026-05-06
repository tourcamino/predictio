# Predictio.live

Sports prediction markets on Base. Trade on real sports outcomes with USDC.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or pnpm

### Installation

```bash
# Clone repository
git clone <your-repo>
cd predictio

# Install dependencies
npm install

# Set up environment (no API keys needed for demo mode)
cp .env.example .env.local

# Start development server
npm run dev
```

Frontend dev URL: **http://127.0.0.1:5173** (or http://localhost:5173). On Windows, `HOST=127.0.0.1` is set by default so the browser can reach the server; override `PORT` / `HOST` in `.env` if needed.

---

## 📚 Documentation

All comprehensive documentation is in the `/docs` folder:

- **[ENV.md](docs/ENV.md)** — Complete environment variables reference
- **[FEATURES.md](docs/FEATURES.md)** — Feature status and implementation roadmap
- **[CURSOR_HANDOFF.md](docs/CURSOR_HANDOFF.md)** — Developer guide and architecture

---

## 🏗️ Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + TanStack Router
- **Styling:** Tailwind CSS
- **State:** Zustand
- **Blockchain:** Wagmi v2 + Viem (Base network)
- **API:** tRPC (currently mock, backend to be built)

---

## 🎯 Current Status

✅ **Frontend Complete** — Full UI/UX with mock data  
✅ **Backend C1+C2 Complete** — REST API + hardening deployed on VPS (`https://api.predictio.live`)  
⚠️ **Smart Contracts Needed** — See `docs/FEATURES.md` section C4  

The app currently runs in **demo mode** with mock data. No API keys or backend required for development.

---

## 🚢 Deployment

### Frontend (Vercel)
1. Push to GitHub
2. Import project on Vercel
3. Add environment variables (see `docs/ENV.md`)
4. Deploy

### Backend (VPS)
See `docs/CURSOR_HANDOFF.md` for complete deployment instructions.

#### C2 notes
- `ADMIN_API_KEY` is required for `/api/admin/*` and `/api/developer/keys`
- Vercel preview origins (`https://*.vercel.app`) are allowed by backend CORS for testing

#### Admin ops endpoints (VPS)
- `GET /api/admin/keys`: list/search API keys (admin key)
- `POST /api/developer/keys/revoke`: revoke key by `id` (admin key)
- `POST /api/developer/keys/revoke-lookup`: revoke key by `keyPrefix` + `keySuffix` (admin key)
- `GET /api/admin/wallet/:walletAddress/keys`: list wallet keys + usage24h (admin key)
- `POST /api/admin/wallet/:walletAddress/disable-keys`: revoke+disable all active keys for wallet (admin key)
- `GET /api/admin/usage`: raw ApiUsage rows (admin key)
- `GET /api/admin/usage/summary`: aggregated usage by apiKeyId/endpoint (admin key)
- `GET /api/admin/usage/by-wallet`: aggregated usage by wallet (admin key)
- `GET /api/admin/usage/by-endpoint`: aggregated usage by endpoint/method/status (admin key)
- `POST /api/admin/usage/purge`: delete ApiUsage older than N days (admin key)
- `GET /api/admin/ws/stats`: websocket connection stats (admin key)

---

## ✅ Smoke tests (C4)

These scripts help validate the backend is **online + stable** after deploys.

- **HTTP E2E smoke (recommended)**:

```bash
# Prod
SMOKE_BASE_URL=https://api.predictio.live npm run smoke:e2e

# With auth checks enabled
SMOKE_BASE_URL=https://api.predictio.live BOT_API_KEY=... npm run smoke:e2e
SMOKE_BASE_URL=https://api.predictio.live ADMIN_API_KEY=... npm run smoke:e2e
```

- **WebSocket smoke (optional)**:

```bash
WS_URL=wss://api.predictio.live/ws BOT_API_KEY=... npm run smoke:ws
```

- **Remote VPS verify over SSH**:

```bash
VPS_HOST=72.62.114.251 ADMIN_API_KEY=... npm run vps:verify
```

---

## 📖 For Developers

**New to this project?** Start here:
1. Read `docs/CURSOR_HANDOFF.md` — Understand the architecture
2. Read `docs/FEATURES.md` — See what's built and what's needed
3. Read `docs/ENV.md` — Configure your environment

**Building the backend?** See `docs/FEATURES.md` section C1 for the complete specification.

---

## 🔐 Environment Variables

See `.env.example` for a template. Full documentation in `docs/ENV.md`.

**For demo mode:** No environment variables required.  
**For production:** See `docs/ENV.md` for required variables.

---

## 📄 License

Proprietary — All rights reserved

---

## 🆘 Support

- **Documentation:** See `/docs` folder
- **Issues:** Open an issue on GitHub
- **Email:** admin@predictio.live

---

**Built with ⚡ by the Predictio team**

predictio.live — Where data meets prediction
