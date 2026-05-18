# PR11 — Trading psychology & market tension audit

**Date:** 2026-05-17  
**Scope:** `/trading` post-PR10 — perception of live probability trading  
**Constraints:** zero fake data, synthetic movement, or mock volatility

---

## 1. Root cause psychology findings

| Gap | PR10 state | Why it felt “dead” |
|-----|------------|-------------------|
| No desk-level pulse | Cards isolated | User couldn’t see “how is my book vs market” at a glance |
| Weak conviction language | ±1¢ icon only | No answer to “does the market believe in me more now?” |
| Timing de-emphasized | Small countdown mono | No urgency for live / ending / oracle queue |
| Sell/hold not juxtaposed | Max payout duplicated; sell buried in footer | “Vendo o tengo?” required mental math |
| Probability bar desktop-only | Hidden on mobile | Mobile lost movement story |
| Detail = protocol first | Lifecycle/motion above execution | Trader intent delayed on `/trading/position/$id` |

---

## 2. Position card findings (PR11 changes)

- **Denser grid:** entry / now / invested / value / max win / vs entry (6-up)
- **Conviction strip:** `strong_favor` → `strong_against` with human labels + drift %
- **Probability bar:** always visible (mobile included)
- **Sell decision panel:** exit value · P&L if sold · hold payout · drift (embedded)
- **Side badge:** YES / NO / DRAW mono chips
- **Timing:** `timingLabel` + urgent border tint on live/ending
- **Quote freshness:** from `marketPrices[].timestamp` when present
- **Sell CTA:** shows P&L in button label (`Sell · +$X`)

---

## 3. Market movement findings

- Drift from `priceMovementLabel(entry, current)` — real quotes only
- Side-aware favorability: YES benefits from rising implied prob, NO from falling
- Desk pulse banner: counts with-you / against / live / time-sensitive + avg drift
- No RNG, candles, or fake tape

---

## 4. Sell UX findings

`TraderSellDecisionPanel` on every card + position detail:

| Field | Source |
|-------|--------|
| Exit now | `displayValue` (mark-to-market) |
| If you sell | `displayPnl` / `displayPnlPct` |
| If held & correct | `maxPayout` (shares × $1) |
| Market drift | `marketDriftLabel` |
| Oracle / risk | `oracleStateLabel` + `riskState` |

---

## 5. Mobile findings

- Reduced padding (`p-3`), smaller type, 3-col numeric grid
- Sell/hold panel shown above footer CTAs
- Conviction + prob bar above fold within card tap target

---

## 6. Remaining confusion points

1. **No HT / live score** — data not in canonical market model; phases stay scheduled/live/FT/oracle
2. **Prematch oracle** — many positions show “awaiting oracle” without payout proof (PR9 blocker)
3. **Quote age** — only when trading store has `timestamp` from summary refresh
4. **Desk pulse** — aggregate of open book only, not global market tape

---

## 7. Premium consistency

- Terminal density ↑, SaaS whitespace ↓
- Mono numerics, Syne titles, green/red semantic P&L
- Pulse on **live** badges only (real phase), not random animation
- Protocol depth collapsed in position detail — professional terminal, not admin wall

---

## 8–11. Deploy metadata

| Item | Value |
|------|--------|
| **Commit SHA** | `8503afa` |
| **Vercel deploy ID** | *(see production deploy for this SHA)* |
| **Backend** | Not required |

### Regressions avoided

- PR10 trader-first hierarchy preserved
- Settlement math / fake data policies unchanged
- Ops collapsible unchanged

### Remaining blockers

- Azuro prematch oracle (E2E payout)
- Paper-only protocol
