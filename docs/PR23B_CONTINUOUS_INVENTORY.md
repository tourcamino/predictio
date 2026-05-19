# PR23B — Continuous Football Inventory Strategy

**Date:** 2026-05-19  
**Goal:** Prediction market ecosystem with continuous inventory — not just imminent fixtures.

---

## Inventory buckets (canonical)

| Bucket | Window | Purpose |
|--------|--------|---------|
| `LIVE_NOW` | In play / -3h post-kickoff | Urgency |
| `STARTING_SOON` | 0–3h | Immediate execution |
| `NEXT_24H` | 3–24h | Short-term trading |
| `NEXT_72H` | 24–72h | Brief swing |
| `THIS_WEEK` | 72h–7d | Swing positioning |
| `THIS_MONTH` | 7–30d | Long conviction |
| `MAJOR_EVENTS` | Tag (PL, UCL, WC, Euros…) | Liquidity anchors |

**Code:** `backend/src/services/inventoryBuckets.ts`, `src/lib/inventory/inventoryBuckets.ts`

---

## European priority engine

Tier scoring in `marketPriorityEngine.ts`:

| Tier | Leagues | Multiplier |
|------|---------|------------|
| Anchor | PL, UCL, Europa, WC, Euros, Nations League | 2.2× |
| Top | Serie A, Bundesliga, La Liga, Ligue 1 | 1.75× |
| Mid | Championship, Eredivisie, etc. | 1.2× |
| Low | Serie C, friendlies, youth | 0.85× |

Low-tier leagues are **demoted, not hidden** when inventory is thin.

---

## Vitality ranking (PR23B)

```
score = kickoff_proximity × league_importance
      + liquidity + traders + fill_cadence
      + live_boost + disagreement + health
      − far_future_penalty (>30d)
```

- Raw feed pipeline now sorts by **vitality** (not pure chronological) before cap
- API `/api/markets` returns vitality-sorted markets
- No editorial hard caps in raw feed mode

---

## Homepage layers

`buildContinuousHomepageLayers()` — 7 sections:

1. Live now
2. Starting soon
3. Most active
4. Biggest movers
5. Major upcoming
6. This week
7. Long conviction

**Continuity guarantee:** if imminent/mid/long buckets empty, fallback injects from full pool.

---

## /markets discovery terminal

Tabbed lanes: Live · Soon · This week · Major · Active · Movers · Oracle · Settling · Long

---

## Regression logs

When `PREDICTIO_RAW_FEED_MODE=true`:

```
INVENTORY_BUCKET_COUNTS
RAW_FEED_COUNT, FOOTBALL_COUNT, NEXT24_COUNT, NEXT72_COUNT
THIS_WEEK_COUNT, MAJOR_COUNT, API_COUNT, RENDERED_COUNT
```

---

## Remaining blockers

| Item | Notes |
|------|-------|
| Upstream Azuro near-term PL sparsity | Code cannot invent fixtures |
| Activity signals sparse on new markets | volume/traders often 0 until trading |
| Frontend `fetchAzuroGameDetail` still subgraph | Separate from inventory path |
