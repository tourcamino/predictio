# PR20 — Raw Feed Recovery + Oracle Settlement Unblock

**Date:** 2026-05-19

---

## PR19 correction

PR19 concluded **"Azuro has no near-term football"** from `startsAt_gte:now` GraphQL probe (43 World Cup fixtures only).

That diagnosis was **incomplete**. The [protocol registry postmortem](protocol-registry-cutover-postmortem.md) already established:

| Layer | May 16 incident | PR19 focus |
|-------|-----------------|------------|
| Azuro raw feed | **113 valid games** | 43 future + 917 stale prematch |
| Collapse point | **Editorial pick-before-persist (3→9 rows)** | Upstream starvation |
| Fix | `PREDICTIO_RAW_FEED_MODE` + persist-all registry | — |

**Both can be true:**

1. Azuro indexer accumulates **stale Prematch** (past kickoff, still `Prematch`) — 960 rows on May 18
2. Predictio **curated architecture** can still collapse inventory **after** ingest:
   - DB read + `sortCuratedByVitality` filter (kickoff window)
   - `staleMarketRetirement` far-future deactivation (23 rows)
   - `REGISTRY_HEALTH`: RAW 60 >> OPEN 20 gap
   - API served from **DB snapshot** not live pipeline

PR19 correctly identified stale upstream data but **under-weighted curated-layer collapse** — the same class of bug as the May 16 "3 events on homepage" incident.

---

## PR20 fixes

### 1. Explicit raw feed mode (production)

`docker-compose.prod.yml`:

```env
PREDICTIO_RAW_FEED_MODE=true
PREDICTIO_EDITORIAL_CATALOG_ONLY=false
```

### 2. Full indexer pagination (no GraphQL `startsAt_gte` in raw mode)

`buildRawFeedCatalogPayload` now fetches **all Prematch pages** when `isRawFeedCatalogActive()`, filters in pipeline via `emergencyMinimalTradable` — avoids missing games due to gte pagination returning only World Cup chronology first.

### 3. Pipeline-first API (anti-collapse)

`GET /api/markets` in raw feed / protocol registry mode:

- **Source of truth for response:** live pipeline `games` (post-sync)
- **Not:** DB re-read + vitality filter that can hide valid rows
- Logs: `API_SOURCE: pipeline`, `PIPELINE_GAME_COUNT`

New: `backend/src/services/rawFeedCatalogApi.ts`

### 4. Stop far-future DB deactivation in raw feed mode

`staleMarketRetirement` skips `startsAt > now+30d` deactivation when raw feed active — demotion is sort-only, not persistence gate.

### 5. Oracle settlement (partial)

Host `vps-run-settlement-tick.sh` still fails: `db.curatedEvent` undefined (monorepo Prisma on host vs backend container). **Workaround:** run settlement from backend container after adding script, or fix host `DATABASE_URL` + generate client. Azuro terminal state remains upstream blocker for payouts.

---

## Architecture (correct)

```
Azuro (paginate ALL prematch + live)
  → emergencyMinimalTradable (pipeline filter)
  → persist ALL → curated_events
  → GET /api/markets returns PIPELINE (not DB-filtered)
  → homepage rank / vitality sort (view only)
```

**Existence ≠ allocation ≠ featured UI** — never conflate again.

---

## Remaining blockers

1. **Near-term PL/UCL** — if Azuro has zero future Prematch for domestic leagues, multi-source fixture API still required (PR21)
2. **Oracle terminal** — Azuro Prematch post-FT; OAL needed for testnet payouts
3. **Settlement tick on VPS host** — Prisma client path fix pending

---

## Verify after deploy

```bash
curl -s https://api.predictio.live/api/markets | jq '{total, pipelineGameCount, apiSource, count: (.markets|length)}'
# Expect: apiSource=pipeline, pipelineGameCount ≈ VALID_COUNT from boot logs

node scripts/pr19-inventory-forensics.mjs
```

Boot logs should show:

```
azuro_inventory_merge prematchCount + liveFootballCount
API_SOURCE: pipeline
```
