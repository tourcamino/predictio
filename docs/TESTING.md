# Predictio.live — Testing Guide

**Last Updated:** 2025-01-29  
**Status:** Production Testing Ready

---

## Overview

This document provides comprehensive testing procedures for all features of Predictio.live. Use this guide to verify that the application works correctly before and after deployments.

---

## Table of Contents

1. [Environment Setup](#1-environment-setup)
2. [Core Trading Features](#2-core-trading-features)
3. [Market Lifecycle](#3-market-lifecycle)
4. [Affiliate & Analyst System](#4-affiliate--analyst-system)
5. [Notification System](#5-notification-system)
6. [Liquidity Pool (Vault)](#6-liquidity-pool-vault)
7. [Portfolio & P&L](#7-portfolio--pl)
8. [Copy Trading](#8-copy-trading)
9. [Admin Dashboard](#9-admin-dashboard)
10. [Integration Tests](#10-integration-tests)
11. [Performance Tests](#11-performance-tests)
12. [Security Tests](#12-security-tests)

---

## 1. Environment Setup

### Prerequisites
- Base wallet with testnet ETH (Base Sepolia)
- Test USDC tokens (mock or faucet)
- Admin credentials
- Multiple test wallets for multi-user scenarios

### Configuration Check
```bash
# Verify environment variables
npm run typecheck
npm run lint

# Check database connection
npx prisma db pull

# Verify API endpoints
curl http://localhost:3001/api/v1/health
```

### Expected Results
- ✅ All environment variables loaded
- ✅ Database connection successful
- ✅ API health check returns 200 OK
- ✅ Frontend loads without errors

---

## 2. Core Trading Features

### Test 2.1: Market Discovery
**Objective:** Verify users can browse and filter markets

**Steps:**
1. Navigate to `/markets`
2. Verify markets load and display correctly
3. Test filters:
   - Sport filter (Football, Basketball, etc.)
   - Status filter (Open, Locked, Resolved)
   - Search by team/event name
   - Sort by volume, ending soon, newest
4. Test pagination (20 markets per page)
5. Switch between grid and list view

**Expected Results:**
- ✅ Markets display with correct data (odds, volume, countdown)
- ✅ Filters work correctly and update URL params
- ✅ Search returns relevant results
- ✅ Pagination loads next page
- ✅ View toggle works smoothly

### Test 2.2: Place Market Order
**Objective:** Verify users can place trades

**Steps:**
1. Navigate to a market detail page
2. Click on YES or NO outcome
3. Enter trade amount (e.g., $100)
4. Verify slippage calculation displays
5. Verify expected payout displays
6. Click "Place Trade"
7. Sign wallet transaction (or confirm paper trade)
8. Verify success toast appears
9. Check position appears in portfolio

**Expected Results:**
- ✅ Trade box calculates correct payout
- ✅ Slippage displays (should be <2% for liquid markets)
- ✅ Transaction succeeds
- ✅ Position appears in `/portfolio`
- ✅ Balance updates correctly

### Test 2.3: Place Limit Order
**Objective:** Verify limit order functionality

**Steps:**
1. Navigate to market detail page
2. Toggle to "Limit" order type
3. Enter desired odds (e.g., 0.55 for 55%)
4. Enter amount
5. Verify order preview
6. Place order
7. Check order appears in order book
8. Verify order fills when price matches

**Expected Results:**
- ✅ Limit order placed successfully
- ✅ Order visible in order book
- ✅ Order fills when market price reaches limit price
- ✅ User receives notification when order fills

### Test 2.4: Sell Position
**Objective:** Verify users can close positions

**Steps:**
1. Navigate to `/portfolio`
2. Find an open position
3. Click "Sell" button
4. Use slider to select amount (test partial and full sell)
5. Verify expected proceeds display
6. Confirm sale
7. Verify position updates or closes
8. Check P&L calculation

**Expected Results:**
- ✅ Sell controls work correctly
- ✅ Partial sells reduce position size
- ✅ Full sells close position
- ✅ P&L calculated correctly (unrealized → realized)
- ✅ Balance updates

---

## 3. Market Lifecycle

### Test 3.1: OPEN State
**Objective:** Verify markets in OPEN state allow trading

**Steps:**
1. Find a market with >1 hour until start time
2. Verify countdown timer displays
3. Verify "OPEN" badge displays
4. Attempt to place trade
5. Verify trade succeeds

**Expected Results:**
- ✅ Countdown shows time remaining
- ✅ Status badge shows "OPEN" in green
- ✅ Trading box is enabled
- ✅ Trades execute successfully

### Test 3.2: LOCKED State
**Objective:** Verify markets lock at start time

**Steps:**
1. Find a market within 5 minutes of start time
2. Watch countdown approach zero
3. Verify status changes to "LOCKED"
4. Verify trading box becomes disabled
5. Attempt to place trade (should fail)

**Expected Results:**
- ✅ Status changes to "LOCKED" at T=0
- ✅ Badge color changes to orange/yellow
- ✅ Trading box shows "Trading closed" message
- ✅ Trades are rejected with error message

### Test 3.3: RESOLVED State
**Objective:** Verify market resolution and payouts

**Steps:**
1. Find a resolved market in portfolio
2. Verify resolution outcome displays (YES/NO)
3. Check if position was winning or losing
4. For winning positions:
   - Verify "Claim Winnings" button appears
   - Click claim button
   - Verify payout amount
   - Confirm claim
   - Verify balance increases
5. For losing positions:
   - Verify "Lost" badge displays
   - Verify no claim button

**Expected Results:**
- ✅ Resolution displays correctly
- ✅ Winning positions show claim button
- ✅ Claim process works smoothly
- ✅ Payout matches expected amount
- ✅ Losing positions marked correctly

### Test 3.4: Azuro Resolution Sync
**Objective:** Verify automatic resolution from Azuro

**Steps:**
1. Trigger manual Azuro resolution check (admin panel)
2. Verify resolved markets update
3. Check that positions auto-resolve
4. Verify notifications sent to users

**Expected Results:**
- ✅ Azuro API returns resolution data
- ✅ Markets update to RESOLVED status
- ✅ Winning outcome set correctly
- ✅ Users receive resolution notifications

---

## 4. Affiliate & Analyst System

### Test 4.1: Analyst Registration
**Objective:** Verify users can become analysts

**Steps:**
1. Navigate to `/analyst-dashboard`
2. Click "Become an Analyst"
3. Fill in profile information:
   - Display name
   - Bio
   - Twitter handle
   - Telegram username
   - Sport specializations
4. Submit registration
5. Verify referral code generated (6-8 chars)
6. Verify analyst dashboard displays

**Expected Results:**
- ✅ Registration form validates inputs
- ✅ Unique referral code generated
- ✅ Analyst profile created in database
- ✅ Dashboard shows 0 followers, 0 volume initially

### Test 4.2: Referral Link Attribution
**Objective:** Verify referral tracking works

**Steps:**
1. Get analyst referral code (e.g., "ABC123")
2. Open incognito window
3. Visit `/join/ABC123`
4. Verify welcome banner displays
5. Verify cookie is set (check DevTools)
6. Connect wallet
7. Place a trade
8. Verify analyst receives commission credit

**Expected Results:**
- ✅ Referral link sets cookie (120 days)
- ✅ Welcome message displays analyst name
- ✅ Cookie persists across sessions
- ✅ First trade attributes to analyst
- ✅ Commission calculated correctly (35% + 15% referral)

### Test 4.3: Fee Split Calculation
**Objective:** Verify 50/35/15 fee distribution

**Test Scenario A: Normal case (analyst + referral)**
- Trade: $1000
- Fee: $10 (1%)
- Expected split:
  - Vault: $5.00 (50%)
  - Analyst: $3.50 (35%)
  - Referral: $1.50 (15%)

**Test Scenario B: Analyst is referral (same wallet)**
- Trade: $1000
- Fee: $10 (1%)
- Expected split:
  - Vault: $5.00 (50%)
  - Analyst: $5.00 (35% + 15% combined)
  - Referral: $0 (same as analyst)

**Test Scenario C: No referral (direct visit)**
- Trade: $1000
- Fee: $10 (1%)
- Expected split:
  - Vault: $5.00 (50%)
  - Analyst: $3.50 (35%)
  - Treasury: $1.50 (15% goes to treasury)

**Test Scenario D: No analyst (user not registered)**
- Trade: $1000
- Fee: $10 (1%)
- Expected split:
  - Vault: $5.00 (50%)
  - Treasury: $3.50 (35% goes to treasury)
  - Referral: $1.50 (15%)

**Steps:**
1. Set up test scenarios with different wallet combinations
2. Place trades for each scenario
3. Query `AffiliateReward` table
4. Verify fee amounts match expected splits
5. Check `FeeTransaction` records

**Expected Results:**
- ✅ All 4 scenarios calculate correctly
- ✅ Founder wallet excluded from referral fees
- ✅ Treasury receives unclaimed portions

### Test 4.4: Commission Payout
**Objective:** Verify analysts can claim rewards

**Steps:**
1. Generate >€10 in commissions for test analyst
2. Navigate to analyst dashboard
3. Verify "Pending Rewards" displays correct amount
4. Click "Request Payout"
5. Verify payout request created
6. Admin: Approve payout in `/admin/affiliate-manager`
7. Verify analyst receives notification
8. Verify balance updates

**Expected Results:**
- ✅ Pending rewards calculated correctly
- ✅ Payout threshold (€10) enforced
- ✅ Payout request creates notification for admin
- ✅ Approval processes payment
- ✅ Analyst receives confirmation notification

### Test 4.5: Analyst Leaderboard
**Objective:** Verify analyst rankings

**Steps:**
1. Navigate to `/analysts`
2. Verify leaderboard displays
3. Check sort options:
   - Total volume generated
   - Number of followers
   - Win rate
   - Total commissions earned
4. Verify stats are accurate
5. Click on analyst to view profile

**Expected Results:**
- ✅ Leaderboard loads correctly
- ✅ Stats match database values
- ✅ Sort options work
- ✅ Profile links work

---

## 5. Notification System

### Test 5.1: Notification Creation
**Objective:** Verify notifications are created for key events

**Test each notification type:**

1. **POSITION_OPENED**
   - Place a trade
   - Check notification bell (should show +1)
   - Open notification center
   - Verify "Position opened" message

2. **MARKET_RESOLVED**
   - Wait for market resolution (or trigger manually)
   - Verify notification appears
   - Check notification links to resolved market

3. **MARKET_CLOSING_SOON**
   - Market with <1 hour remaining should trigger
   - Verify "Market closing soon" notification

4. **COMMISSION_UPDATE**
   - Generate commission as analyst
   - Verify notification when threshold reached

5. **NEW_FOLLOWER**
   - Have another user follow analyst
   - Verify analyst receives notification

6. **LP_FEE_EARNED**
   - Deposit to vault
   - Wait for fee distribution
   - Verify LP fee notification

**Expected Results:**
- ✅ All notification types created correctly
- ✅ Unread count increments
- ✅ Notifications display in center
- ✅ Links work correctly

### Test 5.2: Mark as Read
**Objective:** Verify read/unread functionality

**Steps:**
1. Have several unread notifications
2. Click on one notification
3. Verify it marks as read (blue dot disappears)
4. Verify unread count decrements
5. Click "Mark all as read"
6. Verify all notifications marked
7. Verify count goes to 0

**Expected Results:**
- ✅ Individual mark as read works
- ✅ Mark all as read works
- ✅ Count updates correctly
- ✅ UI reflects read state

### Test 5.3: Notification Cleanup
**Objective:** Verify old notifications are cleaned up

**Steps:**
1. Check admin dashboard for cleanup job status
2. Verify job runs daily
3. Check that notifications >30 days old are deleted
4. Verify read notifications >7 days old are deleted

**Expected Results:**
- ✅ Cleanup job runs on schedule
- ✅ Old notifications removed
- ✅ Recent notifications preserved

---

## 6. Liquidity Pool (Vault)

### Test 6.1: Vault Deposit
**Objective:** Verify users can deposit to protocol vault

**Steps:**
1. Navigate to `/liquidity`
2. Click "Deposit" button
3. Enter amount (e.g., $500)
4. Verify APY estimate displays
5. Confirm deposit
6. Sign transaction
7. Verify success message
8. Check vault position appears
9. Verify TVL increases

**Expected Results:**
- ✅ Deposit modal works
- ✅ APY calculation correct
- ✅ Transaction succeeds
- ✅ User receives LP shares
- ✅ Position displays in `/liquidity`

### Test 6.2: Vault Withdrawal
**Objective:** Verify users can withdraw from vault

**Steps:**
1. Have active vault position
2. Click "Withdraw" button
3. Enter amount (test partial and full)
4. Verify fees/penalties display (if any)
5. Confirm withdrawal
6. Verify position updates or closes
7. Verify balance increases

**Expected Results:**
- ✅ Withdrawal modal works
- ✅ Partial withdrawals reduce position
- ✅ Full withdrawals close position
- ✅ Balance updates correctly

### Test 6.3: LP Fee Distribution
**Objective:** Verify LPs earn fees from trading

**Steps:**
1. Have active vault position
2. Wait for trades to occur (or simulate)
3. Trigger fee distribution (admin or scheduled)
4. Verify LP earnings increase
5. Check earnings breakdown by market
6. Verify notification sent

**Expected Results:**
- ✅ Fees distributed proportionally to LP shares
- ✅ Earnings tracked correctly
- ✅ APY updates based on fees earned
- ✅ Notification sent to LPs

### Test 6.4: Auto-Compound Toggle
**Objective:** Verify auto-compound setting

**Steps:**
1. Navigate to vault position
2. Toggle "Auto-compound earnings"
3. Verify setting saves
4. Wait for fee distribution
5. If auto-compound ON:
   - Verify fees reinvested automatically
   - Verify LP shares increase
6. If auto-compound OFF:
   - Verify fees added to claimable balance
   - Verify "Claim Fees" button appears

**Expected Results:**
- ✅ Toggle saves correctly
- ✅ Auto-compound reinvests fees
- ✅ Manual claim works when OFF

### Test 6.5: Vault Allocation (30% Cap)
**Objective:** Verify vault respects 30% cap per market

**Steps:**
1. Admin: View vault allocations
2. Identify market with highest allocation
3. Attempt to allocate >30% to single market
4. Verify system rejects or rebalances

**Expected Results:**
- ✅ System enforces 30% cap
- ✅ Rebalancing works automatically
- ✅ Alert triggered if cap approached

---

## 7. Portfolio & P&L

### Test 7.1: Portfolio Summary
**Objective:** Verify portfolio displays correctly

**Steps:**
1. Navigate to `/portfolio`
2. Verify summary cards display:
   - Total Portfolio Value
   - Total P&L (realized + unrealized)
   - Win Rate
   - Total Volume
3. Verify charts display:
   - Portfolio value over time
   - P&L history
   - ROI by sport
4. Check position list

**Expected Results:**
- ✅ All metrics calculated correctly
- ✅ Charts render without errors
- ✅ Positions display current values
- ✅ Unrealized P&L updates in real-time

### Test 7.2: P&L Calculation
**Objective:** Verify P&L is calculated correctly

**Test Case:**
- Buy: 100 shares @ $0.60 = $60 cost
- Current price: $0.70
- Expected unrealized P&L: +$10 (+16.67%)

**Steps:**
1. Place trade at known price
2. Wait for price to change (or mock)
3. Check position card
4. Verify unrealized P&L matches calculation
5. Sell position
6. Verify realized P&L matches

**Expected Results:**
- ✅ Unrealized P&L calculated correctly
- ✅ Realized P&L matches on close
- ✅ Total P&L = realized + unrealized

### Test 7.3: Transaction History
**Objective:** Verify all transactions are logged

**Steps:**
1. Navigate to `/portfolio` → Transactions tab
2. Verify all transaction types display:
   - Deposits
   - Withdrawals
   - Trades (buy/sell)
   - Claims
   - LP deposits/withdrawals
3. Test filters
4. Test export to CSV
5. Verify pagination

**Expected Results:**
- ✅ All transactions logged correctly
- ✅ Filters work
- ✅ Export generates valid CSV
- ✅ Pagination works

---

## 8. Copy Trading

### Test 8.1: Start Copy Trading
**Objective:** Verify users can copy analysts

**Steps:**
1. Navigate to analyst profile
2. Click "Copy Portfolio" button
3. Set copy parameters:
   - Max allocation per trade (e.g., $50)
   - Copy mode: All markets or Selective
4. If selective, choose markets
5. Confirm copy relationship
6. Verify "Copying" badge appears

**Expected Results:**
- ✅ Copy modal works
- ✅ Settings save correctly
- ✅ Copy relationship created in DB
- ✅ Badge displays on analyst profile

### Test 8.2: Copy Trade Execution
**Objective:** Verify trades are mirrored correctly

**Steps:**
1. Have active copy relationship
2. Analyst places trade ($100 on YES)
3. Verify copier receives notification
4. Verify copier's trade executes automatically:
   - Same outcome (YES)
   - Scaled amount based on max allocation
5. Check both positions appear in portfolios

**Expected Results:**
- ✅ Trade mirrored within seconds
- ✅ Amount scaled correctly
- ✅ Notification sent to copier
- ✅ Both positions created

### Test 8.3: Copy Trade Failure Handling
**Objective:** Verify graceful failure handling

**Test scenarios:**
- Copier has insufficient balance
- Market is locked
- Max allocation would be exceeded

**Steps:**
1. Set up failure condition
2. Have analyst place trade
3. Verify copier's trade fails gracefully
4. Verify copier receives notification of failure
5. Verify analyst's trade still succeeds

**Expected Results:**
- ✅ Failures don't block analyst's trade
- ✅ Copier notified of failure reason
- ✅ Copy relationship remains active

### Test 8.4: Stop Copy Trading
**Objective:** Verify users can stop copying

**Steps:**
1. Have active copy relationship
2. Navigate to copy settings
3. Click "Stop Copying"
4. Confirm action
5. Verify relationship deactivated
6. Have analyst place new trade
7. Verify copier does NOT receive trade

**Expected Results:**
- ✅ Stop copy works immediately
- ✅ No new trades mirrored
- ✅ Existing positions remain open
- ✅ Badge removed from analyst profile

---

## 9. Admin Dashboard

### Test 9.1: Market Creation
**Objective:** Verify admins can create markets

**Steps:**
1. Login as admin
2. Navigate to `/admin/create`
3. Fill in market details:
   - Sport
   - Event name
   - Teams/competitors
   - Start time
   - Initial odds
4. Submit form
5. Verify market appears in `/markets`
6. Verify market is tradeable

**Expected Results:**
- ✅ Form validates inputs
- ✅ Market created successfully
- ✅ Market appears immediately
- ✅ Trading works

### Test 9.2: Market Resolution
**Objective:** Verify admins can resolve markets

**Steps:**
1. Navigate to `/admin/resolve`
2. Find locked market
3. Select winning outcome (YES or NO)
4. Enter resolution reason
5. Confirm resolution
6. Verify market status changes to RESOLVED
7. Verify users can claim winnings

**Expected Results:**
- ✅ Resolution form works
- ✅ Market resolves correctly
- ✅ Notifications sent to all traders
- ✅ Payouts calculated correctly

### Test 9.3: Void Market
**Objective:** Verify admins can void markets

**Steps:**
1. Navigate to `/admin/resolve`
2. Select market to void
3. Choose "Void Market" option
4. Enter reason
5. Confirm void
6. Verify all positions refunded
7. Verify notifications sent

**Expected Results:**
- ✅ Market voided successfully
- ✅ All users refunded in full
- ✅ Notifications explain void reason

### Test 9.4: Bot Control
**Objective:** Verify admin can control AMM bot

**Steps:**
1. Navigate to `/admin/dashboard`
2. Find AMM bot panel
3. Check heartbeat status
4. Click "Stop Bot"
5. Verify bot stops placing orders
6. Click "Start Bot"
7. Verify bot resumes
8. View bot orders modal
9. Verify orders display correctly

**Expected Results:**
- ✅ Start/stop controls work
- ✅ Heartbeat updates
- ✅ Orders display correctly

---

## 10. Integration Tests

### Test 10.1: End-to-End User Flow
**Objective:** Test complete user journey

**Steps:**
1. New user visits site
2. Connects wallet
3. Completes onboarding
4. Deposits USDC
5. Browses markets
6. Places first trade
7. Receives notification
8. Checks portfolio
9. Sells position for profit
10. Withdraws funds

**Expected Results:**
- ✅ Entire flow works smoothly
- ✅ No errors or crashes
- ✅ All state updates correctly

### Test 10.2: Multi-User Scenario
**Objective:** Test interactions between multiple users

**Actors:**
- User A: Analyst
- User B: Copier
- User C: Regular trader

**Steps:**
1. User A registers as analyst
2. User B follows User A
3. User B starts copying User A
4. User A places trade
5. User B's trade executes automatically
6. User C places opposite trade on same market
7. Market resolves
8. All users receive correct payouts
9. User A receives commission

**Expected Results:**
- ✅ All interactions work correctly
- ✅ Copy trading works
- ✅ Commissions calculated correctly
- ✅ Payouts correct for all users

---

## 11. Performance Tests

### Test 11.1: Load Time
**Objective:** Verify pages load quickly

**Metrics:**
- Homepage: <2 seconds
- Markets page: <3 seconds
- Market detail: <2 seconds
- Portfolio: <2 seconds

**Tools:** Lighthouse, WebPageTest

### Test 11.2: Real-time Updates
**Objective:** Verify WebSocket performance

**Steps:**
1. Open multiple browser tabs
2. Monitor WebSocket connections
3. Place trades in one tab
4. Verify updates appear in other tabs
5. Check update latency (<500ms)

**Expected Results:**
- ✅ Updates appear quickly
- ✅ No connection drops
- ✅ Memory usage stable

---

## 12. Security Tests

### Test 12.1: Authentication
**Objective:** Verify auth is secure

**Tests:**
- Try accessing `/admin` without auth → Should redirect
- Try accessing API endpoints without JWT → Should return 401
- Try replaying old JWT → Should fail
- Try modifying JWT → Should fail

### Test 12.2: Authorization
**Objective:** Verify users can only access their own data

**Tests:**
- Try accessing another user's portfolio → Should fail
- Try modifying another user's positions → Should fail
- Try claiming another user's rewards → Should fail

### Test 12.3: Input Validation
**Objective:** Verify all inputs are validated

**Tests:**
- Try negative trade amounts → Should reject
- Try SQL injection in search → Should sanitize
- Try XSS in bio field → Should escape
- Try extremely large numbers → Should validate

---

## Test Results Template

Use this template to document test results:

```markdown
## Test Run: [Date]
**Tester:** [Name]
**Environment:** [Production/Staging/Local]
**Version:** [Git commit hash]

### Results Summary
- Total Tests: X
- Passed: Y
- Failed: Z
- Skipped: W

### Failed Tests
1. Test 2.3 - Limit Order Placement
   - **Issue:** Order book not updating
   - **Severity:** High
   - **Steps to Reproduce:** ...
   - **Expected:** ...
   - **Actual:** ...

### Notes
- [Any additional observations]
```

---

## Continuous Testing

### Automated Tests
- Run unit tests: `npm run test`
- Run E2E tests: `npm run test:e2e`
- Run type checks: `npm run typecheck`

### Manual Testing Schedule
- **Daily:** Smoke tests (login, place trade, check portfolio)
- **Weekly:** Full regression test suite
- **Pre-deployment:** Complete test suite + load tests
- **Post-deployment:** Smoke tests + monitor for errors

---

## Reporting Issues

When reporting bugs, include:
1. Test case ID
2. Steps to reproduce
3. Expected result
4. Actual result
5. Screenshots/videos
6. Browser/device info
7. Console errors
8. Network requests (if relevant)

---

**Built with ⚡ by Predictio Team**
