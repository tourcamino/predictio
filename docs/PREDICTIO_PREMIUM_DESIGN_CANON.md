# Predictio Premium Design Canon

**Status:** Living reference for UI restoration (post PR1/PR2 canonical surfaces).  
**Immutable product identity:** See `PREDICTIO_HARD_PRODUCT_CONSTRAINTS.md`, `UX_MULTISPORT_PREMIUM_DIRECTION.md`.

Predictio is a **premium prediction trading protocol** — not a generic SaaS dashboard, admin panel, or flat CRUD app.

---

## Visual DNA (non-negotiable)

| Token | Value / pattern |
|-------|-----------------|
| Background | `bg-brand-bg` — deep cinematic dark |
| Accent | `brand-green` (#00FF87) — conviction, live edge |
| Secondary | `brand-cyan` — protocol telemetry |
| Typography display | `font-syne` — headlines, section chrome |
| Typography data | `font-mono` — prices, PnL, tape |
| Borders | `border-white/10` → hover `border-brand-green/25–40` |
| Cards | Glass gradient: `from-white/[0.06] to-white/[0.02]`, `rounded-2xl`, inset top hairline glow |
| Atmosphere | Radial green glow top + 3rem grid overlay + soft bottom bloom |
| Motion | Pulse on LIVE badges; `animate-spin` on oracle pending; hover shadow green glow |
| Charts | Real tape only — empty state = premium “tape pending”, never synthetic candles |

---

## Card hierarchy

1. **Terminal shell** — page frame (grid, glow, stat strip): `TradingTerminalShell`
2. **Execution panel** — split list + detail (`PositionsList` | `PositionDetail`)
3. **Lifecycle tail** — SETTLING / RESOLVED with `premium` cards on `PositionLifecycleBoard`
4. **Market cards** — `LiveMarketCard`, `MarketCard` family (reference implementation)
5. **Protocol banners** — oracle/settlement: amber gradient rail, not flat alert boxes

---

## Interaction philosophy

- **Trader-first:** YES/NO mono prices, MTM, outcome tension, liquidity depth *perception* (real data only).
- **Protocol honesty:** No fake history, no mock trades on canonical surfaces.
- **Canonical runtime (PR1/PR2) preserved:** `/trading` = positions + settlement; `/portfolio` = PnL; `/wallet` = ledger; do not merge surfaces in UI copy or routing.

---

## Surface restoration map

| Surface | Restore | Do not touch |
|---------|---------|--------------|
| `/trading` | Split terminal, `TradingTerminalShell`, premium lifecycle tail | OPEN-only left rail; settlement diagnostics |
| `/portfolio` | Grid atmosphere, exposure pill, institutional copy | Finance APIs, exposure math |
| `/markets/$id` | Premium chart shell + empty tape state | Real `priceHistory` only |
| `/copy` | Social terminal hero + gradient How-it-works | Paper-trading disclaimers |
| Hero / `LiveMarkets` | Existing premium patterns (reference) | Football-focus config unless product changes |

---

## Anti-patterns (regressions)

- Flat `bg-white/5` cards without gradient depth
- Admin-style “Canonical surfaces” help blocks on trading execution view
- Single-column position list replacing terminal split
- Bootstrap-style table dumps as primary UI
- Synthetic chart filler when history is empty

---

## Reference components

`Hero.tsx` · `LiveMarketCard.tsx` · `TradingTerminalShell.tsx` · `MarketSection.tsx` · pre-PR1 trading split pattern
