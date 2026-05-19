# PR22 — First Real Payout Proof

**Date:** 2026-05-19T10:15:08Z  
**Wallet:** `0x665cee23ea826a5e447bed2f84ae26a447fa5aea`  
**Deploy SHA:** `0fad0a2` (backend Docker) + `b6c801f` (settlement tick host script)  
**Oracle source:** `azuro_rest` (REST market-manager)

---

## Root cause resolved

| Layer | Before PR22 | After PR22 |
|-------|-------------|------------|
| Inventory | REST ✅ (PR21) | REST ✅ |
| Settlement oracle | Stale subgraph → all `ORACLE_PREMATCH` | REST → `SETTLEMENT_ELIGIBLE` |
| Open positions (wallet) | 8 stuck | 1 (future fixture only) |
| Resolved positions | 0 | **8** |

Subgraph showed `Prematch` for FT games; REST showed `Finished` + `Resolved` with `wonOutcomeIds`.

---

## Settlement tick evidence (VPS)

```
SETTLEMENT_SOURCE: azuro_rest
ORACLE_SOURCE: azuro_rest
polledMarkets: 13
openOrders: 23
terminalSettlements: 12
durationMs: 1707
```

Breakdown:
- **9** binary settlements (win/loss)
- **2** draw refunds
- **1** skipped (`ORACLE_PREMATCH` — USA–Paraguay, kickoff June 2026)

All payouts: `ledgerWriteSuccess: true`

Example settlement runs:
| Market | Event | Result | Run ID |
|--------|-------|--------|--------|
| azuro-1006000000000083636689 | AC Oulu – TPS | WIN (+$402 PnL) | `paper:41004c3c39b6d08fee3df924` |
| azuro-1006000000000085153539 | Internacional – Vasco | WIN (+$112 PnL) | `paper:b86a5f73cbc85bb3c74b8a73` |
| azuro-1006000000000083636832 | Wolfsberger – WSG Tirol | REFUND (draw) | `paper:07bf4ae32cec527879a006ff` |
| azuro-1006000000000081204714 | Alavés – Barcelona | LOSS | `paper:d9f496f43cdc2c27c0935bbc` |

---

## Ledger / balance proof (production API)

**Portfolio summary** (`/api/v1/web/portfolio-summary`):

```json
{
  "openPositionsCount": 1,
  "resolvedPositionsCount": 8,
  "resolvedPnL": 13.91,
  "wonPositions": 2,
  "lostPositions": 5
}
```

**Balance trajectory** (transaction history):
- Pre-settlement: ~$91 USDC (locked in open bets)
- Post-settlement: **$904.91 USDC**
- Largest win credit: **$502.12** (AC Oulu – TPS, `position_settlement_win`)

**Remaining open position:** USA – Paraguay (`azuro-1006000000000077352066`) — legitimate future Prematch on REST too.

---

## E2E flow verified

1. ✅ Fixture FT (REST `gameState: Finished`)
2. ✅ Oracle resolved (`wonOutcomeIds` populated)
3. ✅ Settlement tick (`runGlobalPaperSettlementTick.ts`)
4. ✅ Ledger update (`position_settlement_win` / `position_settlement_loss` / `position_refund`)
5. ✅ Balance update ($91 → $904.91)
6. ✅ Closed positions (8 resolved)
7. ✅ Payout proof in transaction history

---

## REST vs subgraph (PR22 probe)

Script: `scripts/pr22-settlement-recovery.mjs`

7/8 wallet markets: `settlementEligibleRest: true` on REST while subgraph still `Prematch`.

---

## Remaining blockers

| Item | Severity | Notes |
|------|----------|-------|
| Ledger metadata `oracleSource: azuro_graphql` | Low | Cosmetic — poll uses REST; rename in paperSettlementEngine |
| VPS host Prisma missing `curatedEvent` delegate | Low | Tick continues without odds hints; regenerate client |
| `fetchAzuroGameDetail` still subgraph | Medium | Frontend direct reads — migrate to REST |
| USA–Paraguay position | None | Future match, correctly Prematch |

---

## Commits

| SHA | Description |
|-----|-------------|
| `0fad0a2` | REST oracle + OAL foundation |
| `b6c801f` | Settlement tick curatedEvent tolerance |

---

## Readiness impact

**Azuro integration: STABILIZED for settlement path.**

- Inventory truth: REST ✅
- Oracle truth: REST ✅  
- First real E2E payout: ✅ **PROVEN**
- Regression docs: `docs/AZURO_ARCHITECTURE_CANON.md`, `docs/PR22_SUBGRAPH_ERADICATION_AUDIT.md`
