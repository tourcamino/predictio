# PR6 — Oracle / settlement forensics

**Wallet investigated:** `0x665cee23ea826a5e447bed2f84ae26a447fa5aea`  
**Date:** 2026-05-17

## Executive summary

| Finding | Severity |
|---------|----------|
| Primary blocker is **Azuro oracle still `Prematch`** after kickoff | **Critical** (external) |
| Forensic scripts falsely reported `GAME_NOT_IN_SUBGRAPH` (invalid GraphQL `status` field) | **High** (fixed PR6) |
| Settlement used **`conditions[0]`** but moneyline is often **`conditions[1+]`** (53 conditions/game) | **High** (fixed PR6) |
| VPS cron **active** (~5 min) but running **SHA `955e38f`** (pre-PR6) | **Ops** |
| VPS tick logs show `GAME_NOT_IN_SUBGRAPH` for batch — investigate `AZURO_DATA_FEED_URL` on VPS after PR6 deploy | **Medium** |

## E2E trace (canonical)

```
marketId (azuro-{gameId})
  → gameId strip
  → Azuro GraphQL games(where: { gameId_in })
  → pickMoneylineCondition (3-way + odds hint)
  → classifyAzuroGameForSettlement
  → checkResolvedMarkets (cron / client poll)
  → runPaperBatchSettlement / refund
  → Order.status = resolved + Transaction ledger
```

## Wallet `0x665cee…` — per-market (open positions, May 2026)

| marketId | Oracle state | Conditions | Selected idx | reason | Blocker |
|----------|--------------|------------|--------------|--------|---------|
| azuro-1006000000000077352066 | Prematch | 53 | **1** (not 0) | first_plausible_3way | ORACLE_PREMATCH |
| azuro-1006000000000083636688 | Prematch | 53 | 0 | first_plausible_3way | ORACLE_PREMATCH |
| (6 other open markets) | Prematch / similar | 53 | varies | — | ORACLE_PREMATCH |

**Payout status:** No payout until Azuro publishes `Resolved` or `Finished` + `wonOutcomeIds` on the **selected** moneyline condition.

## conditions[0] audit

- Typical football game: **53 conditions** (props, halves, etc.)
- Full-time 1X2 often at **index 1** (e.g. odds 2.02 / 3.46 / 3.61)
- `conditions[0]` frequently **≠** trading moneyline → wrong settlement if oracle resolves a different condition first
- **PR6 fix:** `pickMoneylineCondition()` + catalog odds hint from `CuratedEvent`

## Subgraph gaps

- Use `gameId_in` query (not `gameId` + invalid fields)
- Some legacy market IDs may be **archived** → true `GAME_NOT_IN_SUBGRAPH`
- Do not confuse with GraphQL schema errors (previously returned empty `games[]`)

## VPS (72.62.114.251)

- **Cron:** `*/5 * * * *` → `/var/log/predictio-settlement.log`
- **Runtime SHA:** `955e38f` (needs `git pull` for PR6)
- **Last ticks:** 23 open orders, 13 markets, **0 terminal items**
- Logs dominated by `GAME_NOT_IN_SUBGRAPH` — re-verify after PR6 + env `AZURO_DATA_FEED_URL`

## Tools

```bash
node scripts/forensic-market-settlement.mjs --wallet 0x665cee23ea826a5e447bed2f84ae26a447fa5aea
node scripts/oracle-settlement-inspector.mjs --wallet 0x665cee23ea826a5e447bed2f84ae26a447fa5aea
node scripts/probe-azuro-game.mjs <gameId>
```

## Next action toward testnet

1. **Deploy PR6** to Vercel + **VPS `git pull`** + settlement tick
2. Wait for Azuro to move finished matches to **Resolved/Finished**
3. Confirm tick logs `SETTLEMENT_ELIGIBLE` and paper payouts on wallet
4. Closed beta only until oracle Prematch lag is acceptable or surfaced in UI
