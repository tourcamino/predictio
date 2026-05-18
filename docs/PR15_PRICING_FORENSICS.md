# PR15 — Pricing Forensics

**Date:** 2026-05-18

## Executive summary

Before PR15, Predictio paper trading used **flat oracle mids** — Azuro prematch odds with no fill-driven repricing. PR15 introduces an **oracle-anchored constant-product AMM** where every market order moves virtual reserves and persisted quotes.

---

## 1. Quote sources (pre-PR15)

| Layer | Source | Refresh |
|-------|--------|---------|
| Primary | Azuro GraphQL decimal odds → implied prob | ~12–45s UI / persistence cooldown |
| Curated fallback | `CuratedEvent.homeOdds/drawOdds/awayOdds` | On catalog sync |
| DB snapshot | `Market.outcomes[]` `{ price }` | Overwritten on Azuro upsert |
| Execution | Same mid as display | **No impact** |

Key files: `azuro.ts`, `loadMarketUi.ts`, `placePrediction.ts`, `placePaperPredictionWeb.ts`

---

## 2. What updated `yesPrice` / `noPrice`

| Trigger | Pre-PR15 | Post-PR15 |
|---------|----------|-----------|
| Azuro odds refresh | Yes (overwrite) | Oracle anchor only — **soft re-anchor 3%** if no recent trade |
| User MARKET order | No | **Yes — CPMM reserve shift** |
| User LIMIT order | Limit price only | Unchanged (maker, no curve) |
| Copy trade | Same as parent fill | **Each copy runs AMM** |
| UI heuristic | `calcPriceImpact` display only | **Real `previewBuyFill`** |

---

## 3. Inventory / utilization (pre-PR15)

- **Open interest:** `sum(Order.amount) WHERE status=open` — display only
- **Utilization:** `openInterest / canonicalPool` — breadth API only
- **No inventory pressure on prices**

Post-PR15: flow counters (`flowYesUsd`, `flowNoUsd`) + reserve math drive mids; utilization feeds spread + health grade.

---

## 4. Spread / slippage / impact

| Mechanism | Pre-PR15 | Post-PR15 |
|-----------|----------|-----------|
| Spread | UI ±0.01 heuristic | **Imbalance + utilization + kickoff** |
| Slippage | `settingsStore` unused | Limit orders unchanged |
| Market impact | `amount/(pool+amount)` UI fake | **CPMM `previewBuyFill`** server + client |

---

## 5. PR15 architecture

**Model:** Hybrid oracle + virtual CPMM (Polymarket-compatible mental model)

```
oracle mid → seed reserves (yesR = L·p_no, noR = L·p_yes, k = yesR·noR)
MARKET buy YES → noR += amount, yesR = k/noR, shares = ΔyesR
persist Market.outcomes v1 JSON with reserves + flow
soft re-anchor toward oracle when idle (45s+, no trade 30s+)
```

Implementation: `src/lib/amm/paperAmmEngine.ts`, `src/server/services/paperAmmExecution.ts`

---

## 6. Dynamic liquidity allocation

Weights now include **open interest**, **24h fill count**, **trader count** in addition to appeal/volume/kickoff proximity.

Files: `canonicalLiquidityAllocation.ts`, `canonicalLiquidityState.ts` (src + backend)

---

## 7. Market health grades

`gradeMarketHealth()` → A/B/C/D/F from quote freshness, utilization, spread, oracle state, fill cadence.

File: `src/lib/market/marketHealthGrade.ts`

---

## 8. Smart contract alignment

See `docs/PR15_SC_ALIGNMENT.md` — virtual reserves map to future pool shares; oracle anchor maps to external price feed; settlement unchanged ($1/$0).

---

## 9. Oracle + motion interaction

| Phase | Motion |
|-------|--------|
| Prematch | Oracle soft pull + trade-driven CPMM |
| Post-kickoff | Trading closed — prices frozen at last persist |
| Oracle Prematch stuck (FT) | No terminal settlement — prices frozen (external) |
| Near kickoff | Wider spread via kickoff proximity in allocation + health |

---

## 10. What we did NOT add

- Fake candles / RNG drift
- Synthetic volume
- Force settlement
- Fill-independent random walk
