# PR16 — Oracle Awaiting Crisis Forensics

**Date:** 2026-05-18  
**Wallet:** `0x665cee23ea826a5e447bed2f84ae26a447fa5aea`  
**VPS SHA at audit:** `9e06c9b` (PR13 — **PR15 AMM not deployed**)

---

## Executive summary

| Finding | Verdict |
|---------|---------|
| Root cause of "Oracle awaiting" | **A — Azuro subgraph still `Prematch` post-FT** (upstream) |
| Predictio settlement tick | Healthy — returns `terminalSettlements: 0` correctly |
| Condition mapping | Partial — cron lacked odds hints ( **fixed PR16** ); 1/8 wallet markets had index0 mismatch |
| Catalog drift | **D — Market DB rows stuck `open` days after kickoff** ( **fixed PR16 retirement** ) |
| Premier League tomorrow | Ingest depends on Azuro prematch feed + refill job on VPS |
| Payout E2E | **Blocked** — zero markets with `wonOutcomeIds` |

---

## FASE 1 — Wallet open positions (8 markets)

All positions: **`ORACLE_PREMATCH`** — Azuro GraphQL live returns `state: Prematch`, `wonOutcomeIds: []`.

| marketId | Event | closesAt (DB) | Hours since FT* | oracleState | conditionIndex | index0Mismatch |
|----------|-------|---------------|-----------------|-------------|----------------|----------------|
| azuro-1006000000000083636688 | IF Gnistan – FF Jaro | 2026-05-16T15:55Z | ~52h | Prematch | 0 | false |
| azuro-1006000000000077352066 | USA – Paraguay | 2026-06-13T00:55Z | future | Prematch | 1 | **true** |
| azuro-1006000000000085153539 | Internacional – Vasco | 2026-05-16T21:25Z | ~47h | Prematch | 0 | false |
| azuro-1006000000000083636689 | AC Oulu – TPS | 2026-05-16T15:55Z | ~52h | Prematch | 0 | false |
| azuro-1006000000000084921451 | Al Nassr – Gamba Osaka | 2026-05-16T17:40Z | ~50h | Prematch | 0 | false |
| azuro-1006000000000084496684 | Lokomotiva – Hajduk | 2026-05-16T16:10Z | ~52h | Prematch | 0 | false |
| azuro-1006000000000085153538 | Atlético MG – Mirassol | 2026-05-16T21:25Z | ~47h | Prematch | 0 | false |
| azuro-1006000000000083636832 | Wolfsberger – WSG Tirol | 2026-05-16T14:55Z | ~53h | Prematch | 0 | false |

\*Approximate at audit time 2026-05-18T20:22Z.

**Oracle source:** `https://thegraph-1.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-data-feed-polygon`

**Settlement eligibility:** `false` for all 8 — blocker `ORACLE_PREMATCH_UPSTREAM`.

---

## FASE 2 — Real Azuro vs Predictio mapping

| Hypothesis | Result |
|------------|--------|
| A) Azuro still Prematch | **CONFIRMED** — live GraphQL for all gameIds |
| B) Wrong Predictio mapping | Partial — DB `Market.status=open` for FT games is wrong catalog hygiene, not oracle read |
| C) Condition selection error | **1 market** (USA–Paraguay) picks index 1 vs conditions[0]; odds-hint fix aligns cron with UI |
| D) Catalog drift | **CONFIRMED** — 13/14 API markets have `closesAt` in past, still `status: open` |
| E) Subgraph lag | **CONFIRMED** — primary external blocker |
| F) Stale cached oracle | Unlikely — direct GraphQL query same as cron |

---

## FASE 3 — Settlement engine

| Check | Result |
|-------|--------|
| `runGlobalPaperSettlementTick` | Polls all open-order marketIds |
| `checkResolvedMarkets` | Skips non-terminal states correctly |
| Cron heartbeat | `settlement-cron` on VPS (PR13 verified) |
| Idempotency | Preserved |
| **PR16 fix** | Settlement tick now passes **curated odds hints** to `pickMoneylineCondition` |

**Why markets stay OPEN days after FT:**
1. Azuro never returns `Resolved/Finished` → settlement engine correctly no-ops
2. `Market` table not lifecycle-managed — only `CuratedEvent` had OPEN→LOCKED job
3. **PR16:** `retireStaleMarketsAndCatalog()` closes `Market` rows 6h+ past kickoff

---

## FASE 4 — Football inventory

Production `/api/v1/markets` at audit: **14 markets**, most with kickoff 2026-05-13–16 (stale). Only USA–Paraguay is future (~26 days).

**Root causes:**
- Ingest fetches Azuro `Prematch` — finished games leave feed
- Refill sorted by `importanceScore` only — far-future anchor dominated
- No retirement of stale `Market.open` rows

**PR16 fixes:**
- Refill sorted by `computeMarketPriorityScore()` (kickoff 24–72h boost, top leagues)
- Deactivate curated OPEN rows >30 days out
- Lock curated OPEN rows >24h past `lockedAt`
- Close Market DB rows >6h past `closesAt`

---

## FASE 5–6 — Priority engine + retirement

New files:
- `src/lib/markets/marketPriorityEngine.ts`
- `backend/src/services/staleMarketRetirement.ts`
- Wired in `marketStatusUpdater.ts` (60s cycle)

---

## FASE 7 — Payout proof

**Status: NOT ACHIEVED** — zero markets with terminal oracle + `wonOutcomeIds`.

Nearest path: wait for any Azuro game to reach `Resolved` with winners, or test on fresh prematch fixture that completes while subgraph healthy.

**Do NOT force settlement** — would break protocol trust.

---

## FASE 8 — Why only USA–Paraguay moves

- Only **future prematch** fixture in wallet set still receives Azuro odds updates
- Post-FT games: Azuro stuck Prematch → frozen quotes + AMM state only moves on new trades
- **PR15 AMM not on VPS** — Express path still flat pricing until deploy

---

## FASE 9 — Trust layer

Updated `deriveOracleActionContext.ts`:
- Clear upstream Azuro Prematch messaging
- Stale market retirement explanation
- No fake ETA — only observed lag language

---

## FASE 10 — VPS parity

| Component | Vercel (frontend) | VPS (backend) |
|-----------|-------------------|---------------|
| Git SHA | `c26ef57`+ (PR15) | **`9e06c9b` (PR13)** |
| Paper AMM | tRPC path | **Express NOT updated** |
| Settlement hints | PR16 in repo | **Needs deploy** |
| Stale retirement | N/A | **Needs deploy** |

**Action required:** `bash scripts/deploy-vps.sh` from SSH-enabled machine.

---

## Remaining blockers

1. Azuro subgraph Prematch post-FT (external)
2. VPS deploy pending (SSH blocked from CI machine)
3. First E2E payout unproven
4. Premier League fixtures require successful ingest after VPS deploy + Azuro feed coverage

## Public testnet readiness: **D**

Motion/AMM on Vercel tRPC only; settlement unproven; catalog hygiene improving post-VPS deploy.
