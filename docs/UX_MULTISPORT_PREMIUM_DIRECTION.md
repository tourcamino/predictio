# Predictio — European premium multisport: UX direction & implementation blueprint

**Status:** Strategy consolidation (no monolithic redesign).  
**Product line:** *Premium European multisport prediction infrastructure* — curated, intentional, “market intelligence terminal”; not sportsbook lobby, not global catalog spam.

**Code change bundled with this doc:** Removal of the permanent **South America** editorial slot (`southAmerica`); budget absorbed into **premium European anchors** (`premiumAnchors: 3`). Legacy API rows with `editorialSlot: "southAmerica"` should be rare; the UI type no longer includes that value.

---

## 1. UI audit (existing premium surface)

### Homepage (`src/routes/index.tsx`)

- **Stack:** `Hero` → `LiveMarkets` → `HowItWorks` → `WhyPredictio` → `TrustSection` → (`ComingSoonSports` if football focus) or `SportsGrid` → `CTASection`.
- **Premium signals:** Full-bleed hero with noise + grid + Syne typography; `LiveMarkets` uses subtle grid overlay, pill “CURATED MARKETS”, glassy metric strips.
- **Football-first leak:** When `FOOTBALL_FOCUS_CONFIG.ENABLED` is true, hero and `LiveMarkets` copy are explicitly football (“Trade Football Markets”, “Premium Football Markets”). `SportsGrid` is hidden; `ComingSoonSports` reinforces “main product = football”.

### Hero (`src/components/Hero.tsx`)

- **Strengths:** Calm premium layout, motion on headline, dual CTA, brand-green accent without casino palette.
- **Gap vs multisport identity:** Branch on `isFootballFocusEnabled()` replaces generic “Trade the Future” with football-only headline/subheadline from `footballFocus.ts`.

### Curated markets strip (`src/components/LiveMarkets.tsx`)

- **Strengths:** 3-column responsive grid, skeleton loading, `LiveMarketCard` consistency with markets visual language.
- **Gaps:** Title/subtitle still football when focus mode on; no narrative temporal grouping (single flat grid).

### Markets page (`src/routes/markets/index.tsx`)

- **Strengths:** `groupMarketsByEditorialSlot` + section rendering (editorial buckets), `MarketSection` carousels with `MarketCardCompact`, filters/sidebar.
- **Gaps:** Featured mode still driven by slot IDs (`premiumAnchors`, `italyFirst`, …) — editorial, but not yet “This Weekend / Next Week” narrative; sport rail emojis can read casual vs terminal.

### Cards

- **`LiveMarketCard`** (`src/components/markets/LiveMarketCard.tsx`): YES/NO mono prices, sparklines, sport emoji chip — strong **trader** feel; slight “odds-adjacent” risk if density/badge count grows.
- **`MarketCard`** / **`MarketCardCompact`**: Editorial slot badge via `editorialSlotLabel` — good hierarchy; keep adaptive slot quiet (already partially suppressed for `adaptiveFallback` in `MarketCard`).

### Reference docs / handoff

- `CURSOR_HANDOFF.md`, `docs/CURSOR_HANDOFF*.md` — product and pipeline context.
- `docs/FEATURES.md`, `docs/MARKET_LIFECYCLE.md` — lifecycle and trading semantics.

### “Bloomberg / DAZN premium” alignment (what to reuse)

| Pattern | Location | Rationale |
|--------|----------|-----------|
| Editorial hero + noise/grid | `Hero.tsx` | Institutional calm, not loud betting |
| Section chrome (pill + Syne H2 + gray sub) | `LiveMarkets.tsx` | Clear narrative frame |
| Glass cards, white/10 borders, green hover | `LiveMarketCard.tsx`, `MarketCard*.tsx` | Single coherent family |
| Horizontal editorial rails | `MarketSection.tsx` | “Focus strips” without cramming a whole lobby in one viewport |
| Compact cards in rails | `MarketCardCompact.tsx` | Premium density for secondary rows |
| Slot-aware ordering | `editorialCatalogOrder.ts`, backend orchestrator | Importance without random shuffle |

**Screenshot summary (descriptive):** Homepage reads as dark institutional terminal with green accent; below the fold a **nine-card curated grid** of match cards with dual YES/NO panels — premium but still **football-titled** when focus mode is on. Markets page can show **multiple horizontal sections** keyed to editorial slots (labels like “Premium anchors”, “Italy-first”).

---

## 2. Reusable premium components (reuse, don’t redesign)

**Priorità di riuso:**

1. `Hero.tsx` — copy + optional secondary visual per sport **without** changing layout primitives.
2. `LiveMarkets.tsx` — re-title and re-subtitle; optional **2-pass layout**: one “lead” row + rest below (still same cards).
3. `MarketSection.tsx` + `MarketCardCompact.tsx` — narrative bands (“This Weekend”, “Next Week”) as **titles only** at first.
4. `LiveMarketCard.tsx` / `MarketCard.tsx` — same structure; tune badges and labelling, not new components.
5. `TrustSection`, `WhyPredictio`, `HowItWorks` — authority/education; avoid sport-specific claims unless intentional.

**Paths chiave:**  
`src/components/Hero.tsx` · `src/components/LiveMarkets.tsx` · `src/components/markets/LiveMarketCard.tsx` · `src/components/markets/MarketCard.tsx` · `src/components/markets/MarketCardCompact.tsx` · `src/components/markets/MarketSection.tsx` · `src/lib/editorialCatalogPresentation.ts` · `src/routes/markets/index.tsx` · `src/config/footballFocus.ts`

---

## 3. Current “football-first” problems (product + UX)

| Issue | Where it shows | Why it hurts multisport premium |
|-------|----------------|--------------------------------|
| `FOOTBALL_FOCUS_CONFIG.ENABLED: true` | `footballFocus.ts`, `Hero`, `LiveMarkets`, markets default sport | Product reads as football app |
| “Premium Football Markets” copy | `LiveMarkets.tsx` | Contradicts European **multisport** intelligence |
| Hero football headline/subhead | `Hero.tsx` | Same |
| `ComingSoonSports` instead of `SportsGrid` | `index.tsx` | Signals other sports are second-class |
| Slot labels like internal IDs | `editorialCatalogPresentation.ts` | “Italy-first” is on-brand for Italy bias; still sounds ops-y vs narrative (“Italian spotlight”) |
| Flat time horizon in UI | No “weekend / next week” rails | Feels “everything now”, not curated timeline |
| `LiveMarketCard` YES/NO emphasis | Home grid | Useful for traders; must stay **sparse** and paired with calm editorial framing |

---

## 4. New homepage / catalog information architecture (target)

**Principles:** Fewer simultaneous stories; editorial **bands**; multisport parity in **language** and **rails** (not necessarily equal card count).

**Homepage (incremental):**

1. **Hero** — European multisport prediction intelligence (no sportsbook verbs as primary story).
2. **Primary narrative strip** — 3–5 events max (or keep 9 but visually tier: 3 “lead” + 6 secondary) using existing cards.
3. **Temporal / spotlight strips** — Reuse `MarketSection` pattern with new titles (data-driven below).
4. **Trust / How it works** — unchanged structure.

**Markets / featured view:**

- Replace or **map** raw slot labels to **narrative section titles** (see §5).
- Keep `groupMarketsByEditorialSlot` plumbing; add a **presentation layer**: `(slot | timeBucket) → { title, subtitle }`.

---

## 5. Temporal orchestration (UX + backend)

**Editorial rule (product):** Prefer spread across **~3d, ~7d, ~15d**; avoid same-day clutter and “next hours only” when the pool allows.

**UX groupings (examples):**

- This Weekend  
- Next Week  
- Grand Slam Spotlight (tennis)  
- Champions League Night (or “European midweek cups”)  
- Italian Spotlight  
- Formula 1 Weekend  

**Implementation concept:**

- **Phase A (UI-only):** Group curated markets by `kickoff` into buckets (weekend window, 7–14d, etc.) **within** each editorial section or as overlay sections — still using the same cards.
- **Phase B (orchestrator):** After slot fills, **re-pick or swap** to enforce max N fixtures per calendar day and prefer MID/LATER bands when scores are tied (today `fillAdaptiveFallback` already uses `getTemporalBandForUnix` but still prioritizes SOON — invert or soften for product goals).

**Backend files:** `backend/src/services/editorialCatalogOrchestrator.ts` (slot budgets, fill order, adaptive band scoring).

---

## 6. Multisport visual system (constraints)

- **One card architecture** for all sports; sport denoted by **small** consistent icon (emoji from `mockMarkets` today — can stay until a monochrome icon set exists).
- **Color:** Brand green + neutral grayscale; no per-sport rainbow.
- **Typography:** Syne for headlines, mono for numbers; no new display fonts.
- **Motion:** Subtle hover borders (existing); avoid jackpot-style animations.
- **Density:** Prefer **fewer badges**; hide “volume” chips on homepage if they read gambling-y.

---

## 7. Implementation plan (phased — no big bang)

| Phase | Scope | Outcome |
|-------|--------|---------|
| P0 | Remove SA slot; shift budget to European anchors | Done in codebase with this doc |
| P1 | Copy + config: turn off or narrow football focus when ready; align Hero + `LiveMarkets` with multisport positioning | Low risk |
| P2 | Presentation map: slot → narrative section title + subtitle | `editorialCatalogPresentation.ts` |
| P3 | Temporal buckets on homepage/markets (reuse `MarketSection`) | Mostly `markets/index.tsx`, possibly `LiveMarkets.tsx` |
| P4 | Orchestrator temporal spread + per-day cap | `editorialCatalogOrchestrator.ts` |
| P5 | Optional: sport icon pass (subtle SVG set) | New asset folder + token in `MarketCard` |

---

## 8. Files to touch (by phase)

**Done (P0):**

- `backend/src/services/editorialCatalogOrchestrator.ts`
- `src/lib/editorialCatalogPresentation.ts`
- `src/lib/editorialCatalogOrder.ts`
- `src/utils/curatedMarketsApi.ts`
- `src/services/azuro.ts`

**Next (P1–P3):**

- `src/config/footballFocus.ts`
- `src/components/Hero.tsx`
- `src/components/LiveMarkets.tsx`
- `src/routes/index.tsx`
- `src/routes/markets/index.tsx`
- `src/components/markets/MarketCard.tsx` (badge policy)

**P4:**

- `editorialCatalogOrchestrator.ts` (day cap, band preference)

---

## 9. UX risks

| Risk | Mitigation |
|------|------------|
| Removing SA slot shifts one more pick to adaptive / high-importance global football | Monitor adaptive; add geographic penalty for non-European leagues if needed |
| YES/NO panels feel “book” | Pair with editorial titles, reduce badge count on home |
| Temporal spread reduces “imminent excitement” | Single “Starting soon” row max 1–2 cards |
| Narrative titles drift from true slot semantics | Single mapping table + analytics on section CTR |
| Football focus flag left on | Explicit launch checklist when multisport identity goes live |

---

*Document owner: product/design/engineering alignment. Update when `FOOTBALL_FOCUS_CONFIG` or catalog cap changes.*
