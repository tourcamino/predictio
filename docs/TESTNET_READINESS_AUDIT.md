# Predictio — Testnet Readiness Audit (PR6 update)

**Score: 68 / 100 — NOT READY for open testnet** (up from 62 after PR5)

Closed beta with real wallets: **acceptable** if users understand oracle delay.

## Dimension scores

| Dimension | Score | Status |
|-----------|-------|--------|
| UI / lifecycle clarity | 85 | Ready |
| Wallet / Express runtime | 80 | Ready |
| Settlement engine (idempotent ledger) | 75 | Ready |
| Oracle condition mapping | 70 | Improved PR6 |
| Oracle external dependency | 35 | **Blocker** |
| Ops (cron, VPS deploy) | 55 | VPS behind master |

## Settlement reliability

- Cron runs every **~5 minutes** on VPS (`predictio-settlement.log`)
- Engine uses `updateMany` on open orders → **idempotent** per order
- Refund path for draw/void; binary home/away mapping
- **PR6:** moneyline condition selection (not blind `conditions[0]`)

## Oracle dependency risk

- **Cannot settle while Azuro `state = Prematch`**
- Real wallet forensics: **8/8 open markets → ORACLE_PREMATCH**
- Not a Predictio DB bug; external publication lag

## Subgraph dependency risk

- Must query `games(where: { gameId_in })` without invalid fields
- Forensic scripts fixed PR6 (removed `status` on `Game`)
- Some archived games may never return → positions stuck unless manual catalog retire

## Payout confidence

| State | Confidence |
|-------|------------|
| Oracle Resolved + correct condition | **High** |
| Oracle Prematch | **None** |
| Wrong condition index (pre-PR6) | **Low** → mitigated PR6 |
| VPS on old SHA | **Medium** until pull |

## Reconciliation guarantees

- Paper balance updates only after `settleOneOrder` claims open row
- Ledger types: `position_settlement_win` / `position_settlement_loss`
- Replay warned via `warnSettlementReplay`

## Canonical runtime

- Positions: Express `getUserPositions` (production)
- Settlement: VPS cron + `checkResolvedMarkets`
- Diagnostics: tRPC `getMarketSettlementDiagnostic`, `getSettlementProtocolHealth`

## Unresolved architectural risks

1. Azuro Prematch after real-world full-time
2. 50+ conditions per game — selection heuristic must stay aligned with catalog odds
3. VPS deploy drift (SHA behind GitHub master)
4. No on-chain settlement — paper protocol only

## Testnet gates

| Gate | Ready? |
|------|--------|
| Invite-only beta | **Yes** (with oracle disclaimer) |
| Public testnet | **No** |
| Protocol grants / rewards | **No** until payout E2E proven post-Resolved |

## PR6 deliverables

- `src/lib/settlement/azuroConditionSelection.ts`
- `getSettlementProtocolHealth` tRPC
- `ProtocolSettlementHealthBar` UI
- Scripts: `oracle-settlement-inspector.mjs`, fixed `forensic-market-settlement.mjs`
- Structured `settlement_tick_*` logs
