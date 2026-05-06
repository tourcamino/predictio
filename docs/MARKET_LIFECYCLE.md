# Market Lifecycle System — Implementation Guide

## Overview

The Market Lifecycle system manages the three states of every sports prediction market:

1. **OPEN** — Trading is active, countdown visible
2. **LOCKED** — Match started, trading closed, awaiting result
3. **RESOLVED** — Match finished, result confirmed, payouts executed

## Core Concept

Trading closes **exactly at kickoff** (start_time). What happens after (actual match duration, extra time, VAR) is not our concern — Azuro oracle resolves when it has the official result.

## Implementation Status

### ✅ Completed (Frontend)

#### 1. Type Definitions
- **File**: `src/data/mockMarkets.ts`
- **Added fields**:
  - `start_time: Date` — Kickoff time when trading locks
  - `result?: 'yes' | 'no'` — Only set when resolved
  - `resolved_at?: Date` — Only set when resolved

#### 2. Utility Functions
- **File**: `src/utils/marketLifecycle.ts`
- **Functions**:
  - `getMarketStatus(market)` — Real-time status calculation
  - `isMarketTradeable(market)` — Quick tradeable check
  - `getTimeUntilLock(market)` — Milliseconds until lock
  - `formatTimeRemaining(ms)` — Human-readable time format

**Status Calculation Logic**:
```typescript
if (market.result) → 'resolved'
else if (now >= market.start_time) → 'locked'
else → 'open'
```

This runs **real-time** — status is never stored statically.

#### 3. MarketCountdown Component
- **File**: `src/components/MarketCountdown.tsx`
- **Features**:
  - Updates every second via `setInterval`
  - Proper cleanup on unmount
  - Color transitions:
    - Normal: gray/white
    - < 6h: orange
    - < 1h: red
    - < 5min: blinking red (CSS animation)
  - Two variants: `compact` and `prominent`
  - Uses DM Mono font for numbers
  - Shows kickoff time
  - Automatically hides when market locks

**CSS Animation** (in `src/styles.css`):
```css
@keyframes blink-slow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
```

#### 4. Market Cards
Updated all market card variants to show lifecycle status:

- **MarketCard.tsx** — Main grid card
- **LiveMarketCard.tsx** — Featured card
- **MarketCardCompact.tsx** — Compact list view
- **TrendingMarketCard.tsx** — Trending section

**Status Badges**:
- `● OPEN` — Green, normal state
- `🔒 LOCKED` — Orange, match in progress
- `✓ RESOLVED` — Gray, result confirmed

**Button Labels**:
- OPEN: "Trade Now"
- LOCKED: "View Market"
- RESOLVED: "View Result"

#### 5. Market Detail Page
- **File**: `src/routes/markets/$marketId/index.tsx`
- **Features**:
  - Prominent countdown at top (OPEN only)
  - Large status banners for LOCKED/RESOLVED
  - Trading box overlay when not tradeable
  - Result display for resolved markets
  - Status badges in header

**LOCKED Banner**:
```
🔒 Market Locked
Trading closed at kickoff

This market will resolve automatically 
when the final result is confirmed.

Result provided by Azuro Protocol oracle.
```

**RESOLVED Banner**:
```
✅ YES Won (or NO Won)
Final result confirmed by Azuro oracle

Resolved [timestamp]
Winning positions have been paid out automatically
```

#### 6. Trading Box Protection
- **File**: `src/components/markets/TradingBox.tsx`
- **Frontend validation** before trade submission:

```typescript
if (!isMarketTradeable(market)) {
  if (status === 'locked') {
    toast.error('Trading is closed for this market. Match has started.');
    return;
  } else if (status === 'resolved') {
    toast.error('This market has been resolved. Trading is no longer available.');
    return;
  }
}

if (new Date() >= market.start_time) {
  toast.error('Trading closed at kickoff.');
  return;
}
```

**Note**: This is UI protection only. Real validation happens server-side (see Cursor C1 section).

#### 7. Portfolio Integration
- **File**: `src/components/trading/PositionCard.tsx`
- **Status-aware position display**:
  - OPEN: Show "Sell" button, current value
  - LOCKED: "In Progress" badge, last pre-lock price
  - RESOLVED: "Won"/"Lost" badge, final payout

#### 8. Mock Data
- **File**: `src/data/mockMarkets.ts`
- **Test markets** covering all states:
  - `mock-open-1` — Kickoff in 2 hours
  - `mock-locked-1` — Kickoff 30 min ago
  - `mock-resolved-yes` — YES won, resolved 30 min ago
  - `mock-resolved-no` — NO won, resolved 1 hour ago
  - `mock-closing-soon` — Kickoff in 4 minutes (urgency test)

### 🔄 Pending (Backend — Cursor C1)

#### 1. Azuro GraphQL Integration
**File**: `src/services/azuro.ts`

Replace mock `start_time` with real data:
```typescript
// Current (mock):
start_time: new Date(Date.now() + 2 * 60 * 60 * 1000)

// TODO CURSOR C1:
const startsAt = new Date(parseInt(game.startsAt) * 1000); // Unix → JS Date
start_time: startsAt
```

Replace mock `result` with oracle data:
```typescript
// TODO CURSOR C1:
const mainCondition = game.conditions[0];
if (mainCondition.wonOutcomeIds && mainCondition.wonOutcomeIds.length > 0) {
  const wonId = mainCondition.wonOutcomeIds[0];
  result = wonId === mainCondition.outcomes[0]?.outcomeId ? 'yes' : 'no';
  resolved_at = new Date(); // Or fetch from event timestamp
}
```

#### 2. Server-Side Trading Lock
**File**: `src/server/trpc/procedures/placePrediction.ts`

Add validation before accepting trades:
```typescript
// TODO CURSOR C1:
const azuroGame = await fetchAzuroGameDetail(market.azuroGameId);

// Check if trading window closed
if (Date.now() >= azuroGame.startsAt * 1000) {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Trading is closed - match has started",
  });
}

// Check if market already resolved
if (azuroGame.status === 'Resolved') {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "This market has been resolved",
  });
}

// Check if market cancelled
if (azuroGame.status === 'Canceled') {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "This market has been cancelled",
  });
}
```

#### 3. Automatic Resolution Polling
Create scheduled job to check for newly resolved markets:

```typescript
// TODO CURSOR C1: Add to scheduled tasks
setInterval(async () => {
  // Get all active market IDs
  const activeMarkets = await db.market.findMany({
    where: { status: 'active' },
    select: { id: true, azuroGameId: true }
  });

  // Check Azuro for resolutions
  const resolved = await checkResolvedMarkets(
    activeMarkets.map(m => m.id)
  );

  // Process each resolved market
  for (const { marketId, result, conditionId } of resolved) {
    await resolveMarket(marketId, result);
    await payoutWinners(marketId, result);
  }
}, 5 * 60 * 1000); // Every 5 minutes
```

#### 4. Payout Automation
When market resolves, automatically pay out winners:

```typescript
// TODO CURSOR C1:
async function payoutWinners(marketId: string, result: 'yes' | 'no') {
  // Find all winning positions
  const winningPositions = await db.order.findMany({
    where: {
      marketId,
      outcome: result.toUpperCase(),
      status: 'open'
    }
  });

  // Pay out each position
  for (const position of winningPositions) {
    const payout = position.shares * 1.0; // Each winning share = $1
    
    await db.user.update({
      where: { wallet: position.wallet },
      data: { virtualBalance: { increment: payout } }
    });

    await db.order.update({
      where: { id: position.id },
      data: { status: 'resolved' }
    });

    // Create notification
    await db.notification.create({
      data: {
        walletAddress: position.wallet,
        type: 'POSITION_WON',
        title: 'You won!',
        message: `Your ${result.toUpperCase()} position paid out $${payout.toFixed(2)}`,
        marketId
      }
    });
  }
}
```

## Environment Variables

**No new environment variables required.**

The system uses existing Azuro GraphQL endpoint configuration.

## Testing the UI

1. **OPEN Market**: Visit `/markets/mock-open-1`
   - Should see prominent countdown
   - Trading box fully active
   - Green "● OPEN" badge

2. **LOCKED Market**: Visit `/markets/mock-locked-1`
   - Should see "🔒 Market Locked" banner
   - Trading box overlayed/disabled
   - Orange "🔒 LOCKED" badge

3. **RESOLVED Market**: Visit `/markets/mock-resolved-yes`
   - Should see "✅ YES Won" banner
   - Trading box hidden
   - Gray "✓ RESOLVED" badge
   - Payout message displayed

4. **Closing Soon**: Visit `/markets/mock-closing-soon`
   - Countdown should be in red
   - Numbers blinking slowly
   - "⚠️ Last chance to trade!" warning

## Key Files Modified

### New Files
- `src/utils/marketLifecycle.ts` — Status calculation utilities
- `src/components/MarketCountdown.tsx` — Countdown component
- `docs/MARKET_LIFECYCLE.md` — This documentation

### Modified Files
- `src/data/mockMarkets.ts` — Added lifecycle fields
- `src/styles.css` — Added blink animation
- `src/components/markets/MarketCard.tsx` — Status badges
- `src/components/markets/LiveMarketCard.tsx` — Status badges
- `src/components/markets/TradingBox.tsx` — Frontend validation
- `src/routes/markets/$marketId/index.tsx` — Lifecycle UI
- `src/services/azuro.ts` — TODO comments
- `src/server/trpc/procedures/placePrediction.ts` — TODO comments

## Design Patterns Used

1. **Real-time Calculation**: Status is never stored, always calculated from `start_time` and `result`
2. **Interval Cleanup**: All `setInterval` calls have proper cleanup via `useEffect` return
3. **Defensive UI**: Frontend validates before submission, but trusts backend for final decision
4. **Progressive Enhancement**: Works with mock data now, seamlessly upgrades with real Azuro data
5. **Component Composition**: Countdown component reusable in compact/prominent modes

## Next Steps for Cursor C1

1. ✅ Read this document thoroughly
2. ✅ Search codebase for "TODO CURSOR C1" comments
3. ✅ Implement Azuro GraphQL integration for `start_time` and `result`
4. ✅ Add server-side trading lock validation
5. ✅ Create automatic resolution polling job
6. ✅ Implement payout automation
7. ✅ Test with real Azuro markets on testnet
8. ✅ Remove mock lifecycle markets once real data flows

## Notes

- **No page reloads**: Everything updates in real-time via countdown intervals
- **No new dependencies**: Uses existing React hooks and utilities
- **Follows conventions**: Matches existing component patterns and styling
- **Mobile-first**: All UI works on mobile and desktop
- **Accessible**: Proper ARIA labels and keyboard navigation (where applicable)

---

**Implementation Date**: 2024
**Status**: Frontend Complete, Backend Integration Pending
**Next Agent**: Cursor C1
