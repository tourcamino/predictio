# Predictio.live Affiliate System Refactor - Progress Report

## ✅ COMPLETED

### Step 1: Environment Variables
- ✅ Added all new env vars to `.env.example`
- ✅ Updated `src/server/env.ts` with Zod validation for:
  - TREASURY_WALLET, FOUNDER_WALLET, FOUNDER_REF_CODE
  - FEE_VAULT, FEE_ANALYST, FEE_REFERRAL, TAKER_FEE_RATE
  - PAYOUT_THRESHOLD_EUR, USDC_EUR_RATE
  - REFERRAL_COOKIE_DAYS, REFERRAL_COOKIE_NAME
  - BASE_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID
  - CTF_CONTRACT_ADDRESS, CTF_EXCHANGE_ADDRESS, USDC_CONTRACT_ADDRESS

### Step 2: Database Schema (Prisma)
- ✅ Added new tables:
  - `Affiliate` - stores affiliate/analyst wallet info and ref codes
  - `ReferralTracking` - tracks cookie-based referral attribution
  - `AffiliateReward` - records all fee rewards (analyst + referral)
  - `PayoutLog` - tracks payout history
  - `TreasuryLog` - logs fees going to treasury
  - `CopyRelationship` - manages copy trading relationships
  - `Leaderboard` - synchronized leaderboard data
- ✅ Updated `Analyst` model - removed tier field
- ✅ Updated `ApiKey` model - added paperMode and label fields

### Step 3: Fee Calculation Service
- ✅ Created `src/server/services/feeCalculation.ts`
- ✅ Implemented 50/35/15 fee split logic
- ✅ Implemented all 4 special cases:
  - Case A: analyst = referral (same wallet gets 50%)
  - Case B: no referral (15% to treasury)
  - Case C: no analyst (35% to treasury)
  - Case D: neither (50% to treasury)
- ✅ Implemented founder wallet exclusion logic
- ✅ Implemented €10 payout threshold checking
- ✅ Admin notification when threshold reached

### Step 4: Core Trading Logic Updates
- ✅ Removed dynamic fee calculation (0.8-1.2%)
- ✅ Replaced with fixed 1% taker fee in `src/utils/marketUtils.ts`
- ✅ Updated `placePrediction.ts` to use new fee service
- ✅ Integrated referral tracking lookup
- ✅ Integrated copy relationship lookup
- ✅ Updated `distributeLPFees.ts` to 50% vault share

### Step 5: Reward Engine Simplification
- ✅ Replaced `src/systems/rewardEngine.ts` with simplified version
- ✅ Removed all tier logic (Bronze/Silver/Gold/Elite)
- ✅ Kept only essential constants for backward compatibility

### Step 6: Analyst Registration
- ✅ Updated `registerAsAnalyst.ts` to remove tier initialization
- ✅ Simplified referral code generation (6-8 chars alphanumeric)
- ✅ Updated `updateAnalystMetrics.ts` to remove tier calculations

### Step 7: UI Pages - Affiliate Program
- ✅ Completely rewrote `/affiliates` page
- ✅ Removed all tier-based content
- ✅ Added new hero with 50/35/15 messaging
- ✅ Added fee structure breakdown section
- ✅ Added interactive calculator (copiers × volume × rate)
- ✅ Updated FAQ with new fee structure

### Step 8: UI Pages - Liquidity/Vault
- ✅ Updated `/liquidity` page
- ✅ Changed all 70% references to 50%
- ✅ Updated estimated returns table
- ✅ Updated value proposition text
- ✅ Added disclaimer about variable returns

## 🚧 IN PROGRESS / TODO

### Step 9: Referral Link System (HIGH PRIORITY)
- ⏳ Create `/join/:referralCode` route handler
- ⏳ Implement cookie setting (120 days)
- ⏳ Add welcome banner when arriving via referral link
- ⏳ Update `syncUserAccount.ts` to:
  - Generate ref code for new users
  - Check for `predictio_ref` cookie
  - Create `ReferralTracking` entry
  - Create `Affiliate` entry with unique ref code
- ⏳ Add founder wallet initialization with "PREDICTIO" ref code

### Step 10: Share Button Enhancement (HIGH PRIORITY)
- ⏳ Update `ShareButton.tsx` to append `?ref=CODE` to URLs
- ⏳ Update `ShareModal.tsx` with ref parameter logic
- ⏳ Add share buttons to:
  - Every market page
  - Every article page
  - Analyst profile pages
- ⏳ Add tooltip when wallet not connected

### Step 11: Copy Trading System (HIGH PRIORITY)
- ⏳ Create copy trading modal component
- ⏳ Add "Copy Portfolio" button to analyst profiles
- ⏳ Implement copy relationship CRUD endpoints:
  - `startCopyingAnalyst` mutation
  - `stopCopyingAnalyst` mutation
  - `updateCopySettings` mutation
- ⏳ Update `placePrediction.ts` to mirror trades for copiers
- ⏳ Add copy relationship triggers in trade execution

### Step 12: Leaderboard Synchronization (MEDIUM PRIORITY)
- ⏳ Create leaderboard sync triggers:
  - Trigger 1: On trade open/close
  - Trigger 2: On market resolution
  - Trigger 3: On copy relationship change
- ⏳ Update `getLeaderboard.ts` to query new Leaderboard table
- ⏳ Add WebSocket real-time updates for top 10
- ⏳ Update leaderboard UI to show:
  - Active copiers count
  - Analyst rewards earned
  - Referral rewards earned

### Step 13: Analyst Profile Page Enhancement (MEDIUM PRIORITY)
- ⏳ Make wallet addresses in leaderboard clickable
- ⏳ Create `/analysts/:wallet` route
- ⏳ Show analyst's open trades
- ⏳ Show trade history with win/loss
- ⏳ Show active copiers count
- ⏳ Add prominent "Copy Portfolio" button

### Step 14: Account Dashboard - Affiliate Section (MEDIUM PRIORITY)
- ⏳ Add "Affiliate & Rewards" tab to `/account`
- ⏳ Show referral link with copy button
- ⏳ Show QR code for referral link
- ⏳ Show stats:
  - Active referrals count
  - Volume generated
  - Analyst rewards earned
  - Referral rewards earned
  - Pending payout amount
  - Progress bar to €10 threshold
- ⏳ Show rewards history table
- ⏳ Show list of active copiers

### Step 15: Admin Panel - Payout Management (MEDIUM PRIORITY)
- ⏳ Create "Affiliate Payouts" section in admin
- ⏳ Show list of wallets with pending_rewards_eur >= 10
- ⏳ Add "Mark as Paid" button with modal:
  - Input: TX hash or payment reference
  - Input: Amount paid (USDC)
  - Notes field
- ⏳ Add notification badge when payouts pending
- ⏳ Add global stats:
  - Total rewards paid
  - Total rewards pending
  - Total treasury accumulated
  - Active affiliates count

### Step 16: Developer API Enhancement (LOW PRIORITY)
- ⏳ Add API key management UI in user settings
- ⏳ Create endpoints:
  - `generateAPIKey` mutation
  - `revokeAPIKey` mutation
  - `listAPIKeys` query
- ⏳ Show API keys with label and last 4 chars
- ⏳ Paper trading flag for API trades
- ⏳ Update rate limiting to 100 req/min per key

### Step 17: Database Migrations
- ⏳ Run `npx prisma migrate dev` to create migration
- ⏳ Test migration on development database
- ⏳ Seed founder wallet with PREDICTIO ref code

### Step 18: Testing & Verification
- ⏳ Test all 4 fee split cases manually
- ⏳ Verify founder wallet exclusion works
- ⏳ Test €10 payout threshold notification
- ⏳ Test referral cookie setting and attribution
- ⏳ Test copy trading execution
- ⏳ Verify leaderboard sync on all triggers
- ⏳ Test share button ref parameter appending

### Step 19: UI Component Updates
- ⏳ Remove `TierBadge` component or update to show "Analyst" only
- ⏳ Update mock data in `mockAffiliates.ts` to remove tiers
- ⏳ Update analyst leaderboard to remove tier column
- ⏳ Update all commission/reward displays to show 35%/15%

### Step 20: Documentation
- ⏳ Update README with new fee structure
- ⏳ Update API documentation for developers
- ⏳ Create affiliate onboarding guide
- ⏳ Document payout process for demo phase

## 📋 CRITICAL PATH (Do These First)

1. **Database Migration** - Run Prisma migration to create new tables
2. **Founder Wallet Seed** - Initialize founder with PREDICTIO ref code
3. **Referral Link System** - Critical for attribution to work
4. **Share Button Updates** - Critical for ref parameter tracking
5. **Account Dashboard Updates** - Users need to see their ref links
6. **Copy Trading System** - Core feature for analyst rewards

## ⚠️ KNOWN ISSUES TO FIX

1. `TierBadge` component still references old tier colors
2. Mock data in `mockAffiliates.ts` still has tier fields
3. Analyst leaderboard still shows tier column
4. Some old tier references may exist in other components
5. Need to update getAnalystLeaderboard to not return tier

## 🔧 CONFIGURATION NEEDED

Before deploying to production:
1. Set TREASURY_WALLET in .env
2. Set FOUNDER_WALLET in .env
3. Ensure USDC_CONTRACT_ADDRESS is correct for Base mainnet
4. Set USDC_EUR_RATE to current exchange rate
5. Configure email notifications for admin payouts

## 📊 METRICS TO TRACK

After deployment:
- Total affiliate rewards distributed
- Average time to €10 threshold
- Most successful referral codes
- Copy trading volume
- Treasury accumulation
- Leaderboard ranking changes
