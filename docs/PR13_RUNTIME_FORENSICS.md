# PR13 — Critical Trading/Runtime Investigation + Settlement Unblock

**Date:** 2026-05-18  
**Wallet under test:** `0x665cee23ea826a5e447bed2f84ae26a447fa5aea`  
**Production at audit:** frontend PR12+, VPS backend `fc71c76`

---

## Executive summary

| Area | Root cause | Fix in PR13 | Status |
|------|------------|---------------|--------|
| Trading panel won't close | Persisted `selectedPositionId` + click-through reopen + auto-reselect first position | Session-only selection, backdrop, close guard, no auto-reselect | **Fixed** |
| Static positions (8/9 dead) | `updateMarketPrice` always used `yesPrice`; NO/DRAW PnL/prob appeared frozen | Side-aware quotes from `Market` summaries | **Fixed** |
| Settlement blocked | Azuro subgraph `state=Prematch` for FT games | None (external oracle lag) | **Blocked on Azuro** |
| Catalog stale / 30d+ only | Registry sync + Prematch-only Azuro fetch; finished games leave feed | Documented; no fake events | **Partial — ops** |
| VPS cron | Running every 5m, 0 terminal settlements | N/A | **Healthy, idle** |

**Protocol health score: D** — UI/runtime fixes land; payout path still blocked by Azuro oracle indexing.

---

## FASE 1 — Trading panel bug

### Symptoms
- `/trading` desktop detail panel X button ineffective
- Drawer stays open permanently

### Root cause (precise)
1. **`selectedPositionId` persisted in localStorage** (`predictio-trading` zustand slice) — panel reopened on every visit.
2. **Click-through on close** — aside unmounted on `selectPosition(null)`; the same click hit the position card underneath and called `openDetail()` again.
3. **Stale-selection effect auto-selected first open position** when persisted id was invalid — forced panel open after resolved positions dropped off.

### Fix
- `tradingStore`: stop persisting `selectedPositionId`.
- `trading/index.tsx`: explicit `deskPanelOpen` state; backdrop overlay; `closeGuardUntilRef` 400ms debounce; close handler uses `stopPropagation` + `preventDefault`; invalid selection clears panel instead of auto-picking first row.

---

## FASE 2 — Static positions forensics

### Wallet positions (9 open)
All Azuro-backed. Forensic script output (2026-05-18):

| marketId | Event | closesAt (DB) | Azuro state | Settlement |
|----------|-------|---------------|-------------|------------|
| azuro-1006000000000083636688 | IF Gnistan – FF Jaro | 2026-05-16T15:55Z | Prematch | BLOCKED |
| azuro-1006000000000083636689 | AC Oulu – TPS | 2026-05-16T15:55Z | Prematch | BLOCKED |
| azuro-1006000000000083636832 | Wolfsberger – WSG Tirol | 2026-05-16T14:55Z | Prematch | BLOCKED |
| azuro-1006000000000084496684 | Lokomotiva – Hajduk | 2026-05-16T16:10Z | Prematch | BLOCKED |
| azuro-1006000000000084921451 | Al Nassr – Gamba Osaka | 2026-05-16T17:40Z | Prematch | BLOCKED |
| azuro-1006000000000085153538 | Atlético MG – Mirassol | 2026-05-16T21:25Z | Prematch | BLOCKED |
| azuro-1006000000000085153539 | Internacional – Vasco | 2026-05-16T21:25Z | Prematch | BLOCKED |
| azuro-1006000000000077352066 | USA – Paraguay | 2026-06-13T00:55Z | Prematch | future |
| *(9th order same markets)* | | | | |

### Why only 1 position looked "alive"
- **`updateMarketPrice` wrote `last: market.yesPrice` for every market** regardless of held side.
- Positions on **NO** or **DRAW** showed static PnL/probability deltas because mark was wrong side.
- The one **YES** position (or the future USA–Paraguay line with live prematch odds) appeared to move.
- Post-FT games: Azuro still returns Prematch → quotes frozen at last prematch odds (expected until oracle resolves).

### Fix
- `sideAwareQuoteFromMarket()` — YES/NO/DRAW aware mark from `Market` row.
- Used in `buildTraderDeskRow`, `PositionDetail`, and trading page price sync.
- `fetchAzuroGameDetail` now uses `pickMoneylineCondition` (was `conditions[0]`) for consistent 1X2 odds.

---

## FASE 3 — Settlement forensics

### Per-wallet finding
All 8 unique markets: DB `status=open`, `winner=—`, `resolvedAt=—`.  
Every Azuro poll: **`ORACLE_PREMATCH`** — settlement engine correctly skips (no fake payout).

### Why not settled
Not a Predictio cron bug. Azuro data-feed subgraph reports `state=Prematch` for games whose `closesAt` is days in the past. Until Azuro transitions to `Resolved`/`Finished` with `wonOutcomeIds`, `checkResolvedMarkets()` returns 0 terminal items.

---

## FASE 4 — Oracle deep diagnostics

- **Endpoint:** `https://thegraph-1.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-data-feed-polygon`
- **Condition selection:** `pickMoneylineCondition` → `first_three_way_fallback` (53 conditions typical)
- **Game state vs real world:** Matches finished in reality; subgraph still Prematch (indexing lag / stale game archive)
- **Not** wrong `conditions[0]` for settlement poll (already fixed in PR6+); detail fetch had same bug → fixed in PR13

---

## FASE 5 — VPS cron forensics

- **Cron:** `/etc/cron.d/predictio-settlement` — `*/5 * * * *` → `vps-run-settlement-tick.sh`
- **Last ticks:** 2026-05-18T19:00–19:20Z — `polledMarkets: 13`, `openOrders: 23`, **`terminalSettlements: 0`**
- **Blockers logged:** `ORACLE_PREMATCH` (12), `NON_AZURO_MARKET` (1: `cmotw7xw60000pl0hieqht8ix`)
- **Errors:** none; GraphQL OK
- **Heartbeat:** `settlement-cron` updated each tick

---

## FASE 6 — Event ingestion forensics

### Why catalog feels frozen (30+ days)
1. **Azuro ingest queries `state: Prematch` only** (`azuroCuratorGraphql.ts`, `src/services/azuro.ts`).
2. **Protocol registry mode** (`buildRawFeedCatalogPayload`) syncs on throttled `GET /api/markets` — near-term games that kicked off leave Prematch feed but may remain `OPEN` in DB until next sync deactivates.
3. **Public API cap** ~12 curated rows — dominated by remaining prematch fixtures (e.g. USA–Paraguay June).
4. **No new near-term events** because Azuro prematch window for this feed is sparse / already traded-through; not a broken HTTP route.

### Not fixed (by design)
No synthetic events, no backdated fixtures, no force-publish.

---

## FASE 7 — Liquidation proof

| Metric | BEFORE | AFTER PR13 |
|--------|--------|------------|
| Real settlements | 0 | 0 |
| Real payouts | 0 | 0 |
| Balance delta | — | — |

**Blocker:** Azuro oracle has zero terminal games in poll set. Proof remains pending first `Resolved`/`Finished` game in subgraph.

---

## FASE 8 — Protocol health audit

| Subsystem | Grade | Notes |
|-----------|-------|-------|
| Trading UI runtime | **B+** after PR13 | Panel + side-aware marks |
| Quote freshness | **C** | Live for prematch; frozen post-FT until oracle |
| Settlement engine | **A** | Correctly idle; logs structured |
| Oracle trust | **F** | Prematch stuck post-FT |
| Catalog ingestion | **C-** | Prematch-only; stale OPEN rows |
| Payout capability | **F** | Blocked externally |
| **Overall** | **D** | Credible paper trading; settlement path unproven |

---

## FASE 9 — Fixes applied

1. Trading desk panel close (session state, backdrop, guard)
2. Side-aware live marks for NO/DRAW/YES
3. `fetchAzuroGameDetail` moneyline condition pick
4. Remove selection persistence trap

**Not applied:** fake settlement, synthetic quotes, forced oracle override.

---

## FASE 10 — Deploy checklist

- [x] `git commit` + `push origin master` → **`9e06c9b`**
- [x] Vercel production deploy → **`dpl_2g3TZS1Wh93owMxiqt3auoPZXwNy`** (predictio.live)
- [x] VPS `git pull` + `bash scripts/vps-deploy-backend.sh` → runtime **`9e06c9b`**
- [x] Manual `scripts/vps-run-settlement-tick.sh` post-deploy → `terminalSettlements: 0` (oracle Prematch)

---

## Remaining blockers

1. **Azuro subgraph** must flip finished games to `Resolved`/`Finished` with `wonOutcomeIds`.
2. **Non-Azuro open market** `cmotw7xw60000pl0hieqht8ix` — manual resolution or refund path.
3. **Catalog freshness** — consider deactivating past-kickoff `CuratedEvent` rows when Azuro drops them (separate PR).
4. **E2E payout proof** — still unmet (PR9 carry-forward).

---

## Regressions avoided

- No change to settlement math or ledger idempotency
- No fake oracle outcomes
- Express canonical wallet runtime preserved
- Premium trading UX canon preserved
