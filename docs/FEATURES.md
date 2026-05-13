# Features Status — Predictio.live

**Purpose:** Track implementation status of all platform features.  
**For Cursor AI:** Use this document to understand what needs to be built next.

---

## ✅ COMPLETED AND FULLY FUNCTIONAL

These features are implemented in the frontend and work with mock data. They are production-ready from a UI/UX perspective.

### 🎯 Core Trading Features

**Status:** ✅ Frontend complete, Backend mock (paper trading only)

- **TradingBox Component** (`src/components/markets/TradingBox.tsx`)
  - YES/NO outcome selection
  - Amount input with USDC balance check
  - Slippage calculation and display
  - Expected payout calculation
  - Paper trading execution (stores in localStorage)
  - Success/error toast notifications

- **Order Book** (`src/components/markets/OrderBook.tsx`)
  - Real-time order display
  - Bid/ask spread visualization
  - Depth chart
  - WebSocket integration (mock data)

- **Price Chart** (`src/components/markets/PriceChart.tsx`)
  - 7-day price history
  - Recharts integration
  - Responsive design
  - Probability display (0-100%)

- **Liquidity Depth Panel** (`src/components/markets/LiquidityDepth.tsx`)
  - Visual representation of pool depth
  - YES/NO side distribution
  - Spread percentage
  - Bot status indicator

- **Market Health Score** (calculated in `src/utils/marketUtils.ts`)
  - Volume-based scoring
  - Liquidity depth analysis
  - Time-to-close factor
  - A/B/C rating system

- **Holding Rewards** (`src/systems/holdingRewards.ts`)
  - Time-based reward calculation
  - Position size multiplier
  - Claimable rewards tracking
  - UI in `src/components/portfolio/HoldingRewardsSection.tsx`

### 📊 Sports Data Integration

**Status:** ✅ Frontend complete, Azuro integration ready

- **Azuro Protocol GraphQL** (`src/services/azuro.ts`)
  - Market fetching from Azuro subgraph
  - Automatic resolution polling
  - Fallback to mock data if API fails
  - Hooks: `useAzuroResolutionPolling` (`src/hooks/useAzuroResolutionPolling.ts`)

- **Supported Sports** (mock data in `src/data/mockMarkets.ts`)
  - ⚽ Football (UEFA Champions League, Serie A, Premier League, La Liga, Bundesliga)
  - 🏀 Basketball (NBA, EuroLeague)
  - 🥊 MMA (UFC, Bellator)
  - 🏏 Cricket (IPL, ICC World Cup, The Ashes)
  - ⚾ Baseball (MLB)
  - 🏉 Rugby (Six Nations)
  - 🏒 Hockey (NHL)
  - 🎮 Esports (League of Legends)
  - 🏎️ Formula 1

- **Football Focus Mode** (`src/config/footballFocus.ts`)
  - Toggle between "All Sports" and "Football Only"
  - Configurable default sport filter
  - Optimized UI for single-sport experience

### 👤 User Features

**Status:** ✅ Frontend complete, Backend mock

- **Wallet Connection** (`src/components/WalletModal.tsx`)
  - Wagmi v2 integration
  - MetaMask, WalletConnect, Coinbase Wallet
  - Base network (8453) with auto-switch
  - Persistent wallet state (Zustand)

- **Onboarding Flow** (`src/components/onboarding/OnboardingModal.tsx`)
  - 3-step wizard: Connect → Fund → Trade
  - Interactive tour overlay
  - Skip option
  - Completion tracking in localStorage

- **Portfolio Dashboard** (`src/routes/portfolio/index.tsx`)
  - Active positions list (`PositionsList.tsx`)
  - LP positions (`getUserLPPositions` tRPC procedure)
  - Resolved markets (`src/routes/portfolio/resolved.index.tsx`)
  - Performance charts (`PortfolioValueChart.tsx`, `PnLHistoryChart.tsx`)
  - ROI breakdown by sport (`SportROIBreakdown.tsx`)

- **Notifications System** (`src/store/notificationStore.ts`)
  - Persistent inbox (Zustand Persist)
  - Bell icon with unread count (`NotificationBell.tsx`)
  - Notification center modal (`NotificationCenter.tsx`)
  - Mark as read functionality
  - Auto-cleanup of old notifications (tRPC scheduled job)

- **Points System - Season 1** (`src/server/trpc/procedures/points/`)
  - Trade volume points (1 point per $1 traded)
  - Referral bonuses (10% of referee's points)
  - Streak bonuses (consecutive days)
  - Tier progression: Bronze → Silver → Gold → Diamond
  - Leaderboard (`src/routes/leaderboard/index.tsx`)
  - UI: `src/routes/account/index.tsx`

### 🏪 Market Features

**Status:** ✅ Frontend complete, Backend mock

- **Markets List** (`src/routes/markets/index.tsx`)
  - Grid and list view toggle
  - Filters: sport, region, search, volume, odds, date range
  - Sort: trending, volume, ending soon, newest
  - Pagination (20 per page)
  - Empty state (`EmptyState.tsx`)
  - Skeleton loaders (`MarketCardSkeleton.tsx`)

- **Market Detail Page** (`src/routes/markets/$marketId/index.tsx`)
  - Full market information
  - Live countdown timer (`useLiveCounter` hook)
  - Trading box
  - Order book
  - Price chart
  - Recent trades feed (`RecentTradesFeed.tsx`)
  - Related markets
  - Social proof indicators

- **Market Metadata** (Open Graph in `src/server/og-meta-handler.ts`)
  - Dynamic OG images generated server-side
  - Twitter/Facebook share previews
  - Market-specific meta tags

- **Share Functionality** (`src/components/ShareModal.tsx`)
  - Twitter/X share
  - Telegram share
  - WhatsApp share
  - Copy link
  - Referral tracking

### 💧 Liquidity Features

**Status:** ✅ Frontend complete, Backend mock

- **Protocol Vault** (single shared pool)
  - Vault state display (`src/routes/liquidity/index.tsx`)
  - Total TVL, APY, 24h volume
  - Deposit/withdraw modals (`ProtocolVaultDepositModal.tsx`, `ProtocolVaultWithdrawModal.tsx`)
  - User position tracking (`getProtocolVaultPosition` tRPC)

- **Vault Allocations** (per-market breakdown)
  - 30% max cap per market (hardcoded rule)
  - Allocation visualization (`src/components/admin/VaultPerformanceDashboard.tsx`)
  - Rebalancing logic (mock in frontend, needs real bot)

- **LP Waitlist** (`src/routes/liquidity/index.tsx`)
  - Email signup form
  - Waitlist counter (mock count)
  - tRPC procedure: `registerLPWaitlist`

- **LP Analytics** (for future LPs)
  - APY history chart (`APYTrendChart.tsx`)
  - Earnings breakdown (`LPEarningsCharts.tsx`)
  - Performance comparison (`LPPerformanceChart.tsx`)

### 🔧 Admin Dashboard

**Status:** ✅ Frontend complete, Backend mock

- **Dashboard KPIs** (`src/routes/admin/dashboard/index.tsx`)
  - Real-time stats: volume, users, markets, TVL
  - Charts: volume trend, user growth, market distribution
  - Activity feed (`ActivityFeed.tsx`)
  - Live WebSocket updates (mock)

- **Market Management** (`src/routes/admin/markets/index.tsx`)
  - Create market form (`src/routes/admin/create/index.tsx`)
  - Edit market details
  - Sync with Azuro button
  - Bulk actions (pause, resume, void)

- **Market Resolution** (`src/routes/admin/resolve/index.tsx`)
  - Manual resolution form
  - Azuro auto-resolution check
  - Dispute handling (`AppealForm.tsx`)
  - Void market with refunds

- **Bot Control Panel** (`src/components/admin/AMMBotPanel.tsx`)
  - Start/stop AMM bot (mock)
  - View bot orders (`AMMOrdersModal.tsx`)
  - Heartbeat status
  - Configuration panel (`MarketMakerConfigPanel.tsx`)

- **Vault Alerts** (`src/components/admin/VaultAlertConfigPanel.tsx`)
  - Low liquidity alerts
  - High exposure alerts
  - Imbalance alerts
  - Alert threshold configuration

- **Growth Engine Dashboard** (`src/routes/admin/growth/index.tsx`)
  - 7 module status display (`EngineStatus.tsx`)
  - Activity log (`GrowthActivityLog.tsx`)
  - Interaction table (`InteractionTable.tsx`)
  - Manual trigger buttons

- **Anomaly Detection** (`src/routes/admin/anomalies/index.tsx`)
  - Large bet alerts
  - Suspicious wallet patterns
  - Rapid price movements
  - Coordinated trading detection

### 📈 Affiliate & Analyst System

**Status:** ✅ Frontend complete, Backend mock

- **Analyst Registration** (`registerAsAnalyst` tRPC)
  - Referral code generation
  - Tier assignment (Bronze/Silver/Gold/Diamond)
  - Profile creation

- **Analyst Dashboard** (`src/routes/analyst-dashboard/index.tsx`)
  - Performance metrics (`PredictionAnalyticsCharts.tsx`)
  - Referral link
  - Commission breakdown (`CommissionBreakdown.tsx`)
  - Materials library (`src/routes/analyst-dashboard/materials/index.tsx`)

- **Analyst Profiles** (`src/routes/analysts/$id/index.tsx`)
  - Public profile page
  - Win rate, accuracy, total predictions
  - Follow button
  - Recent predictions

- **Affiliate Manager** (admin) (`src/routes/admin/affiliate-manager/index.tsx`)
  - List all analysts
  - Tier management
  - Commission settings
  - Payout approval

- **Commission Calculation** (`calculateAnalystRewards` tRPC)
  - Tiered commission rates
  - Volume-based bonuses
  - Monthly payout schedule

### 📚 Content & Education

**Status:** ✅ Frontend complete, Backend mock (Prisma + tRPC)

- **Blog System** (`src/routes/blog/`)
  - Article list with pagination
  - Article detail pages (`$slug/index.tsx`)
  - Author box (`AuthorBox.tsx`)
  - Reading progress bar (`ReadingProgressBar.tsx`)
  - Share bar (`BlogShareBar.tsx`)
  - Admin: create/edit/delete (`src/routes/admin/blog/`)

- **Glossary** (`src/routes/glossary/index.tsx`)
  - Alphabetical term list
  - Search functionality
  - Tooltip component (`GlossaryTooltip.tsx`)
  - Seed data: `src/data/seedGlossary.ts`

- **Help System** (`src/components/education/HelpButton.tsx`)
  - Floating help button
  - Context-sensitive help
  - Links to glossary and docs

### 🎨 UI/UX Polish

**Status:** ✅ Complete

- **Design System**
  - Colors: `#080B11` (bg), `#00FF87` (green), `#00D4FF` (cyan)
  - Fonts: Syne (headings), DM Mono (numbers), Plus Jakarta Sans (body)
  - Tailwind config: `tailwind.config.mjs`

- **Components**
  - Consistent card styles
  - Hover effects and transitions
  - Loading skeletons
  - Empty states
  - Error states
  - Success animations

- **Responsive Design**
  - Mobile-first approach
  - Breakpoints: sm, md, lg, xl, 2xl
  - Touch-friendly buttons
  - Collapsible sidebars

- **Accessibility**
  - Semantic HTML
  - ARIA labels (needs audit, see Phase 1)
  - Keyboard navigation
  - Focus states

---

## ⚠️ PARTIALLY IMPLEMENTED

These features have UI/frontend logic but need backend implementation to function in production.

### 🖥️ C1 — REAL BACKEND (HIGHEST PRIORITY)

**Status:** ❌ Not started  
**Blocking:** Everything below depends on this

**What exists:**
- tRPC procedures in `src/server/trpc/procedures/` (mock implementations)
- Prisma schema in `prisma/schema.prisma`
- Frontend API calls ready

**What needs to be built:**

1. **Express.js API Server** (`/backend/src/index.ts`)
   - REST API endpoints (see endpoint list below)
   - WebSocket server for real-time updates
   - JWT authentication middleware
   - Rate limiting (100 req/min per IP)
   - CORS configuration
   - Error handling
   - Logging

2. **PostgreSQL Database**
   - Apply Prisma migrations: `npx prisma migrate deploy`
   - Seed initial data
   - Set up backups
   - Connection pooling

3. **Redis Cache**
   - Market data caching (5 min TTL)
   - User session storage
   - Rate limit counters
   - WebSocket pub/sub

4. **Authentication System**
   - EIP-712 signature verification (wallet-based auth)
   - JWT token generation
   - Admin password authentication
   - Bot API key validation

5. **API Endpoints to Implement**

   **Public (no auth):**
   ```
   GET  /api/v1/markets              # List markets with filters
   GET  /api/v1/markets/:id          # Single market detail
   GET  /api/v1/markets/hot          # Top 5 trending markets
   GET  /api/v1/leaderboard          # Points leaderboard
   GET  /api/v1/vault/state          # Vault TVL, APY, allocations
   GET  /api/v1/stats/platform       # Platform-wide stats
   GET  /api/v1/health               # Health check
   ```

   **Authenticated (wallet signature):**
   ```
   POST /api/v1/auth/nonce           # Get nonce for signature
   POST /api/v1/auth/verify          # Verify signature, return JWT
   POST /api/v1/trades               # Place trade
   GET  /api/v1/portfolio/:wallet    # User portfolio
   GET  /api/v1/points/:wallet       # User points summary
   POST /api/v1/liquidity/deposit    # Deposit to vault
   POST /api/v1/liquidity/withdraw   # Withdraw from vault
   POST /api/v1/liquidity/waitlist   # Join LP waitlist
   GET  /api/v1/notifications        # User notifications
   POST /api/v1/notifications/read   # Mark notification as read
   POST /api/v1/watchlist/add        # Add market to watchlist
   DELETE /api/v1/watchlist/:id      # Remove from watchlist
   ```

   **Admin (ADMIN_SECRET header):**
   ```
   GET  /api/v1/admin/dashboard      # KPI data
   POST /api/v1/admin/markets        # Create market
   PUT  /api/v1/admin/markets/:id    # Edit market
   DELETE /api/v1/admin/markets/:id  # Delete market
   POST /api/v1/admin/resolve        # Resolve market
   POST /api/v1/admin/void           # Void market with refunds
   GET  /api/v1/admin/users          # List users
   GET  /api/v1/admin/affiliates     # List affiliates
   POST /api/v1/admin/affiliates/payout # Approve payout
   ```

   **Bot (ADMIN_SECRET header):**
   ```
   POST /api/v1/bot/heartbeat        # Update bot status
   GET  /api/v1/bot/heartbeat        # Get bot status
   POST /api/v1/bot/orders           # Place AMM order
   GET  /api/v1/bot/orders           # Get AMM orders
   DELETE /api/v1/bot/orders/:id     # Cancel AMM order
   ```

6. **WebSocket Channels**
   ```
   ws://api.predictio.live/ws/markets     # Market updates
   ws://api.predictio.live/ws/platform    # Platform stats
   ws://api.predictio.live/ws/admin       # Admin alerts
   ws://api.predictio.live/ws/growth      # Bot activity
   ```

7. **Scheduled Jobs** (cron or node-cron)
   - Azuro resolution polling (every 5 min)
   - Notification cleanup (daily)
   - Vault alert checks (every 10 min)
   - Points calculation (hourly)
   - LP fee distribution (daily)

**Files to create:**
```
/backend/
  src/
    index.ts                    # Express server entry point
    routes/
      markets.ts                # Market endpoints
      trades.ts                 # Trading endpoints
      auth.ts                   # Authentication
      portfolio.ts              # User portfolio
      vault.ts                  # Liquidity endpoints
      admin.ts                  # Admin endpoints
      bot.ts                    # Bot endpoints
    middleware/
      auth.ts                   # JWT verification
      rateLimit.ts              # Rate limiting
      adminAuth.ts              # Admin authentication
      botAuth.ts                # Bot API key check
    services/
      azuro.ts                  # Azuro API client
      websocket.ts              # WebSocket server
      points.ts                 # Points calculation
      vault.ts                  # Vault logic
      amm.ts                    # AMM calculations
    utils/
      eip712.ts                 # Signature verification
      logger.ts                 # Logging
    jobs/
      azuroResolution.ts        # Scheduled resolution check
      cleanupNotifications.ts   # Cleanup job
      vaultAlerts.ts            # Vault monitoring
  Dockerfile
  package.json
  tsconfig.json
```

**Estimated effort:** 40-60 hours  
**Priority:** 🔴 CRITICAL — Nothing else works without this

---

### 🤖 C2 — AMM BOT (DEPENDS ON C1)

**Status:** ⚠️ Mock loop exists in frontend  
**Blocking:** Real liquidity provision

**What exists:**
- Mock AMM logic in `src/components/admin/AMMBotPanel.tsx`
- UI for bot control
- Mock order generation

**What needs to be built:**

1. **Persistent Node.js Bot** (`/bots/marketMaker/index.ts`)
   - Runs as separate process on VPS
   - Connects to backend API (not direct DB access)
   - Uses `BOT_API_KEY` for authentication

2. **Bot Logic**
   ```typescript
   // Pseudocode
   setInterval(async () => {
     // 1. Fetch top markets from API
     const markets = await api.get('/api/v1/markets?sort=volume&limit=5');
     
     // 2. Get vault allocations
     const vault = await api.get('/api/v1/vault/state');
     
     // 3. For each market:
     for (const market of markets) {
       // Check if allocation < 30% of vault TVL
       const allocation = vault.allocations[market.id] || 0;
       const maxAllocation = vault.tvl * 0.30;
       
       if (allocation >= maxAllocation) continue;
       
       // 4. Fetch fair value from Azuro
       const fairValue = await azuro.getFairValue(market.azuroId);
       
       // 5. Calculate bid/ask with 2% spread
       const bidPrice = fairValue - 0.01;
       const askPrice = fairValue + 0.01;
       
       // 6. Place limit orders
       await api.post('/api/v1/bot/orders', {
         marketId: market.id,
         side: 'buy',
         outcome: 'yes',
         price: bidPrice,
         amount: calculateAmount(allocation, maxAllocation),
       });
       
       await api.post('/api/v1/bot/orders', {
         marketId: market.id,
         side: 'sell',
         outcome: 'yes',
         price: askPrice,
         amount: calculateAmount(allocation, maxAllocation),
       });
     }
     
     // 7. Update heartbeat
     await api.post('/api/v1/bot/heartbeat', {
       status: 'active',
       lastRun: new Date(),
       marketsProcessed: markets.length,
     });
   }, 30000); // Every 30 seconds
   ```

3. **Rebalancing Logic**
   - Cancel stale orders (>5 min old)
   - Adjust prices based on new fair value
   - Respect 30% cap per market
   - Maintain 2% spread target

4. **Risk Management**
   - Stop loss: exit if market moves >10% against position
   - Max position size: 30% of vault per market
   - Daily loss limit: 5% of vault TVL

5. **Logging**
   - All orders placed
   - Fair value updates
   - Rebalancing events
   - Errors and warnings

**Files to create:**
```
/bots/marketMaker/
  index.ts              # Main bot loop
  azuro.ts              # Azuro fair value fetcher
  orders.ts             # Order placement logic
  rebalance.ts          # Rebalancing logic
  config.ts             # Bot configuration
  Dockerfile
  package.json
```

**Deployment:**
- Docker container
- Runs alongside backend on VPS
- Restart policy: always
- Health check endpoint

**Estimated effort:** 20-30 hours  
**Priority:** 🟡 HIGH — Needed for real liquidity

---

### 🐦 C3 — TWITTER/X BOT (INDEPENDENT)

**Status:** ⚠️ Growth Engine UI exists  
**Blocking:** Organic growth

**What exists:**
- Growth Engine admin panel (`src/routes/admin/growth/index.tsx`)
- Content generation logic in `src/growthEngine/`
- Mock activity logs

**What needs to be built:**

1. **Persistent Node.js Bot** (`/bots/growthEngine/index.ts`)
   - Runs as separate process on VPS
   - Uses OpenRouter API for content generation
   - Posts to Twitter/X and Telegram

2. **Content Generation**
   - Reuse logic from `src/growthEngine/contentEngine.ts`
   - Generate 3 content types:
     - **preMatch**: 3-6 hours before event
     - **lastHour**: <1 hour before close (FOMO)
     - **controversial**: Contrarian takes
   - Use Claude Haiku via OpenRouter

3. **Distribution**
   - Post to Twitter/X using Twitter API v2
   - Post to Telegram channel
   - Track engagement (likes, retweets, replies)

4. **DM Engine** (optional)
   - Send targeted DMs to engaged users
   - Max 5 DMs per day
   - Require 3+ interactions before DM

5. **Cycle Logic**
   ```typescript
   setInterval(async () => {
     // 1. Scan top 3 markets
     const markets = await api.get('/api/v1/markets/hot?limit=3');
     
     // 2. Generate content for each
     for (const market of markets) {
       const content = await generateContent(market, 'preMatch');
       
       // 3. Post to Twitter
       const tweet = await twitter.post(content);
       
       // 4. Post to Telegram
       await telegram.sendMessage(content);
       
       // 5. Log activity
       await api.post('/api/v1/admin/growth/log', {
         platform: 'twitter',
         marketId: market.id,
         content,
         tweetId: tweet.id,
       });
     }
   }, 2 * 60 * 60 * 1000); // Every 2 hours
   ```

**Files to create:**
```
/bots/growthEngine/
  index.ts              # Main bot loop
  contentEngine.ts      # Copy from src/growthEngine/
  twitter.ts            # Twitter API client
  telegram.ts           # Telegram API client
  dmEngine.ts           # DM logic
  config.ts             # Bot configuration
  Dockerfile
  package.json
```

**Estimated effort:** 15-25 hours  
**Priority:** 🟢 MEDIUM — Nice to have for growth

---

### 📊 Affiliate/Analyst Backend

**Status:** ⚠️ UI complete, backend mock

**What exists:**
- Analyst registration form
- Dashboard UI
- Commission breakdown UI
- Referral tracking (frontend only)

**What needs to be built:**
- Real referral tracking in database
- Commission calculation on backend
- Payout approval workflow
- Affiliate link click tracking
- Conversion tracking

**Depends on:** C1 (backend)

---

### 🎯 Points Ledger

**Status:** ⚠️ UI complete, schema defined

**What exists:**
- Points display in account page
- Leaderboard UI
- Tier badges
- Points calculation logic (mock)

**What needs to be built:**
- Real points writes to database
- Streak tracking server-side
- Points history log
- Tier promotion logic
- Season rollover logic

**Depends on:** C1 (backend)

---

## ❌ NOT YET IMPLEMENTED

These features need to be built from scratch.

### 🔗 C4 — SMART CONTRACTS (BASE SEPOLIA TESTNET)

**Status:** ❌ Not started  
**Priority:** 🟡 MEDIUM — Needed for real trading

**What to build:**

1. **Fork Polymarket CTF (Conditional Token Framework)**
   - Binary outcome tokens (YES/NO)
   - Collateral: USDC on Base
   - Minting and burning logic

2. **Fork CTF Exchange**
   - Order book contract
   - Limit orders
   - Market orders
   - Fee collection (2% platform fee)

3. **Deploy to Base Sepolia**
   - Test with Sepolia ETH faucet
   - Deploy mock USDC contract for testing
   - Deploy CTF contracts
   - Deploy Exchange contract

4. **Integration**
   - Update frontend to use real contracts
   - Add contract ABIs to `src/config/contracts.ts`
   - Update Wagmi hooks to call real functions

**Files to create:**
```
/contracts/
  CTF.sol                   # Conditional Token Framework
  CTFExchange.sol           # Order book exchange
  MockUSDC.sol              # For testnet only
  scripts/
    deploy.ts               # Deployment script
  test/
    CTF.test.ts             # Contract tests
  hardhat.config.ts
  package.json
```

**Estimated effort:** 30-40 hours  
**Priority:** 🟡 MEDIUM — Needed before mainnet

---

### 🚀 C5 — MAINNET DEPLOYMENT (BASE)

**Status:** ❌ Not started  
**Priority:** 🔴 CRITICAL — Final step before launch

**Prerequisites:**
- C4 (testnet) fully tested and stable
- C1 (backend) deployed and stable
- C2 (AMM bot) running smoothly on testnet

**What to do:**

1. **Deploy Contracts to Base Mainnet**
   - Use real USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
   - Deploy CTF contracts
   - Deploy Exchange contract
   - Verify on Basescan

2. **Seed Liquidity**
   - Deposit $500 USDC to vault
   - Allocate to top 3 markets
   - Start AMM bot on mainnet

3. **Update Frontend**
   - Change `VITE_CHAIN_ID` to `8453`
   - Update contract addresses
   - Point to mainnet RPC

4. **Monitoring**
   - Set up alerts for contract events
   - Monitor vault balance
   - Track gas usage
   - Set up Etherscan alerts

**Estimated effort:** 10-15 hours (mostly testing)  
**Priority:** 🔴 CRITICAL — Final launch step

---

### 📈 DeFiLlama Adapter (POST-MAINNET)

**Status:** ❌ Not started  
**Priority:** 🟢 LOW — Marketing/visibility

**What to build:**

1. **TVL Adapter** (`/integrations/defiLlama/adapter.js`)
   - Fetch vault TVL from contract
   - Fetch market TVLs
   - Return in DeFiLlama format

2. **Submit PR**
   - Fork DefiLlama-Adapters repo
   - Add Predictio adapter
   - Submit PR with documentation

**Estimated effort:** 5-10 hours  
**Priority:** 🟢 LOW — Nice to have for credibility

---

## 💡 RECOMMENDED FUTURE FEATURES

These are not urgent but should be considered based on user feedback and traction.

### Phase 2 (After Mainnet Launch)

1. **Multi-Outcome Markets**
   - Not just YES/NO but Team A / Draw / Team B
   - More complex odds calculation
   - Higher liquidity requirements

2. **Live In-Play Markets**
   - Markets that update during the game
   - Real-time odds adjustments
   - Requires live data feed (expensive)

3. **Mobile App (React Native)**
   - Same codebase with Expo
   - Push notifications
   - Biometric authentication

4. **Email Digest**
   - Weekly summary of top markets
   - User's portfolio performance
   - Recommended markets

5. **AI-Assisted Localization (END OF PROJECT)**
   - Keep English as the canonical source language for the dApp.
   - Do not use live DOM translation in the browser; it loses product context and mistranslates crypto/trading terms.
   - Introduce structured i18n keys for user-facing copy (`t("header.markets")`, `t("onboarding.welcome.title")`, etc.).
   - Use AI offline/build-time to generate locale files (`it.json`, `es.json`, `fr.json`, etc.) from the English source.
   - Maintain a locked glossary for terms that must stay in English or be translated consistently:
     `Markets`, `Copy`, `Trading`, `Liquidity`, `YES`, `NO`, `USDC`, `Base`, `wallet`, `smart contract`, `prediction market`, `paper trading`, `odds`, `shares`, `vault`, `leaderboard`, `LP`, `AMM`, `DeFi`.
   - Add a translation style guide: concise product language, crypto-native terminology, no literal translations that sound like generic finance.
   - Add validation scripts to detect missing keys, extra keys, untranslated placeholders, and glossary violations.
   - Suggested implementation path:
     1. Add a lightweight i18n layer and browser-locale detection.
     2. Convert high-impact surfaces first: header, onboarding, home, markets, trading box, wallet/modals.
     3. Add `scripts/i18n-generate.*` to call an AI model with product context + glossary.
     4. Store generated translations in reviewed JSON files, not in runtime DOM mutations.
     5. Use runtime fallback: browser locale → supported locale file → English.
   - Estimated effort: 12-20 hours for the i18n foundation + first locales, then incremental per page.
   - Priority: 🟢 POST-LAUNCH / FINAL POLISH — important for international UX, but after core trading, backend, contracts, and launch stability.

### Phase 3 (With PRED Token)

1. **Governance Voting**
   - Community proposes new markets
   - Vote on platform changes
   - Treasury management

2. **PRED Staking**
   - Stake PRED for APY boost on vault
   - Fee discounts for holders
   - Exclusive market access

3. **DAO Treasury**
   - Protocol fees go to treasury
   - PRED holders vote on spending
   - Grants for developers

### Growth Features

1. **Embed Widget**
   - `<iframe>` for external sites
   - Single market display
   - Customizable styling

2. **Telegram Bot**
   - `/price <market>` — Get current odds
   - `/trade <market> <amount>` — Place trade
   - Alerts for price movements

3. **Public API**
   - Already documented (`src/routes/developers/docs/index.tsx`)
   - Needs real backend implementation
   - Rate limiting per API key

---

## 📋 DEVELOPMENT PRIORITIES

**Recommended order for Cursor AI:**

1. **🔴 C1 — Backend** (MUST DO FIRST)
   - Blocks everything else
   - 40-60 hours
   - Start with basic Express server + PostgreSQL
   - Then add endpoints one by one
   - Finally add WebSocket and scheduled jobs

2. **🟡 C2 — AMM Bot** (AFTER C1)
   - Needed for real liquidity
   - 20-30 hours
   - Can start on testnet while C1 is being finished

3. **🟡 C4 — Smart Contracts** (PARALLEL WITH C2)
   - Needed for real trading
   - 30-40 hours
   - Deploy to Sepolia testnet first
   - Test thoroughly before mainnet

4. **🔴 C5 — Mainnet** (AFTER C2 + C4 STABLE)
   - Final launch step
   - 10-15 hours
   - Only after testnet is proven stable

5. **🟢 C3 — Twitter Bot** (ANYTIME)
   - Independent of other features
   - 15-25 hours
   - Can be done in parallel

6. **🟢 DeFiLlama** (AFTER MAINNET)
   - Marketing/visibility
   - 5-10 hours
   - Low priority

7. **🟢 AI-Assisted Localization** (END OF PROJECT / FINAL POLISH)
   - Add structured i18n after product flows stabilize
   - Generate translations with AI using a locked crypto/trading glossary
   - Keep core dApp terms in English where that is clearer than literal local translation
   - Avoid runtime DOM translation

---

**Last Updated:** 2025-01-29  
**Maintainer:** Predictio Team  
**Next Steps:** See `docs/CURSOR_HANDOFF.md` for implementation guide
