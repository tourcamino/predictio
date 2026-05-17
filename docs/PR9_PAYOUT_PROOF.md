# PR9 — E2E Payout Proof

**Status:** NOT ACHIEVED (2026-05-17) — blocked by external oracle, not Predictio engine failure.

## Attempt summary

| Step | Result |
|------|--------|
| Wallet sample | `0x665cee23ea826a5e447bed2f84ae26a447fa5aea` |
| Open markets | 8 |
| Oracle poll (Polygon data-feed) | **8/8 `ORACLE_PREMATCH`** |
| Settlement eligible | **0** |
| Terminal cron settlements | **0** (logs) |
| Ledger payout 24h | **0** (forensics) |

## Evidence — oracle (2026-05-17)

Inspector output (production API + Azuro):

- `azuro-1006000000077352066`: Prematch, conditionIndex **1**, conditionCount **53**, index0Mismatch **true**
- All other open wallet markets: Prematch, valid moneyline condition selected

## Evidence — settlement cron (VPS)

- Logs show correct diagnostics after data-feed fix (PR7): `ORACLE_PREMATCH` with `conditionIndex` / `conditionCount`
- **Ops issue:** `vps-run-settlement-tick.sh` **Permission denied** in cron → PR9 sets executable bit
- No `settlement_tick_complete` with `terminalSettlements > 0` in sampled logs

## Engine readiness (internal)

When Azuro publishes `Resolved` + `wonOutcomeIds`:

1. `checkResolvedMarkets` → binary item
2. `runPaperBatchSettlement` → `updateMany` open orders
3. `transaction` ledger `position_settlement_win|loss`
4. `user.virtualBalance` increment
5. UI via `refetchCanonicalPositionReads` + settlement panels

## What is needed for first proof

1. At least one open position on a game with Azuro state **Resolved/Finished**
2. Cron tick executable on VPS (`chmod +x` script)
3. Re-run tick → capture:
   - `settlement_attempt` / `payout_execution_time` logs
   - DB transaction row
   - Wallet balance before/after
   - Position `status=resolved`

## Placeholder proof record

| Field | Value |
|-------|--------|
| marketId | _pending Azuro terminal state_ |
| wallet | _pending_ |
| oracleResponse | _pending_ |
| ledgerEntryId | _pending_ |
| balanceBefore | _pending_ |
| balanceAfter | _pending_ |
| observedAt | _pending_ |

Update this document when first production payout occurs.
