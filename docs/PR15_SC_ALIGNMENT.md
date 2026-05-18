# PR15 — Smart Contract Alignment

**Date:** 2026-05-18

## Paper → on-chain migration map

| Paper (PR15) | Future on-chain |
|--------------|-----------------|
| `Market.outcomes.v1` reserves | Pool YES/NO token balances |
| `poolLiquidityUsd` from canonical LP | LP vault deposit cap per market |
| `previewBuyFill` CPMM math | `swapExactTokensForTokens` / CTF mint |
| Oracle soft re-anchor | External oracle updater (Chainlink / UMA / Azuro) |
| `flowYesUsd` / imbalance | Open interest / skew metrics |
| Settlement $1/$0 | CTF redeem after `reportPayouts` |

## Design constraints preserved

1. **Conservation:** k = yesReserve × noReserve maintained per fill
2. **Price bounds:** 0.01–0.99 clamp — matches tick constraints
3. **Limit orders:** Off-curve makers — maps to CLOB layer on Polymarket-style stacks
4. **Fees:** Unchanged 1% taker — maps to protocol fee hook
5. **No paper-only RNG:** All motion traceable to orders or oracle anchor

## Recommended testnet path

1. Deploy conditional token framework + CPMM pool factory
2. Seed pools from `initReservesFromOracle()` parameters
3. Route MARKET orders through same `previewBuyFill` math in contract or keeper
4. Keep Azuro as resolution oracle — no change to settlement engine

## Incompatibilities avoided

- No client-only price that differs from server execution
- Express and tRPC both call `executePaperAmmMarketBuy`
- Azuro upsert merges oracle without wiping reserves
