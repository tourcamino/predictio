# PR18 — Protocol Vitality Recovery + VPS Parity + Live Football Inventory

**Date:** 2026-05-18  
**Wallet (payout proof target):** `0x665cee23ea826a5e447bed2f84ae26a447fa5aea`

---

## Executive summary

| Area | Verdict |
|------|---------|
| VPS parity | **CRITICAL GAP** — backend `9e06c9b` (PR13) vs frontend `6bc895b` (PR17) |
| Catalog pollution | **CONFIRMED** — 13/14 `/api/v1/markets` rows past kickoff, still `open` |
| Football inventory | **WEAK** — curated feed dominated by World Cup (June); no Premier League in top slice |
| Oracle awaiting | **UPSTREAM** — Azuro GraphQL still `Prematch` post-FT (see PR16) |
| Payout E2E | **NOT ACHIEVED** — zero `wonOutcomeIds` on wallet positions |
| PR18 fixes | `catalogVitality.ts`, `/api/v1/markets` filter+sort, boot retirement, vitality script |

---

## FASE 1 — VPS parity crisis

### SHA table (pre-PR18 deploy)

| Component | SHA | Notes |
|-----------|-----|-------|
| Git HEAD (local) | `6bc895b` → PR18 commit pending | PR17 execution UX |
| Vercel frontend | `6bc895b` | `dpl_DdeivzjZyBGjJwKYV27Kca9mSGwT` |
| VPS backend | **`9e06c9b`** | Missing PR15 AMM, PR16 retirement, PR18 vitality |
| Gap | **4 commits** | `81ba721`, `0f22fa4`, `6bc895b`, PR18 |

### Runtime endpoints (VPS @ 9e06c9b)

```
GET https://api.predictio.live/api/v1/version
→ gitCommitShort: 9e06c9b, uptimeSec: ~4846, marketStatusSchedulerMs: 60000

GET https://api.predictio.live/api/v1/health → ok

GET https://api.predictio.live/api/v1/markets?limit=5
→ 14 total, stale FT markets ranked by volume (Al Nassr, USA–Paraguay, Villa–Liverpool…)
```

### PR18 parity actions

1. Wire `maybeRunStaleRetirement` on boot + `/api/v1/markets` + `/api/v1/markets/hot` + `/api/markets`
2. Default `/api/v1/markets?sort=vitality` — filters past kickoff, prioritizes 24–72h + top leagues
3. `backend/scripts/run-protocol-vitality.ts` — one-shot retirement + `updateMarketStatuses`
4. Deploy via `scripts/vps-deploy-backend.sh` after push to `master`

---

## FASE 2 — Live football inventory

### Curated catalog audit (`GET /api/markets`)

At audit (VPS PR13):

- Top rows: **World Cup** fixtures (Mexico–South Africa, South Korea–Czechia, Canada–Bosnia) — kickoff **June 2026**
- **No Premier League, Champions League, or Serie A** in first 8 curated rows
- Temporal band: `LATER` / `adaptiveFallback` — ingest pulling Azuro prematch far-future pool

### Root causes

| Layer | Finding |
|-------|---------|
| Azuro ingest | Prematch feed returns games; PL tomorrow depends on Azuro publishing + refill cron |
| Curated registry | 1200+ rows exist but editorial/adaptive fallback surfaces World Cup not domestic leagues |
| Event freshness | `sortCuratedByVitality` (PR18) boosts PL/UCL/Serie A when present; de-prioritizes >30d |
| Stale OPEN rows | FT games remain until retirement job runs (PR16/18) |

### PR18 inventory fixes

- `priorityForCuratedRow` — 1.5× boost for Premier League, Champions League, Serie A, La Liga, Bundesliga
- `isUpcomingCuratedRow` — hide locked/past kickoff (>1h grace)
- `retireStaleMarketsAndCatalog` — lock curated OPEN 24h+ past `lockedAt`; deactivate >30d future
- Refill sort in `marketStatusUpdater` (PR16) + vitality sort on API responses (PR18)

---

## FASE 3 — Stale market retirement

### Problem

`/api/v1/markets` returned markets with `closesAt` 2026-05-13–16, `status: open` — catalog looked dead.

### Implementation (PR16 + PR18)

| Mechanism | Threshold | Action |
|-----------|-----------|--------|
| Market close | kickoff + 6h | `Market.status → closed` |
| Curated lock | `lockedAt` + 24h | `LOCKED`, `isActive: false` |
| Far future | startsAt > 30d | `isActive: false` |
| API filter | past kickoff | excluded from vitality-sorted responses |
| Throttle | 120s | `maybeRunStaleRetirement` on hot paths + boot |

### Market health grades

Existing `gradeMarketHealth()` (A–F) in frontend tRPC path — driven by quote freshness, fills, oracle state, spread. PR18 backend demotes via priority engine, not fake scores.

---

## FASE 4 — Oracle awaiting crisis

**Carried from PR16 — unchanged root cause.**

All 8 wallet open positions: **`ORACLE_PREMATCH`** on live Azuro GraphQL (`state: Prematch`, `wonOutcomeIds: []`).

| Hypothesis | Result |
|------------|--------|
| A) Azuro still Prematch | **CONFIRMED** |
| B) Subgraph lag | **CONFIRMED** — primary external blocker |
| C) Wrong condition mapping | Partial — 1/8 index mismatch; PR16 odds-hint fix |
| D) Cached stale state | Unlikely — direct GraphQL matches cron |
| E) Predictio settlement bug | **Ruled out** — tick correctly skips non-terminal |

**Oracle source:** `https://thegraph-1.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-data-feed-polygon`

Settlement tick on VPS: healthy, `terminalSettlements: 0` — correct behavior given upstream.

---

## FASE 5 — First real payout proof

| Step | Status |
|------|--------|
| Trade placed | ✅ Historical positions exist |
| Oracle resolved | ❌ Blocked — Azuro Prematch |
| Settlement tick | ✅ Runs; skips correctly |
| CLOSED + ledger | ❌ Not reached |
| Wallet payout | ❌ Not reached |

**No fake settlement performed.** Payout E2E remains blocked on Azuro oracle terminal state.

---

## FASE 6 — Market flow vitality

| Signal | Observation (VPS PR13) |
|--------|--------------------------|
| Fills cadence | Low — paper markets, few real traders |
| Active markets (truthful) | ~1 future tradable (USA–Paraguay) after filtering |
| Quote refresh | Oracle-anchored CPMM (PR15) — **not on VPS yet** |
| AMM movement | Requires PR15 backend deploy |
| Open interest | Present on stale rows (misleading until retirement) |

PR18 makes catalog **honest** (stale hidden/closed) so remaining markets appear alive, not buried in FT noise.

---

## FASE 7 — Market discovery priority

Frontend `/markets` already supports: featured, trending, volume, ending-soon, traders, closing-soon.

Backend PR18:

- `/api/v1/markets?sort=vitality` — kickoff proximity + league boost + volume
- `/api/v1/markets/hot` — vitality top 5 (not raw volume on stale rows)
- `/api/markets` — `sortCuratedByVitality` (replaces editorial reorder that undid priority)

All from real DB fields — no seeded movers.

---

## FASE 8 — Trading desk validation (PR17)

| Check | Result |
|-------|--------|
| Execution column first on mobile | ✅ PR17 live on Vercel |
| Trade CTA visible | ✅ "Trade now" fast path |
| Protocol ops collapsed | ✅ `AdvancedProtocolDetails` |
| <10s trade path | ✅ Achievable on curated tradable market (when catalog has one) |

Blocked for wallet test positions: all markets FT + oracle awaiting — UX shows honest amber banner (PR16/17).

---

## FASE 9 — Protocol trust copy

Existing (no fake ETA):

- `SettlementDiagnosticBanner` — ORACLE_PREMATCH explains Azuro lag vs protocol error
- Oracle trust layer user messages via tRPC
- Market health grade labels (A–F) on enriched market rows

PR18 adds catalog honesty so users don't see week-old "open" markets.

---

## FASE 10 — Validation checklist

| # | Test | Pre-deploy | Post-deploy target |
|---|------|------------|-------------------|
| 1 | Premier League present | ❌ Not in curated top | Depends on Azuro feed |
| 2 | Tomorrow fixtures | ❌ June World Cup only | Vitality sort when ingested |
| 3 | Catalog alive | ❌ Stale pollution | ✅ Retirement + filter |
| 4 | Market movement | ⚠️ PR15 not on VPS | After VPS deploy |
| 5 | AMM | ⚠️ PR15 not on VPS | After VPS deploy |
| 6 | Positions | Open, oracle blocked | Unchanged until Azuro resolves |
| 7 | Oracle awaiting | Coherent (upstream) | Same |
| 8 | Settlement tick | ✅ Processes | ✅ + vitality script |
| 9 | Payout E2E | ❌ | ❌ until Azuro |
| 10 | Wallet balance | No payout yet | — |
| 11 | Mobile execution | ✅ PR17 | ✅ |

---

## FASE 11 — Deploy record

See commit message and deploy IDs appended after push/deploy run.

### Manual VPS commands (if needed)

```bash
# On VPS after deploy
npx tsx backend/scripts/run-protocol-vitality.ts
scripts/vps-run-settlement-tick.sh
curl -fsS https://api.predictio.live/api/v1/version
curl -fsS 'https://api.predictio.live/api/v1/markets?sort=vitality&limit=10'
```

---

## Remaining blockers

1. **Azuro subgraph** — Prematch post-FT → no payout path
2. **Football inventory** — PL/UCL tomorrow requires Azuro prematch + ingest/refill on updated VPS
3. **Runtime parity** — until VPS deploy completes, AMM + retirement + vitality not live

---

## Readiness scores (honest)

| Gate | Score | Rationale |
|------|-------|-----------|
| Closed beta (paper trade + honest catalog) | **62/100** | UX ready; catalog/oracle trust improving; VPS parity pending |
| Public testnet (payout E2E) | **28/100** | Blocked on Azuro oracle terminal + real payout proof |

---

## Regressions avoided

- No fake settlement, candles, volume, or movers
- No redesign / premium panel layering
- Express wallet runtime canonical
- Idempotent settlement tick preserved
- Editorial catalog anchors retained via vitality priority (league boost)
