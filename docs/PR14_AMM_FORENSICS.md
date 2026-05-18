# PR14 — AMM / Market Movement Forensics

**Date:** 2026-05-18

## Executive summary

Predictio paper trading is **not a on-chain CPMM AMM**. It is a **paper ledger + Azuro oracle quotes + canonical liquidity allocation display**. Price movement comes from **Azuro prematch odds refresh**, not from fill-driven bonding curves.

---

## How the protocol actually works

### Who pays whom

| Actor | Pays | Receives |
|-------|------|----------|
| Trader (paper) | Virtual USDC stake | Shares at quoted probability |
| Protocol pool (simulated) | Counterparty exposure on settlement | Spread / losing side stake |
| LP (pre-testnet) | Deposited virtual USDC | Pro-rata share of simulated pool |
| Oracle (Azuro) | — | Terminal outcome for settlement |

Paper trades debit `User.virtualBalance` and create `Order` rows. Settlement credits winners at $1/share, losers at $0.

### If everyone buys YES

- **Today:** Each `placePrediction` records an order at the **current Azuro-implied probability** (via `loadMarketUiById` / curated odds). There is **no automatic YES price increase** from order flow alone.
- **Exposure:** Open interest rises (`Order.amount` sum). Utilization % rises against canonical pool (`openInterest / totalLiquidity`).
- **Inventory:** Protocol bears payout risk on winning YES shares at settlement — tracked as open interest, not rebalanced mid-market in paper mode.

### LP / treasury / exposure

| Concept | Implementation |
|---------|----------------|
| **Protocol pool** | `getProtocolLiquidityConfigFromEnv()` simulated USDC budget |
| **Per-market allocation** | `computeCanonicalMarketAllocations()` — appeal or volume weights, min 6% / max 40% per slot |
| **Treasury** | User virtual balances + settlement ledger (`Transaction`) |
| **Exposure** | Sum of open `Order.amount` per market |
| **Utilization** | `openInterest / totalLiquidity` (real DB math, PR12 `getProtocolMarketBreadth`) |

### Dynamic pricing today

| Mechanism | Active? | Source |
|-----------|---------|--------|
| Azuro prematch odds | **Yes** | GraphQL data-feed, 12s UI refetch |
| Fill-driven AMM curve | **No** | Not implemented for paper |
| Market maker bot quotes | Partial | VPS `market-maker-bot` (separate from user-facing odds) |
| Inventory rebalance pricing | **No** | Allocation is static until registry sync |
| WebSocket synthetic tape | Display only | `tradingStore` recentTrades — not authoritative |

---

## Liquidity allocation (18% vs 2%)

Algorithm: `canonicalLiquidityAllocation.ts`

```
weight = appealScore (default) OR market.volume if totalVolume >= 50
allocation = clamp(weight / sum(weights) * pool, min 6%, max 40%)
```

**Why first market ~18%:** With 9 slots and appeal-weighted distribution, top `importanceScore` + min 6% floor yields ~15–20% for anchor fixture. Others cluster at **6% floor** (~2% of total if misread as share vs percentage label).

**Verdict:** **Correct by design**, not a bug — concentration reflects editorial appeal weighting + min/max caps, not live volume.

---

## Why only USA–Paraguay (future fixture) appears to move

1. **Only prematch Azuro games receive live odds updates** — finished games stuck `Prematch` in subgraph → frozen quotes (PR13).
2. **Future far-dated fixtures** still in Azuro prematch feed → odds drift from bookmaker line moves.
3. **Post-FT positions** show static probability — oracle not terminal.
4. **NO/DRAW marks** fixed in PR13 — side-aware quotes now correct.

Real motion signals available without faking data:

- `getProtocolMarketBreadth.recentFills` — actual order flow
- Quote delta from `useMarketSummaries` 12s poll
- Utilization changes as open interest shifts

---

## Event catalog freshness

- Ingestion: `buildRawFeedCatalogPayload` / Azuro `state: Prematch` only
- Near-term games leave feed after kickoff; DB `CuratedEvent` may stay OPEN until `marketStatusUpdater` / registry sync deactivates
- **Not a broken route** — sparse prematch window + stale OPEN rows

---

## Settlement / oracle (carry-forward)

All wallet positions: Azuro `state=Prematch` post-FT → **zero terminal settlements**. Cron healthy, oracle external blocker.

---

## Recommendations (future, not PR14 fake fixes)

1. Deactivate curated rows when `lockedAt < now` and not in Azuro feed
2. Optional: mild paper price impact from open interest imbalance (explicit, logged)
3. Surface `quoteAge` + `oracleState` on every market card (partially done PR11)
4. Do **not** simulate volume/candles without real fills
