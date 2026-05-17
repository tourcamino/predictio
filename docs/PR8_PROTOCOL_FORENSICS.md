# PR8 — Protocol Forensics & Surface Audit

**Date:** 2026-05-17  
**Scope:** Post PR1–PR7 · Express canonical wallet · Azuro oracle paper settlement

---

## 1. Duplicate / overlapping surfaces

| Surface | Canonical role | Overlap found | PR8 action |
|---------|----------------|---------------|------------|
| `/trading` | Lifecycle + execution + MTM + settlement | None (primary) | Focus refetch + motion panels |
| `/portfolio` | Exposure + PnL | Copy mentions “predictions” | Wayfinder only; no execution |
| `/wallet` | Ledger | Clean | Wayfinder link |
| `/account` | Shell + referrals + tabs | **Predictions tab duplicates `/trading`** | Documented; users directed via wayfinder |
| `/account/analytics` | Legacy analytics | Partial portfolio overlap | Keep; not canonical |
| `/markets` | Discovery | Clean entry | Football-only config enforced |
| `/copy` | Social | Mock trader seeds on `/trader/$wallet` | Out of PR8 scope (non-wallet-critical) |
| `/liquidity` | LP layer | Separate | Added to wayfinder |

**Removed from `/trading`:** redundant footer CTAs (ledger/portfolio/markets) — `ProtocolSurfaceWayfinder` is single navigation rail.

---

## 2. Components still flat / SaaS-like

| Area | Issue | PR8 |
|------|-------|-----|
| `account/index` | Tabbed admin CRM | No redesign (out of scope) |
| `SportROIBreakdown` | Chart-heavy portfolio | Kept; real data |
| `RecentTradesFeed` | Can look empty | Real tape only |
| `Hero` / marketing | N/A | Untouched |

**Upgraded PR8:** `MarketPulseStrip`, `PositionMotionPanel`, `ProtocolWhyStillOpen`, terminal density on settlement stack.

---

## 3. Runtime inconsistencies

| Issue | Root cause | Mitigation |
|-------|------------|------------|
| Stale positions after trade | Partial invalidation | `refetchCanonicalPositionReads` + timeline + health |
| Summary vs position drift | Separate poll intervals | `useCanonicalProtocolRefetch` on focus |
| Oracle diagnostic stale | 60s refetch | Acceptable; focus refetch |
| VPS subgraph misconfig | Dead `AZURO_GRAPHQL_URL` | Fixed PR7 on host tick |

**Wallet-critical path:** Express `getUserPositions` — unchanged.

---

## 4. UX confusion matrix

| User question | Where answered (PR8) |
|---------------|----------------------|
| Did I win/lose? | Lifecycle tail + resolved PnL |
| Match finished? | `MarketClockPanel` + oracle narrative |
| Oracle pending? | `OracleTrustLayer` + `ProtocolWhyStillOpen` |
| Payout queued? | `SETTLEMENT_ELIGIBLE` + next action copy |
| Settlement blocked? | Diagnostic banner + forensics |
| Exposure? | `/portfolio` + `PortfolioExposureSummary` |
| Execution? | `/trading` PositionDetail + protocol timeline |
| Ledger? | `/wallet/transactions` |
| Queue? | Health bar + why-still-open queue hint |

---

## 5. Trading realism gaps (real data only)

| Gap | Real signal used in PR8 |
|-----|-------------------------|
| Static markets | `MarketPulseStrip`: spread, volume, oracle state |
| No activity feel | Protocol timeline last fills |
| MTM weak | `PositionMotionPanel` + probability drift |
| No tension | Amber oracle rails + pulse dot |

**Not added:** synthetic candles, RNG, mock tape.

---

## 6. Football-only

- Markets index: `isFootballFocusEnabled()` default sport football
- VPS registry: 43/43 football (boot logs)
- Forensics: `footballAudit` block on settlement dashboard
- Risk: legacy open orders on archived non-football Azuro IDs — retire via ops

---

## 7. Premium consistency vs canon

**Aligned:** glass gradients, `font-mono` numerics, terminal shell, oracle amber rails.  
**Still weaker than Polymarket/Bloomberg:** account CRM tabs, empty order book on thin markets, marketing hero separation.

---

## 8. PR8 code deliverables

- `deriveOracleActionContext.ts` · `deriveMarketPulse.ts`
- `ProtocolWhyStillOpen` · `MarketPulseStrip` · `PositionMotionPanel`
- `useCanonicalProtocolRefetch`
- Extended `refetchCanonicalPositionReads`
- `ProtocolSurfaceWayfinder` consolidation (6 surfaces)
- Settlement stack enrichment on `SettlementTimelineSection`

---

## 9. Remaining blockers (unchanged)

1. Azuro `Prematch` after full-time  
2. Zero production E2E payout proof on sample wallet  
3. `/account` predictions tab vs `/trading` semantic duplicate (nav only)  
4. Paper protocol — no on-chain settlement
