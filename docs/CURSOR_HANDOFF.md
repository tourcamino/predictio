# Cursor Handoff — Predictio.live

**READ THIS FIRST** before touching any code.

This document explains the project structure, technology stack, and critical rules for development.

---

## 📚 Table of Contents

1. [Technology Stack](#technology-stack)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Critical Rules](#critical-rules)
5. [Priority Tasks](#priority-tasks)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [Database Schema](#database-schema)
8. [Common Patterns](#common-patterns)
9. [Troubleshooting](#troubleshooting)

---

## 🛠️ Technology Stack

### Frontend (Currently Deployed on Vercel)

- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite 5
- **Routing:** TanStack Router (file-based routing)
- **Styling:** Tailwind CSS 3
- **State Management:** Zustand (with Persist middleware)
- **API Client:** tRPC (currently mock, needs real backend)
- **Blockchain:** Wagmi v2 + Viem
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod validation
- **Notifications:** React Hot Toast
- **Icons:** Lucide React

### Backend (TO BE BUILT — C1 Priority)

- **Runtime:** Node.js 20+
- **Framework:** Express.js + TypeScript
- **Database:** PostgreSQL 15+ (Prisma ORM)
- **Cache:** Redis 7
- **WebSocket:** `ws` library
- **Authentication:** JWT + EIP-712 signature verification
- **API Documentation:** OpenAPI/Swagger (optional)

### Bots (TO BE BUILT — C2, C3)

- **Runtime:** Node.js 20+
- **Market Maker:** Autonomous liquidity bot
- **Growth Engine:** AI content generation + social media
- **AI:** OpenRouter API (Claude Haiku)
- **Social:** Twitter API v2, Telegram Bot API

### Blockchain

- **Chain:** Base (8453) — Ethereum L2
- **Testnet:** Base Sepolia (84532)
- **Currency:** USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 on Base)
- **Oracle:** Azuro Protocol (Gnosis Chain for sports data)
- **Contracts:** TO BE DEPLOYED (C4, C5)

### Deployment

- **Frontend:** Vercel (automatic from GitHub main branch)
- **Backend:** Hostinger VPS (Docker Compose)
- **Bots:** Same VPS as backend (separate containers)
- **Database:** PostgreSQL on VPS
- **Cache:** Redis on VPS

---

## 📁 Project Structure

```
predictio/
├── src/                          # Frontend React app
│   ├── components/               # Reusable UI components
│   │   ├── markets/              # Market-specific components
│   │   ├── admin/                # Admin dashboard components
│   │   ├── trading/              # Trading UI components
│   │   ├── liquidity/            # LP components
│   │   ├── portfolio/            # Portfolio components
│   │   └── ...                   # Other component categories
│   ├── routes/                   # TanStack Router pages
│   │   ├── __root.tsx            # Root layout (add error boundary here)
│   │   ├── index.tsx             # Homepage
│   │   ├── markets/              # Markets pages
│   │   ├── admin/                # Admin pages
│   │   └── ...                   # Other routes
│   ├── server/                   # Server-side code (tRPC mock)
│   │   ├── trpc/                 # tRPC procedures (currently mock)
│   │   │   ├── procedures/       # Individual procedures
│   │   │   └── root.ts           # tRPC router
│   │   ├── db.ts                 # Prisma client
│   │   └── scripts/              # Server-side scripts (setup, jobs)
│   ├── hooks/                    # Custom React hooks
│   ├── store/                    # Zustand stores
│   ├── config/                   # Configuration files
│   ├── data/                     # Mock data (seed data)
│   ├── services/                 # External API clients (Azuro, OpenRouter)
│   ├── utils/                    # Utility functions
│   ├── styles.css                # Global CSS
│   └── main.tsx                  # React entry point
│
├── backend/                      # ❌ TO BE CREATED (C1)
│   ├── src/
│   │   ├── index.ts              # Express server entry
│   │   ├── routes/               # API routes
│   │   ├── middleware/           # Auth, rate limit, etc.
│   │   ├── services/             # Business logic
│   │   └── jobs/                 # Scheduled jobs
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── bots/                         # ❌ TO BE CREATED (C2, C3)
│   ├── marketMaker/              # AMM liquidity bot
│   │   ├── index.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   └── growthEngine/             # Content generation bot
│       ├── index.ts
│       ├── Dockerfile
│       └── package.json
│
├── contracts/                    # ❌ TO BE CREATED (C4)
│   ├── CTF.sol                   # Conditional Token Framework
│   ├── CTFExchange.sol           # Order book exchange
│   └── scripts/deploy.ts         # Deployment scripts
│
├── prisma/
│   └── schema.prisma             # Database schema (already defined)
│
├── docs/                         # 📚 Documentation (YOU ARE HERE)
│   ├── ENV.md                    # Environment variables
│   ├── FEATURES.md               # Feature status
│   └── CURSOR_HANDOFF.md         # This file
│
├── docker-compose.prod.yml       # Production orchestration
├── deploy.sh                     # Deployment script
├── vercel.json                   # Vercel config
├── .env.example                  # Environment template
├── .gitignore                    # Git ignore rules
├── package.json                  # Frontend dependencies
├── tsconfig.json                 # TypeScript config
├── tailwind.config.mjs           # Tailwind config
└── README.md                     # Project overview
```

---

## 🔄 Development Workflow

### Initial Setup

```bash
# 1. Clone repository
git clone <your-repo>
cd predictio

# 2. Install dependencies
npm install

# 3. Set up environment (no API keys needed for demo)
cp .env.example .env.local

# 4. Start development server
npm run dev
# Frontend: http://localhost:8000
```

### Frontend Development

```bash
# Run dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Backend Development (After C1 is built)

```bash
# Start backend
cd backend
npm run dev
# API: http://localhost:3001

# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Seed database
npx prisma db seed
```

### Bot Development (After C2, C3 are built)

```bash
# Market Maker Bot
cd bots/marketMaker
npm run dev

# Growth Engine Bot
cd bots/growthEngine
npm run dev
```

### Full Stack Development

```bash
# Use docker-compose for local full-stack development
docker-compose -f docker-compose.prod.yml up -d
```

---

## ⚠️ Critical Rules (INVIOLABLE)

### 1. Design System

**DO NOT CHANGE** these design tokens:

- **Background:** `#080B11` (brand-bg)
- **Primary Green:** `#00FF87` (brand-green)
- **Secondary Cyan:** `#00D4FF` (brand-cyan)
- **Fonts:**
  - Headings: Syne (font-syne)
  - Numbers/Code: DM Mono (font-mono)
  - Body: Plus Jakarta Sans (default)

**Tailwind classes to use:**
- `bg-brand-bg`, `bg-brand-navy`
- `text-brand-green`, `text-brand-cyan`
- `border-brand-green`, `border-brand-cyan`

### 2. Language

**ALL UI TEXT MUST BE IN ENGLISH.**

- No Italian, no other languages
- Even comments should be in English
- Error messages in English
- API responses in English

### 3. Blockchain

**ONLY BASE CHAIN** (and Base Sepolia for testing):

- ✅ Base (8453) — Production
- ✅ Base Sepolia (84532) — Testing
- ❌ Ethereum L1 — Too expensive
- ❌ Gnosis Chain — Only for Azuro data, not for our contracts
- ❌ Other L2s — Not supported

### 4. Authentication

**WALLET = IDENTITY** (no email, no KYC):

- Users authenticate with wallet signature (EIP-712)
- No email registration
- No password storage
- No KYC required
- Wallet address is the primary key

### 5. Tokenomics

**NO TOKEN BEFORE MAINNET:**

- No PRED token on testnet
- No token sale before real volume
- Launch token only after:
  - Mainnet deployed (C5)
  - $100K+ in real trading volume
  - 1,000+ active users
  - Stable for 30+ days

### 6. Vault Allocation Cap

**HARDCODED 30% MAX PER MARKET:**

```typescript
// This rule is HARDCODED in multiple places:
const VAULT_MAX_CAP_PER_MARKET = 0.30; // 30%

// NEVER allow more than 30% of vault TVL in a single market
// This protects against catastrophic loss
```

### 7. Code Style

**Follow existing patterns:**

- Use TypeScript for everything
- Use `~/...` imports (alias for `src/...`)
- Never use relative imports like `../../`
- Use Tailwind CSS, avoid custom CSS
- Use Zustand for global state
- Use React Hook Form + Zod for forms
- Use tRPC for API calls (once backend is built)

### 8. Git Workflow

**Never commit sensitive data:**

- `.env` is in `.gitignore` ✅
- `.env.local` is in `.gitignore` ✅
- Only commit `.env.example` with empty values
- Never commit private keys
- Never commit API keys

### 9. Database

**Prisma is the ORM:**

- All database access through Prisma
- Never write raw SQL (except for complex queries)
- Always use transactions for multi-step operations
- Always validate input with Zod before DB writes

### 10. API Design

**RESTful + WebSocket:**

- REST for CRUD operations
- WebSocket for real-time updates
- All endpoints versioned: `/api/v1/...`
- All responses in JSON
- HTTP status codes: 200, 201, 400, 401, 403, 404, 500

---

## 🎯 Priority Tasks (Ordered)

### Phase 1: Backend Foundation (C1) — HIGHEST PRIORITY

**Goal:** Build the Express.js backend that the frontend already expects.

**Tasks:**
1. Create `/backend` folder structure
2. Set up Express.js server with TypeScript
3. Configure PostgreSQL connection (Prisma)
4. Configure Redis connection
5. Implement JWT authentication middleware
6. Implement EIP-712 signature verification
7. Build public API endpoints (markets, leaderboard, vault state)
8. Build authenticated endpoints (trades, portfolio, points)
9. Build admin endpoints (dashboard, market management, resolve)
10. Build bot endpoints (heartbeat, orders)
11. Set up WebSocket server (4 channels: markets, platform, admin, growth)
12. Implement scheduled jobs (Azuro resolution, notification cleanup, vault alerts)
13. Deploy to VPS with Docker

**Files to create:** See `docs/FEATURES.md` section C1

**Estimated time:** 40-60 hours

**Success criteria:**
- Frontend can connect to real backend
- Users can place real trades (stored in DB)
- Admin dashboard shows real data
- WebSocket updates work in real-time

---

### Phase 2: Market Maker Bot (C2) — AFTER C1

**Goal:** Provide automated liquidity to top markets.

**Tasks:**
1. Create `/bots/marketMaker` folder
2. Implement main bot loop (every 30s)
3. Fetch top markets from backend API
4. Fetch fair value from Azuro GraphQL
5. Calculate bid/ask with 2% spread
6. Place limit orders via backend API
7. Respect 30% vault cap per market
8. Implement rebalancing logic
9. Add logging and error handling
10. Deploy to VPS with Docker

**Files to create:** See `docs/FEATURES.md` section C2

**Estimated time:** 20-30 hours

**Success criteria:**
- Bot runs continuously without crashes
- Orders appear in order book
- Liquidity depth increases on top markets
- Spread stays around 2%

---

### Phase 3: Smart Contracts (C4) — PARALLEL WITH C2

**Goal:** Deploy real trading contracts on Base Sepolia testnet.

**Tasks:**
1. Create `/contracts` folder
2. Fork Polymarket CTF contracts
3. Fork CTF Exchange contracts
4. Deploy mock USDC on Base Sepolia
5. Deploy CTF contracts on Base Sepolia
6. Deploy Exchange contracts on Base Sepolia
7. Write deployment scripts
8. Write tests (Hardhat or Foundry)
9. Verify contracts on Basescan
10. Update frontend to use real contracts
11. Test thoroughly on testnet

**Files to create:** See `docs/FEATURES.md` section C4

**Estimated time:** 30-40 hours

**Success criteria:**
- Contracts deployed on Base Sepolia
- Frontend can interact with contracts
- Users can trade with testnet USDC
- No critical bugs found in testing

---

### Phase 4: Mainnet Deployment (C5) — AFTER C2 + C4 STABLE

**Goal:** Launch on Base mainnet with real USDC.

**Tasks:**
1. Deploy contracts to Base mainnet
2. Seed vault with $500 USDC
3. Update frontend to mainnet chain ID
4. Start AMM bot on mainnet
5. Monitor for 24 hours
6. Announce launch

**Estimated time:** 10-15 hours (mostly monitoring)

**Success criteria:**
- Contracts deployed on Base mainnet
- Vault seeded with liquidity
- First real trades executed
- No critical bugs

---

### Phase 5: Growth Engine Bot (C3) — ANYTIME

**Goal:** Automate social media content and distribution.

**Tasks:**
1. Create `/bots/growthEngine` folder
2. Implement content generation (reuse `src/growthEngine/` logic)
3. Integrate Twitter API v2
4. Integrate Telegram Bot API
5. Implement posting logic (every 2-3 hours)
6. Implement engagement tracking
7. Implement DM engine (optional)
8. Deploy to VPS with Docker

**Files to create:** See `docs/FEATURES.md` section C3

**Estimated time:** 15-25 hours

**Success criteria:**
- Bot posts to Twitter every 2-3 hours
- Bot posts to Telegram channel
- Engagement tracked in database
- No spam complaints

---

## 📡 API Endpoints Reference

**Full list in `docs/FEATURES.md` section C1.**

Quick reference for most important endpoints:

### Public Endpoints

```
GET  /api/v1/markets              # List markets
GET  /api/v1/markets/:id          # Market detail
GET  /api/v1/markets/hot          # Top 5 trending
GET  /api/v1/leaderboard          # Points leaderboard
GET  /api/v1/vault/state          # Vault stats
GET  /api/v1/health               # Health check
```

### Authenticated Endpoints (JWT token in header)

```
POST /api/v1/auth/nonce           # Get nonce for signature
POST /api/v1/auth/verify          # Verify signature, return JWT
POST /api/v1/trades               # Place trade
GET  /api/v1/portfolio/:wallet    # User portfolio
GET  /api/v1/points/:wallet       # User points
```

### Admin Endpoints (ADMIN_SECRET in header)

```
GET  /api/v1/admin/dashboard      # KPIs
POST /api/v1/admin/markets        # Create market
PUT  /api/v1/admin/markets/:id    # Edit market
POST /api/v1/admin/resolve        # Resolve market
```

### Bot Endpoints (ADMIN_SECRET in header)

```
POST /api/v1/bot/heartbeat        # Update bot status
POST /api/v1/bot/orders           # Place AMM order
GET  /api/v1/bot/orders           # Get AMM orders
```

---

## 🗄️ Database Schema

**Full schema in `prisma/schema.prisma`.**

Key tables:

### Core Tables

- `User` — Wallet address, points, tier, referral code
- `Market` — Sport, teams, odds, status, resolution
- `Position` — User's open positions
- `Order` — Limit orders (for order book)
- `Trade` — Executed trades (history)

### Liquidity Tables

- `ProtocolVault` — Global vault state (TVL, APY)
- `VaultAllocation` — Per-market allocation
- `LPPosition` — User's LP positions
- `LPWaitlist` — Waitlist signups

### Social Tables

- `Analyst` — Analyst profiles
- `AnalystFollower` — Follow relationships
- `Referral` — Referral tracking
- `Commission` — Commission payouts

### Content Tables

- `BlogPost` — Blog articles
- `JobPosition` — Careers page
- `GlossaryTerm` — Glossary definitions

### System Tables

- `Notification` — User notifications
- `PriceAlert` — Price movement alerts
- `BotHeartbeat` — Bot status
- `AmmOrder` — AMM bot orders
- `MarketMakerConfig` — Bot configuration

---

## 🔧 Common Patterns

### 1. Creating a New Page

```typescript
// src/routes/my-page/index.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/my-page')({
  component: MyPageComponent,
});

function MyPageComponent() {
  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="font-syne text-4xl font-bold mb-8">
          My Page
        </h1>
        {/* Content */}
      </div>
    </div>
  );
}
```

### 2. Creating a New Component

```typescript
// src/components/MyComponent.tsx
interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
      <h2 className="font-syne text-2xl font-bold mb-4">{title}</h2>
      <button
        onClick={onAction}
        className="px-6 py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-cyan transition-colors"
      >
        Action
      </button>
    </div>
  );
}
```

### 3. Using tRPC (Once Backend is Built)

```typescript
// In a component
import { useTRPC } from '~/trpc/react';

function MyComponent() {
  const trpc = useTRPC();
  const marketsQuery = trpc.getMarkets.useQuery({ sport: 'football' });
  
  if (marketsQuery.isLoading) {
    return <div>Loading...</div>;
  }
  
  if (marketsQuery.error) {
    return <div>Error: {marketsQuery.error.message}</div>;
  }
  
  return (
    <div>
      {marketsQuery.data.map(market => (
        <div key={market.id}>{market.teamA} vs {market.teamB}</div>
      ))}
    </div>
  );
}
```

### 4. Using Zustand Store

```typescript
// src/store/myStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MyStore {
  count: number;
  increment: () => void;
  decrement: () => void;
}

export const useMyStore = create<MyStore>()(
  persist(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
      decrement: () => set((state) => ({ count: state.count - 1 })),
    }),
    {
      name: 'my-store', // localStorage key
    }
  )
);

// In a component
function MyComponent() {
  const { count, increment } = useMyStore();
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>
    </div>
  );
}
```

### 5. Form with React Hook Form + Zod

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const formSchema = z.object({
  amount: z.number().min(1).max(10000),
  outcome: z.enum(['yes', 'no']),
});

type FormData = z.infer<typeof formSchema>;

function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });
  
  const onSubmit = (data: FormData) => {
    console.log(data);
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        type="number"
        {...register('amount', { valueAsNumber: true })}
        className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg"
      />
      {errors.amount && <p className="text-red-500">{errors.amount.message}</p>}
      
      <select {...register('outcome')} className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg">
        <option value="yes">YES</option>
        <option value="no">NO</option>
      </select>
      
      <button type="submit" className="px-6 py-3 bg-brand-green text-brand-bg font-bold rounded-lg">
        Submit
      </button>
    </form>
  );
}
```

---

## 🐛 Troubleshooting

### Frontend Issues

**Problem:** "Module not found" error
**Solution:** Check if you're using `~/...` imports instead of relative imports

**Problem:** Tailwind classes not working
**Solution:** Check `tailwind.config.mjs` includes the file path

**Problem:** tRPC procedure not found
**Solution:** Make sure procedure is exported in `src/server/trpc/root.ts`

**Problem:** Wallet not connecting
**Solution:** Check `VITE_WALLETCONNECT_PROJECT_ID` is set (or use demo mode)

### Backend Issues (After C1)

**Problem:** Database connection failed
**Solution:** Check `DATABASE_URL` in `.env` is correct

**Problem:** JWT authentication failing
**Solution:** Check `JWT_SECRET` is set and matches between services

**Problem:** CORS errors
**Solution:** Check `CORS_ORIGIN` includes frontend URL

**Problem:** Rate limiting too aggressive
**Solution:** Adjust rate limit in `backend/src/middleware/rateLimit.ts`

### Bot Issues (After C2, C3)

**Problem:** Bot not starting
**Solution:** Check `BOT_API_KEY` matches backend `ADMIN_SECRET`

**Problem:** Bot crashing repeatedly
**Solution:** Check logs: `docker-compose logs -f market-maker-bot`

**Problem:** Bot not placing orders
**Solution:** Check vault has sufficient balance and market cap not exceeded

### Deployment Issues

**Problem:** Vercel build failing
**Solution:** Check all environment variables are set in Vercel dashboard

**Problem:** Docker container won't start
**Solution:** Check `.env` file exists and has all required variables

**Problem:** Database migrations failing
**Solution:** Run `npx prisma migrate reset` (WARNING: deletes all data)

---

## 📞 Getting Help

1. **Check documentation first:**
   - `docs/ENV.md` — Environment variables
   - `docs/FEATURES.md` — Feature status
   - `docs/CURSOR_HANDOFF.md` — This file

2. **Check existing code:**
   - Look for similar patterns in `src/components/`
   - Check how other routes are structured
   - Read comments in complex files

3. **Check external docs:**
   - [TanStack Router](https://tanstack.com/router)
   - [Wagmi](https://wagmi.sh/)
   - [Prisma](https://prisma.io/docs)
   - [Tailwind CSS](https://tailwindcss.com/)

4. **Ask for help:**
   - Open an issue on GitHub
   - Contact the team

---

## ✅ Pre-Deployment Checklist

Before deploying to production:

### Frontend
- [ ] All environment variables set on Vercel
- [ ] `VITE_API_URL` points to real backend
- [ ] `VITE_CHAIN_ID` is `8453` (Base mainnet)
- [ ] No `console.log` statements in code
- [ ] All images have `alt` attributes
- [ ] All icon-only buttons have `aria-label`
- [ ] Error boundary added to `__root.tsx`

### Backend
- [ ] All environment variables set on VPS
- [ ] `DATABASE_URL` points to production database
- [ ] `JWT_SECRET` is strong (64+ chars)
- [ ] `ADMIN_SECRET` is strong (32+ chars)
- [ ] `CORS_ORIGIN` set to exact domain (no `*`)
- [ ] Rate limiting configured (100 req/min)
- [ ] Database backups configured
- [ ] SSL certificates installed
- [ ] Health check endpoint working

### Bots
- [ ] `BOT_API_KEY` matches backend `ADMIN_SECRET`
- [ ] Bots running as Docker containers
- [ ] Restart policy set to `always`
- [ ] Logs being written to files
- [ ] Monitoring/alerts configured

### Contracts (C4, C5)
- [ ] Contracts deployed on Base mainnet
- [ ] Contracts verified on Basescan
- [ ] Vault seeded with $500 USDC
- [ ] Frontend updated with contract addresses
- [ ] Test trades executed successfully

### Security
- [ ] All secrets rotated from testnet
- [ ] Private keys stored securely (never in code)
- [ ] Admin password changed from default
- [ ] API keys rotated
- [ ] Security audit completed (optional but recommended)

---

**Last Updated:** 2026-05-06  
**Maintainer:** Predictio Team  
**Next Steps:** Start with C1 (Backend) — See `docs/FEATURES.md`
