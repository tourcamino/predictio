# PR21 — Azuro Endpoint Forensics + Oracle Validation

**Date:** 2026-05-19  
**Script:** `node scripts/pr21-azuro-endpoint-forensics.mjs --save-samples`

---

## Executive verdict

**Azuro is NOT empty. Predictio was interrogating a deprecated, stale subgraph.**

| Source | Football prematch | Next 72h football | EPL today (England) |
|--------|-------------------|-------------------|---------------------|
| **Deprecated subgraph** (`thegraph-1` … `azuro-data-feed-polygon`) | 495 total / 43 future (gte) | **0** | **0** |
| **Official REST API** (`api.onchainfeed.org` market-manager) | **393** | **100+** (page 1 alone) | **Bournemouth–Man City, Chelsea–Spurs** |

**Root cause:** `QUERY_STRATEGY_OBSOLETE` — not upstream Azuro death.

---

## FASE 1 — Endpoint inventory (Predictio config)

| Variable | Value (production) | Used by |
|----------|-------------------|---------|
| `AZURO_DATA_FEED_URL` | `https://thegraph-1.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-data-feed-polygon` | Backend ingest, settlement, docker-compose |
| `AZURO_GRAPHQL_URL` | Legacy fallback (unset in prod) | `adminCuration.ts`, host settlement script |
| `AZURO_API_URL` | `azuro-api-polygon-v3` (backend `.env` only) | Not used for feed ingest |
| `VITE_AZURO_*` | Gnosis hosted-service (`.env.example`) | **Not active** in prod catalog path |
| `PREDICTIO_RAW_FEED_MODE` | `true` | Pipeline-first API (PR20) |

**Network:** Polygon (`PolygonUSDT` environment in REST API).  
**NOT using:** Gnosis data-feed (deployment does not exist on `thegraph.onchainfeed.org`).

---

## FASE 2 — Raw query validation (2026-05-19)

### Deprecated subgraph (`thegraph-1` … `data-feed-polygon`)

| Query | Count | Notes |
|-------|-------|-------|
| Prematch all pages | 960 | 917 past kickoff still `Prematch` |
| Prematch `startsAt_gte:now` | 43 | World Cup June 2026 only |
| Live `state:Live` | 48 (17 football) | All past kickoff timestamps |
| `_meta.block.timestamp` | ~9 days behind `now` | Indexer lag |

**League breakdown (all prematch):** 47 PL, 26 Serie A, 24 La Liga, 8 UCL — **all stale** (past kickoff).

### Official REST API (`market-manager/games-by-filters`)

| Query | Total | Next 72h |
|-------|-------|----------|
| Prematch all | 953 | 100+ on page 1 |
| Prematch `sportSlug=football` | 393 | 100 on page 1 |
| Live | works with `orderBy=startsAt&orderDirection=desc` | in-play tennis/football |

**EPL proof (REST):**

- `AFC Bournemouth - Manchester City` — 2026-05-19T18:30Z — `gameId: 1006000000000085187748`
- `Chelsea FC - Tottenham Hotspur` — 2026-05-19T19:15Z

**Same gameId on subgraph:** `NOT_FOUND`.

---

## FASE 3 — Endpoint discovery / official docs

Azuro Gem docs (updated **March 13, 2026**):

1. **Data-feed subgraphs → DEPRECATED** ([Graph API](https://gem.azuro.org/hub/apps/APIs/graph))
2. **Prematch games → Backend REST API** ([Get Games](https://gem.azuro.org/hub/apps/guides/advanced/prematch/get-games))
3. **Client subgraphs** (`azuro-api-polygon-v3`) → bet history only, **not feed**
4. **Live host chain** → Gnosis LiveDataFeed subgraph (separate from prematch Polygon feed)

Predictio was still on deprecated `data-feed-polygon` GraphQL — exactly what Azuro docs say to migrate away from.

### Hostname trap

| URL | Status |
|-----|--------|
| `thegraph-1.onchainfeed.org/.../azuro-data-feed-polygon` | Works but **stale** |
| `thegraph.onchainfeed.org/.../azuro-data-feed-polygon` | **Deployment does not exist** |

`backend/.env` had `AZURO_API_URL` pointing to client subgraph — never wired to ingest.

---

## FASE 4 — Azuro frontend comparison

Azuro official apps (bookmaker.XYZ, Azuro toolkit) use:

- `@azuro-org/toolkit` → `getGamesByFilters({ chainId: 137, state: Prematch })`
- Backend: `https://api.onchainfeed.org/api/v1/public/market-manager`

**Predictio was NOT using this path.** That explains why Azuro frontend shows near-term PL while Predictio showed only World Cup fixtures.

---

## FASE 5 — Oracle forensics

Wallet test positions (PR16–18) polled via **same stale subgraph**:

| gameId | Title | Subgraph state | Kickoff | wonOutcomeIds |
|--------|-------|----------------|---------|---------------|
| 1006000000000081204714 | Alavés – Barcelona | Prematch | **past** | [] |
| 1006000000000083636688 | Gnistan – Jaro | Prematch | **past** | [] |

**Oracle blocker:** `ORACLE_PREMATCH` — games finished in reality but subgraph never transitioned to `Finished`/`Resolved`.

This is **indexer staleness on deprecated endpoint**, not wrong condition selection logic.

---

## FASE 6 — Network forensics

| Network | Prematch feed | Predictio usage |
|---------|---------------|-----------------|
| Polygon (`PolygonUSDT`, chainId 137) | REST API + deprecated data-feed | Correct network, wrong API generation |
| Gnosis (`GnosisXDAI`) | REST returns 0 prematch | Not used (correct for Polygon-first app) |

No chain ID mismatch — **API generation mismatch**.

---

## FASE 7 — Historical regression

| When | Change | Effect |
|------|--------|--------|
| `64f6d91` | Introduced `AZURO_DATA_FEED_URL` | Migrated to Polygon data-feed subgraph |
| PR7–PR19 | Forensics on same subgraph | Concluded "Azuro empty" — **false for REST path** |
| Azuro V3 migration | Feed moved to REST market-manager | Predictio never migrated ingest |
| May 16 postmortem | 113 games on subgraph | Subgraph had data then; now lag + missing new gameIds |

**Regression:** Azuro migrated feed to REST; Predictio stayed on deprecated subgraph.

---

## FASE 10 — Fixes applied (PR21)

1. **`backend/src/services/azuroMarketManagerApi.ts`** — REST client
2. **`fetchAzuroInventoryGames`** — REST primary (`AZURO_USE_REST_FEED=true`), subgraph fallback
3. **`docker-compose.prod.yml`** — REST env vars

---

## Remaining blockers

1. **Settlement oracle** — still reads deprecated subgraph for `wonOutcomeIds`
2. **Frontend `src/services/azuro.ts`** — still subgraph (homepage uses backend API)
3. **OAL** — still recommended as settlement fallback

---

## Readiness impact

| Area | Before PR21 | After PR21 (expected) |
|------|-------------|---------------------|
| Near-term football inventory | 2/10 | **8/10** |
| Query strategy correctness | 2/10 | **9/10** |
| Oracle settlement | 3/10 | 3/10 |
| Azuro "dead" hypothesis | **DISPROVEN** | — |
