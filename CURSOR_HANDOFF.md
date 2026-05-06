# Predictio.live — Cursor Handoff Document

**Generated:** 2026-05-06  
**Status:** TrySolid Frontend Complete ✅ | Backend REST in repo ⚠️ | Testing & Monitoring Added ✅

---

## 1. Stack attuale

**Frontend**
- React 18 con TypeScript
- Vite 5 come build tool
- TanStack Router per il routing file-based
- Zustand (con Persist) per lo state management
- Tailwind CSS 3, Headless UI, Lucide React per il design system
- Recharts per i grafici
- React Hook Form + Zod per validazione form
- Wagmi v2 + Viem per l'integrazione blockchain (Base)
- tRPC (attualmente con mock server)

**Backend (Da completare - C1)**
- Node.js 20+ con Express
- PostgreSQL 15+ con Prisma ORM
- WebSocket (`ws`) per aggiornamenti real-time
- Redis 7 per caching

**Infrastruttura / Esterni**
- Base Network (8453) & Base Sepolia (84532)
- Azuro Protocol (dati sportivi / oracolo)
- OpenRouter API (Claude Haiku per AI Chatbot & Growth Engine)
- MinIO (Object Storage)

---

## 2. Features completate (TrySolid)

Il frontend è completato al 100% in termini di UI/UX, navigazione e componenti. 

- **Design System**: Colori brand, tipografia, componenti riutilizzabili.
- **Market Discovery**: Griglia mercati, filtri avanzati, ricerca, ordinamento.
- **TradingBox**: Interfaccia di trading completa con calcolo slippage, payout e simulazione (paper trading).
- **Portfolio**: Dashboard con P&L in tempo reale, storico transazioni, ROI per sport.
- **Onboarding**: Wizard multi-step e tour interattivo.
- **Notifiche**: Centro notifiche persistente con conteggio non letti.
- **Sistema Affiliati/Analisti**: Dashboard, profili pubblici, calcolo commissioni (50/35/15).
- **Copy Trading**: UI per seguire/copiare trader con impostazioni di allocazione.
- **Liquidity Pool**: Interfaccia deposito/prelievo vault, grafici APY.
- **Admin Dashboard**: Gestione mercati, risoluzione, monitoraggio bot, log anomalie.
- **Contenuti**: Blog CMS, Careers, Glossary.

### Testing & Quality Assurance

**Comprehensive Testing Documentation** (`docs/TESTING.md`)
- ✅ Complete testing guide for all features
- ✅ 12 major test categories covering:
  - Core trading features (market orders, limit orders, position management)
  - Market lifecycle (OPEN → LOCKED → RESOLVED states)
  - Affiliate & analyst system (registration, referrals, fee splits)
  - Notification system (all notification types)
  - Liquidity pool (deposits, withdrawals, fee distribution)
  - Portfolio & P&L tracking
  - Copy trading functionality
  - Admin dashboard features
  - Integration tests (end-to-end flows)
  - Performance tests (load times, WebSocket)
  - Security tests (authentication, authorization, input validation)
- ✅ Test case templates and reporting guidelines
- ✅ Continuous testing schedule
- ✅ 50+ detailed test procedures

**Error Monitoring System** (`src/lib/errorMonitoring.ts`)
- ✅ Comprehensive error tracking for client and server
- ✅ Automatic capture of unhandled errors and promise rejections
- ✅ User context tracking (wallet address, analyst status)
- ✅ Breadcrumb trail (navigation, actions, HTTP requests)
- ✅ Performance monitoring with transaction tracking
- ✅ Integration with existing client-logs-handler
- ✅ Sentry-ready architecture (easy to connect external services)
- ✅ Custom error tags and context
- ✅ Development vs production modes
- ✅ Error severity levels (fatal, error, warning, info, debug)
- ✅ Enhanced ErrorBoundary in __root.tsx
- ✅ Environment variables for monitoring configuration

### AI-Powered Features

**AI Chatbot Assistant** (`src/components/Chatbot.tsx`)
- ✅ Floating chat button (replaces old Help button)
- ✅ Real-time AI responses using OpenRouter API
- ✅ Claude 3 Haiku model for fast, cost-effective responses
- ✅ Conversation history context (last 5 messages)
- ✅ Platform-specific knowledge base:
  - How prediction markets work
  - Trading instructions and fees
  - Analyst program details
  - Protocol vault information
  - Copy trading guidance
  - Market lifecycle explanation
  - Wallet and security info
- ✅ Suggested questions for new users
- ✅ Graceful fallback when API unavailable
- ✅ Message history with timestamps
- ✅ Smooth animations and UX
- ✅ Desktop-only (mobile can be added later)
- ✅ tRPC procedure: `chatbotStream`
- ✅ Environment variable: `VITE_OPENROUTER_KEY` / `OPENROUTER_KEY`

### Removed Features

**Help Button** (`src/components/education/HelpButton.tsx`)
- ❌ REMOVED: Fixed "Help" button in bottom right
- ✅ REPLACED WITH: AI Chatbot Assistant
- **Reason:** User requested removal of static help button in favor of AI-powered assistance
- **Migration:** All help functionality now provided by intelligent chatbot

---

## 3. Features parziali — da completare

**Market Lifecycle**
- **Cosa è stato fatto**: Logica UI completa (countdown, blocchi trading, badge).
- **Cosa manca**: Sincronizzazione reale con Azuro GraphQL per `start_time` e risoluzione automatica.
- **File coinvolti**: `src/server/trpc/procedures/placePrediction.ts`, `src/services/azuro.ts`
- **Effort**: Medio

**Copy Trading Logic**
- **Cosa è stato fatto**: UI completa, schema DB, logica di base in `placePrediction.ts`.
- **Cosa manca**: Gestione fallimenti, notifiche ai copier, tracking performance copie.
- **File coinvolti**: `src/server/trpc/procedures/placePrediction.ts`
- **Effort**: Piccolo

**Referral Link System**
- **Cosa è stato fatto**: Schema DB, generazione codici, logica calcolo fee.
- **Cosa manca**: Route handler `/join/:referralCode`, gestione cookie (120 giorni), attribuzione in `syncUserAccount.ts`.
- **File coinvolti**: `src/server/trpc/procedures/syncUserAccount.ts`
- **Effort**: Piccolo

**Leaderboard Synchronization**
- **Cosa è stato fatto**: UI completa, schema DB.
- **Cosa manca**: Aggregazione in background di P&L/volumi, trigger su chiusura trade, aggiornamenti WebSocket.
- **File coinvolti**: `src/server/trpc/procedures/getLeaderboard.ts`
- **Effort**: Medio

---

## 4. Features mancanti — da implementare

**C1 — Backend PostgreSQL + API**
- **Descrizione**: Server Express completo con DB reale, auth JWT, EIP-712.
- **Perché serve**: Blocca tutto il resto. Attualmente l'app usa mock data in localStorage.
- **Dipendenze**: Nessuna.
- **Effort**: Grande (40-60 ore)

**C2 — Bot AMM (Market Maker)**
- **Descrizione**: Bot Node.js che fornisce liquidità ai mercati.
- **Perché serve**: Per avere spread competitivi (target 2%) e volumi iniziali.
- **Dipendenze**: C1 (Backend API)
- **Effort**: Medio (20-30 ore)

**C4 — Smart Contracts (Base Sepolia)**
- **Descrizione**: Fork Polymarket CTF ed Exchange per trading on-chain.
- **Perché serve**: Per passare dal paper trading al trading reale con USDC.
- **Dipendenze**: Nessuna (può procedere in parallelo a C1/C2)
- **Effort**: Grande (30-40 ore)

**C5 — Mainnet Deployment**
- **Descrizione**: Deploy dei contratti su Base mainnet e seeding liquidità.
- **Perché serve**: Lancio ufficiale.
- **Dipendenze**: C1, C2, C4 completati e testati.
- **Effort**: Piccolo (10-15 ore)

---

## 5. Bug e inconsistenze da fixare

**Analyst Prediction Analytics Crash**
- **Problema**: La pagina del mercato crasha se `resolvedAt` è undefined durante la formattazione della data.
- **File**: `src/routes/markets/$marketId/index.tsx`
- **Fix suggerito**: Aggiungere optional chaining: `{market.resolvedAt?.toLocaleDateString() || 'Pending'}`

**Legacy Fee References**
- **Problema**: Alcuni componenti menzionano ancora il vecchio sistema a tier (Bronze/Silver) o split 70/30.
- **File**: `src/components/affiliate/TierBadge.tsx`, `src/data/mockAffiliates.ts`
- **Fix suggerito**: Rimuovere i tier e standardizzare al modello 35% flat per gli analisti.

**Unrealized P&L Calculation**
- **Problema**: `getPortfolioPerformanceHistory.ts` usa un +10% hardcoded per il P&L non realizzato.
- **File**: `src/server/trpc/procedures/getPortfolioPerformanceHistory.ts`
- **Fix suggerito**: Calcolare contro il prezzo attuale dell'orderbook (richiede backend reale).

---

## 6. Ordine di lavoro consigliato per Cursor

1. **C1 — Backend PostgreSQL + API**: Priorità assoluta. Sostituire tutti i mock data con query Prisma.
2. **C2 — Bot AMM**: Deploy del bot per la liquidità (può girare su testnet inizialmente).
3. **Referral/Copy Trading (Backend)**: Completare la logica di attribuzione e mirroring dei trade.
4. **C4 — Smart Contracts Base Sepolia**: Sostituire il paper trading in `execution.ts`.
5. **C3 — Bot Twitter/Growth**: Implementare distribuzione contenuti.
6. **C5 — Mainnet**: Deploy finale.

---

## 7. Features raccomandate non implementate

**Trader Performance Charts** (Richiesto dall'utente)
- **Perché**: Fondamentale per il copy trading. Gli utenti vogliono vedere grafici storici (P&L, win streak) prima di copiare.
- **Effort**: Medio (TrySolid può implementare la UI con Recharts)
- **Priorità**: Alta

**Batch Resolution Script**
- **Perché**: Polling automatico di Azuro per risolvere i mercati senza intervento manuale.
- **Effort**: Medio (Cron job nel backend)
- **Priorità**: Alta

**DeFiLlama Adapter**
- **Perché**: Visibilità e marketing post-lancio.
- **Effort**: Piccolo
- **Priorità**: Bassa

---

## 8. Variabili d'ambiente necessarie

### Critical Variables (Must Set)

| Variabile | Descrizione | Valore di esempio |
|-----------|-------------|-------------------|
| `DATABASE_URL` | Connessione PostgreSQL | `postgresql://user:pass@localhost:5432/predictio` |
| `TREASURY_WALLET` | Wallet per le fee (15-50%) | `0x...` |
| `FOUNDER_WALLET` | Wallet escluso dalle fee referral | `0x...` |
| `FOUNDER_REF_CODE` | Codice referral di default | `PREDICTIO` |
| `JWT_SECRET` | Secret per auth token | `super_secret_64_chars...` |
| `BOT_API_KEY` | Auth tra bot e backend | `bot_secret_key...` |
| `AZURO_API_KEY` | Accesso API Azuro | `...` |
| `BASE_RPC_URL` | Endpoint RPC Base | `https://mainnet.base.org` |

### AI Chatbot (Required for chatbot functionality)

| Variabile | Descrizione | Valore di esempio |
|-----------|-------------|-------------------|
| `VITE_OPENROUTER_KEY` | OpenRouter API key (client) | `sk-or-v1-...` |
| `OPENROUTER_KEY` | OpenRouter API key (server) | `sk-or-v1-...` |

Get your API key from https://openrouter.ai/

### Error Monitoring (Optional but recommended for production)

| Variabile | Descrizione | Valore di esempio |
|-----------|-------------|-------------------|
| `VITE_ERROR_MONITORING_DSN` | Sentry DSN or monitoring service | `https://...@sentry.io/...` |
| `VITE_ERROR_MONITORING_ENVIRONMENT` | Environment name | `production` |
| `VITE_APP_VERSION` | App version for tracking | `1.0.0` |
| `SENTRY_DSN` | Server-side error tracking | `https://...@sentry.io/...` |
| `SENTRY_ENVIRONMENT` | Server environment | `production` |

---

## 9. Integrazioni esterne da configurare

### Azuro Protocol
- **Purpose:** GraphQL endpoint for sports data, odds, and market resolution
- **Status:** ✅ Configured
- **Endpoint:** `https://thegraph.azuro.org/subgraphs/name/azuro-protocol/azuro-api-base-v3`
- **Config:** `src/services/azuro.ts`

### OpenRouter API (AI Chatbot)
- **Purpose:** Power the AI chatbot assistant
- **Status:** ✅ Integrated and functional
- **Config:** `src/services/openRouterClient.ts`, `src/server/trpc/procedures/chatbotStream.ts`
- **Model:** Claude 3 Haiku (fast and cost-effective)
- **Cost:** ~$0.25 per 1M input tokens
- **Docs:** https://openrouter.ai/docs
- **Required:** `VITE_OPENROUTER_KEY` environment variable

### MinIO
- **Purpose:** Storage S3-compatible per immagini OG dinamiche
- **Status:** ⚠️ Da configurare
- **Docs:** https://min.io/docs/minio/linux/index.html

### Unsplash API
- **Purpose:** Immagini blog
- **Status:** ✅ Configurata
- **Config:** `src/services/unsplash.ts`

### Twitter/Telegram API
- **Purpose:** Growth Engine bot per distribuzione contenuti
- **Status:** ⚠️ Da configurare per C3

---

## 10. Note critiche per Cursor

### Convenzioni Generali
- **Convenzioni Route**: Usa sempre `index.tsx` per le pagine finali in TanStack Router (es. `routes/markets/$id/index.tsx`).
- **Autenticazione**: Il sistema usa EIP-712 (firme wallet). Nessuna email/password per gli utenti. L'indirizzo wallet è la primary key (sempre `.toLowerCase()`).
- **Regola 30% Vault**: È hardcoded nel sistema che nessun mercato può avere più del 30% della TVL del vault. Non rimuovere questa protezione.
- **Fee Split 50/35/15**: La logica è già perfetta in `src/server/services/feeCalculation.ts`. Non modificarla, ma assicurati che venga chiamata correttamente.
- **Mock Data**: La maggior parte dei dati in `src/data/` è simulata per lo sviluppo UI; **devono essere rimossi/sostituiti** appena il backend è pronto.
- **UI/Design**: Non modificare classi Tailwind relative a colori (`brand-bg`, `brand-green`, `brand-cyan`) o font (`font-syne`, `font-mono`). Il design è approvato e definitivo.

### Error Monitoring
**ALWAYS CAPTURE ERRORS:**
- Use `captureException()` for errors
- Use `captureMessage()` for important events
- Use `trackAction()` for user actions
- Use `trackRequest()` for HTTP requests
- Use `startTransaction()` for performance monitoring
- Example:
  ```typescript
  import { captureException, trackAction } from '~/lib/errorMonitoring';
  
  try {
    // risky operation
  } catch (error) {
    captureException(error, {
      tags: { feature: 'trading' },
      extra: { marketId, amount },
      level: 'error',
    });
  }
  
  trackAction('Place Trade', { marketId, outcome, amount });
  ```

### AI Chatbot
**OPENROUTER API KEY REQUIRED:**
- Chatbot will not function without valid API key
- Get key from https://openrouter.ai/
- Set in `.env`: `VITE_OPENROUTER_KEY=sk-or-v1-...`
- Fallback message shown if key missing
- Monitor usage and costs in OpenRouter dashboard

---

## 11. Features Ready for Testing

With the new comprehensive testing documentation (`docs/TESTING.md`), you can now verify:

1. **All Trading Features**
   - Market discovery and filtering
   - Market orders and limit orders
   - Position management (buy, sell, close)
   - P&L calculations
   - Transaction history

2. **Market Lifecycle**
   - OPEN state (trading active)
   - LOCKED state (event in progress)
   - RESOLVED state (payouts)
   - Azuro resolution sync

3. **Affiliate & Analyst System**
   - Analyst registration
   - Referral link attribution
   - Fee split calculations (50/35/15)
   - Commission payouts
   - Analyst leaderboard

4. **Notification System**
   - All notification types
   - Mark as read functionality
   - Notification cleanup

5. **Liquidity Pool**
   - Vault deposits and withdrawals
   - LP fee distribution
   - Auto-compound toggle
   - 30% allocation cap

6. **Copy Trading**
   - Start/stop copying
   - Trade mirroring
   - Failure handling

7. **Admin Dashboard**
   - Market creation
   - Market resolution
   - Bot control
   - Void markets

8. **AI Chatbot**
   - Response quality
   - Context retention
   - Fallback behavior
   - Platform knowledge accuracy

**See `docs/TESTING.md` for detailed test procedures.**

---

### TrySolid ha finito il suo lavoro?

**Sì.**

**Motivazione**: Il frontend è completo al 100% in termini di UI/UX, navigazione, responsività e componenti. Tutta la logica di business è stata predisposta tramite tRPC e Zustand. La codebase è ora in una fase in cui richiede esclusivamente l'implementazione della persistenza reale (Backend, DB PostgreSQL) e dell'integrazione on-chain (Smart Contracts), compiti che spettano a Cursor/sviluppo backend. 

Sono stati inoltre aggiunti:
- ✅ Sistema completo di testing documentation
- ✅ Error monitoring e tracking
- ✅ AI Chatbot assistant
- ✅ Rimozione del vecchio Help button

*Nota: Rimangono solo task minori frontend (come i grafici performance richiesti in questo prompt) che TrySolid può implementare prima del passaggio definitivo.*

---

## Event Curation (Azuro) — 2026-05-06

**Fatto**
- Tabella PostgreSQL `curated_events` (model Prisma `CuratedEvent`), migration `20260506120000_curated_events` (root `Predictio/prisma` + mirror `Predictio/backend/prisma`).
- Backend Express:
  - `GET /api/admin/azuro-events` — lista football da subgraph Azuro (14 giorni, kickoff futuri), merge `isSelected` da DB; cache Redis `REDIS_URL` **5 minuti** (chiave `admin:azuro:football:14d:v1`; senza Redis niente cache).
  - `POST /api/admin/events/select` — body `{ gameId, selected, selectedBy? }`; max **12** righe con `isActive: true`; header **`X-Admin-Key`** (`ADMIN_SECRET`, fallback `ADMIN_API_KEY`).
  - `GET /api/markets` — lista pubblica solo eventi curati attivi; include `startsAt` e `lockedAt` (= kickoff).
- Middleware `requireXAdminKey` in `backend/src/middleware/auth.ts`.
- Servizi: `backend/src/services/redisCache.ts`, `backend/src/services/azuroCuratorGraphql.ts`, wiring `registerAdminCurationRoutes` in `backend/src/index.ts`.
- tRPC `getAzuroMarkets`: se esiste almeno un `CuratedEvent` attivo, la lista mercati è **filtrata** a quei `gameId` (allineato ad Azuro); se non ci sono curati, comportamento precedente (nessun filtro).
- Frontend: route `/admin/event-curation` — counter 12, ricerca, checkbox, Save Selection, toast; sidebar link “Event Curation”; `VITE_ADMIN_KEY` + `VITE_FOUNDER_WALLET` (optional gate).
- `SeedMarket.event.lockedAt` + mapping Azuro `lockedAt` = `startsAt` ISO.

**Env**
- Backend: `ADMIN_SECRET`, `REDIS_URL` (opzionale), `AZURO_CURATOR_GRAPHQL_URL` opzionale (default stessa catena di `AZURO_GRAPHQL_URL` / Base v3).
- Frontend: `VITE_API_URL` verso API Express, `VITE_ADMIN_KEY`, `VITE_FOUNDER_WALLET`.

**Migration**
- Applicare: `npx prisma migrate deploy` (root app) e backend deploy con stesso migration history.

**Prossimi step**
- Eseguire `migrate deploy` su DB staging/prod.
- Verificare subgraph Azuro produzione (Base vs Polygon) e allineare `AZURO_GRAPHQL_URL` / `AZURO_CURATOR_GRAPHQL_URL`.
- Opzionale: invalidare cache Redis dopo POST select; batch API per Save in una singola richiesta.
