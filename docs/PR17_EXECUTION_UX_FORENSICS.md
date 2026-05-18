# PR17 — Execution UX Forensics

**Date:** 2026-05-18

## Problem statement

Predictio optimized for **protocol diagnostics** at the expense of **execution simplicity**. Users could not trade in under 10 seconds on mobile.

---

## FASE 1 findings — `/markets/$id`

### What slowed the trade

| Issue | Impact |
|-------|--------|
| Protocol panels **above** trading on mobile DOM order | 4–6 scrolls before TradingBox |
| `MarketOracleStatusPanel`, `SettlementTimeline`, `LiquidityProtocolExplainer` visible by default | Ops-console feel |
| Duplicate trading surfaces (mobile middle + desktop sidebar) | Confusion |
| Breadcrumb + back + share before header | Friction |
| `ProtocolActivityTimeline` full-width below fold | Noise |

### What distracted from profit

- Oracle trust layers before price
- Fee breakdown before confirm
- Limit order toggle on mobile
- "Pre-testnet · paper USDC" micro-copy above CTA

### Mobile breaks

- Trading box buried after protocol stack
- `pb-[500px]` hack for fixed dock without clear hierarchy
- Font sizes inconsistent (xs labels on primary inputs)

---

## PR17 fixes applied

### Execution-first layout (`/markets/$id`)

1. **Compact event header** — teams, %, share price (`ExecutionMarketHeader`)
2. **Quick profit strip** — "$100 stake → +$X if YES/NO wins"
3. **Movement hint** — real AMM imbalance copy (no fake)
4. **DecisionBlock + TradingBox** — first column on mobile
5. **Research below fold** — chart, tape, order book collapsed
6. **Advanced protocol details** — single collapsed section (default closed)

### TradingBox (`executionFirst` prop)

- Title: "Trade now"
- Limit order hidden on mobile
- Fee breakdown hidden in fast path (still in advanced)
- Sticky bottom dock preserved (existing pattern)

### Typography

- Header probabilities: `text-2xl sm:text-3xl` mono
- Submit button: `text-xl py-5`
- Section titles: `text-lg` Syne

---

## Catalog / oracle / payout (unchanged external blockers)

- **Oracle awaiting:** Azuro subgraph `Prematch` post-FT — see PR16
- **Premier League:** Requires Azuro prematch feed + VPS refill (PR16 priority engine)
- **Payout E2E:** Not achieved — zero `wonOutcomeIds`
- **VPS:** Must deploy for PR15 AMM + PR16 retirement on Express path

---

## Validation checklist

| # | Test | Target |
|---|------|--------|
| 1 | Where to trade? | DecisionBlock + sticky TradingBox above fold |
| 2 | Profit clear? | QuickProfitStrip + potential return in box |
| 3 | Movement? | MarketMovementHint from real flow |
| 4 | <10s trade? | 3 taps: team → amount → confirm |
| 5 | Mobile simple? | Protocol hidden, limit hidden |
| 6–10 | Catalog/settlement | VPS deploy + external oracle |

## Readiness: **C+** (execution UX improved; payout still blocked)
