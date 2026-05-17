# PR10 — Trading terminal UX forensics

**Date:** 2026-05-17  
**Scope:** `/trading` before → after trader-first redesign  
**Constraints:** premium canon, zero fake data, real lifecycle/oracle only

---

## 1. Root cause UX findings

| Issue | Root cause | Impact |
|-------|------------|--------|
| Feels like ops console | Above-fold stack: `ProtocolAliveStrip`, `SettlementOracleBanner`, `ProtocolSettlementHealthBar`, copy-trading promo | Trader cannot see P&L/positions in &lt;3s |
| Wrong visual hierarchy | `TradingTerminalShell` duplicated title + balance; narrow 380px “Open rail” dominated layout | Positions felt secondary to protocol |
| Split-pane cognitive load | Desktop `lg:grid-cols-[380px_1fr]` forced rail selection before context | Two-pane admin pattern, not terminal |
| Duplicate semantics | Shell “Open” count + rail header + lifecycle board all surface settlement state | Same oracle story 3× |
| Mobile regression | Separate simplified list (name + PnL only) vs desktop rich detail | Inconsistent mental model |
| Protocol-heavy detail | `PositionDetail` stacks motion, timeline, activity, order book before sell | Sell buried; trader goal delayed |

---

## 2. New trading IA

```
/trading (trader-first)
├── TradingDeskHeader (fold)
│   ├── Open P&L ($ + %)
│   ├── Positions count
│   ├── Live matches
│   ├── Settling
│   └── Paper balance
├── TraderPositionsBoard (main)
│   ├── Live now
│   ├── Ending soon
│   ├── High P&L swing
│   ├── Settling
│   └── Open
│   └── TraderPositionCard × N
├── Position desk drawer (lg+, optional)
│   └── PositionDetail (sell / add / book)
└── TradingOpsCollapsible (below fold)
    ├── ProtocolAliveStrip
    ├── SettlementOracleBanner
    ├── ProtocolSettlementHealthBar
    ├── PositionLifecycleBoard (settling/resolved tail)
    └── ProtocolSurfaceWayfinder
```

**Sorting:** `traderPositionDesk.ts` — `sortTraderDeskRows` / `groupTraderDeskRows` by section priority then P&L within section.

---

## 3. Lifecycle clarity

- **Match phases shown (no fake scores):** `scheduled` · `live` · `closed` (FT) · `awaiting_oracle` · `settled` / `cancelled` / `refunded`
- Derived from `derivePositionLifecycle` + order status + market closes/kickoff — **not** invented minute/score feeds
- Card badges: LIVE (pulse), FT, SETTLING / Awaiting oracle, Scheduled
- Countdown from real `closesAt` / `kickoffAt` only

---

## 4. Sell UX

Each `TraderPositionCard` surfaces:

- Entry vs current probability (¢) + delta hint
- Invested, mark value, max payout / if correct
- Favorability icon (market moved for/against)
- Primary **Sell position** CTA when `canSell` (open + closeable + not awaiting oracle)
- Mobile: sell → `/trading/position/$id` (full `PositionDetail` + `SellControls`)
- Desktop: same route or drawer with existing sell flow

---

## 5. Mobile findings

- Single-column full-width cards; P&L top-right at 2xl scale on sm+
- Stats grid 2×2 on mobile, 4-col on sm+
- Details / sell navigate to dedicated position route (no cramped split pane)
- Ops panel collapsed by default — no protocol wall on first paint

---

## 6. Remaining confusion points

1. **Oracle prematch blocker** — many wallets show “Awaiting oracle” with no score; product truth, not UI bug
2. **Drawer vs route on desktop** — drawer opens on card select; sell always uses position route (intentional: full sell UX)
3. **Demo vs connected** — demo still uses legacy empty/connect flows without desk grouping
4. **Non-Azuro market** — one open market may lack Azuro lifecycle; card shows scheduled/minimal oracle

---

## 7. Premium consistency

- Syne headings, mono P&L, brand-green accents, glass borders — aligned with `PREDICTIO_PREMIUM_DESIGN_CANON.md`
- Density inspired by Polymarket/Kalshi position rows, not SaaS tables
- No fake sparklines/candles; `ProbabilityDepthBar` uses real entry/current quotes only
- Ops chrome demoted to collapsible — avoids admin-panel regression

---

## 8–11. Deploy / regressions / blockers

| Item | Value |
|------|--------|
| **Commit SHA** | `54ecec6` |
| **Vercel deploy ID** | `dpl_GStK9biXbAYZmJ46tdRQcBhuPsy1` (production, triggered on push) |
| **Backend** | Not required (frontend-only) |

### Regressions avoided

- No settlement math changes
- No mock/RNG market data
- Express wallet paths unchanged
- PR7–PR9 protocol surfaces preserved (relocated, not deleted)

### Remaining blockers (product)

- Azuro oracle `Prematch` after FT → no E2E payout proof (PR9)
- Paper-only protocol
- Public testnet readiness unchanged
