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

Frontend will be available at: http://localhost:8000

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
