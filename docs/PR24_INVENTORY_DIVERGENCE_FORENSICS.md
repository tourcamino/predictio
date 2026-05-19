# PR24 — Inventory Divergence Forensics

**Date:** 2026-05-19  
**Symptom:** Homepage "Explore All 0 Markets", `/markets` empty, `/liquidity` shows Markets Active: 919

---

## Root cause (proven)

| Finding | Evidence |
|---------|----------|
| **API works** | `GET /api/markets` → 930 markets, 435 football, `rawFeedMode: true` |
| **API is SLOW** | Cold response **~16.5 seconds** (740KB JSON + full Azuro pipeline rebuild) |
| **Frontend timeout** | `fetchCuratedMarketsFromApi` aborted at **6 seconds** |
| **Silent failure** | `catch {}` returned `{ markets: [], total: 0 }` with no error log |
| **Liquidity diverged** | Reads `REGISTRY_OPEN_COUNT` from canonical liquidity API (DB), not browser fetch |

**Conclusion:** Inventory existed; homepage/markets surfaces failed due to **timeout + silent empty fallback**, not missing Azuro data.

---

## Surface source map (before fix)

| Surface | Source | Why 919 vs 0 |
|---------|--------|--------------|
| `/liquidity` | tRPC + `expressGetCanonicalLiquidityState` → DB registry | Server-side, fast |
| Homepage | `fetch` → `/api/markets` (6s timeout) | **Aborted → empty** |
| `/markets` | Same fetch | **Aborted → empty** |
| Hot markets | `GET /api/v1/markets/hot` (Prisma) | Separate path |
| Protocol pulse | tRPC `getProtocolMarketBreadth` | DB-backed |

---

## Fix (PR24)

### 1. Pipeline cache (`inventoryPipelineCache.ts`)
- Cache Azuro pipeline payload **90s TTL**
- Avoid rebuilding inventory on every browser request

### 2. Fast discovery API (`GET /api/markets/discovery`)
- Returns **30–50 quality football** fixtures (bucket-balanced)
- `?mode=catalog` → up to **250** vitality-ranked football (for `/markets`)
- Response includes `catalogTotal` (full pipeline count for CTA)

### 3. Unified frontend fetch (`fetchCanonicalInventory.ts`)
- Discovery first (fast, small payload)
- Fallback to full `/api/markets` with **45s timeout**
- **Logs failures** (`INVENTORY_FETCH_FAILED`) — no silent empty

### 4. Canonical discovery selection (`canonicalDiscoveryInventory.ts`)
- European league priority (PL, UCL, Serie A, etc.)
- Bucket caps: LIVE, 24H, 72H, week, major
- Stale FT games filtered (`kickoff_past_stale`)

---

## Mandatory logs (added)

```
INVENTORY_PIPELINE_CACHE_HIT | CACHE_MISS
CANONICAL_DISCOVERY_INVENTORY
INVENTORY_FETCH_SUCCESS | INVENTORY_FETCH_FAILED
INVENTORY_BUCKET_COUNTS
```

Fields: `RAW_FEED_COUNT`, `PIPELINE_COUNT`, `API_MARKETS_COUNT`, `CATALOG_TOTAL`, `FILTERED_OUT`, `FILTER_REASON`

---

## Architecture (canonical)

```
Azuro REST
  → pipeline (cached 90s)
  → canonicalDiscoveryInventory (50 quality football)
  → GET /api/markets/discovery
  → fetchCanonicalInventory()
  → homepage + /markets + discovery terminal

Full catalog (2500 cap):
  → GET /api/markets (admin / fallback only)
```

---

## Env verification

Production must have:
```env
PREDICTIO_RAW_FEED_MODE=true
AZURO_USE_REST_FEED=true
```

Verified on VPS backend boot logs.

---

## Remaining blockers

| Item | Notes |
|------|-------|
| First discovery request after cache cold | Still ~16s once per 90s (acceptable with 25s timeout) |
| `/api/v1/markets` still Prisma-only | Separate from discovery path |
| Activity signals sparse | volume/traders often 0 on new markets |
