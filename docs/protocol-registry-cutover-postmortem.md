# Protocol registry cutover — post-mortem (2026-05-16)

Permanent record of the **“3 events on homepage”** incident, the true root cause, the correct AMM architecture, and anti-regression rules.

---

## SEZIONE A — ROOT CAUSE REALE

### What was **not** the problem

| Layer | Verdict |
|--------|---------|
| Frontend (React / LiveMarkets) | Not the source of collapse — it rendered what the API returned |
| Azuro raw feed | ~113 valid games consistently |
| Ranking / homepage intelligence | View-layer only; did not delete inventory |
| UI card cap (9 visible) | Display cap ≠ catalog cap |

### What **was** the problem

Production ran the **editorial catalog model** as if it were the **protocol source of truth**:

1. **Editorial persistence** — only a small picked set (≤9) was written to `curated_events` before any public API read.
2. **Sparse DB** — production had ~3 `OPEN` + `isActive` rows; `GET /api/markets` returned `slice(0, MAX_ACTIVE)` → **3 markets**.
3. **Deploy divergence** — protocol registry code existed locally but was **not** on `origin/master` / VPS until commit `2fbc373` / `d65350f`.
4. **Model collision** — two incompatible mental models:

| Editorial catalog (legacy) | AMM protocol registry (correct) |
|----------------------------|----------------------------------|
| Pick “featured” → persist few | Persist **all** minimally valid → rank in view |
| `CATALOG_TARGET_SIZE = 9` as persistence gate | Registry cap ~2000; homepage min 9 |
| `liquidityMode: canonical-catalog-routing` | `liquidityMode: protocol-registry` |
| Netflix / magazine | Exchange / AMM |

**One-line root cause:** *Editorial pick-before-persist + stale production deploy, not Azuro starvation and not frontend filtering.*

---

## SEZIONE B — INCIDENT TIMELINE

| Phase | Observation |
|--------|-------------|
| **T0 — Symptom** | Homepage showed ~3 events; users perceived “catalog collapse” |
| **T1 — Raw feed trace** | Azuro → normalize → validate: **113 in / 113 valid / 0 rejections** (starvation **after** indexer, in DB/API path) |
| **T2 — Homepage pipeline trace** | `predictio.live` → `GET https://api.predictio.live/api/markets` (not tRPC); API `total: 3`, `liquidityMode: canonical-catalog-routing` |
| **T3 — DB inference** | With legacy `MAX_ACTIVE=9`, API returning 3 ⇒ **~3 OPEN rows** in production Postgres |
| **T4 — Deploy proof** | `/api/version` → `gitCommitSha: null`; code at `991fba1` — no `protocolRegistryMode` in JSON |
| **T5 — Fix implemented** | `protocolRegistrySync.ts`, persist-all pipeline, boot sync, migration `sport`/`sportSlug`, homepage min-9 view |
| **T6 — Cutover** | Push `d65350f`, VPS Docker rebuild, `prisma migrate deploy`, boot sync **113 OPEN** |
| **T7 — Verified** | API `113`, DB `113 OPEN`, `protocol-registry` mode, health logs `PROTOCOL_REGISTRY_DIAGNOSTICS` |

Approximate investigation window: **~3 days** of forensic passes (raw feed, home pipeline, lifecycle, production bundle/API).

---

## SEZIONE C — ARCHITETTURA CORRETTA

```
Azuro raw feed
    → normalize
    → minimal validation (tradability, time window)
    → persist ALL valid rows → curated_events (protocol registry)
    → lifecycle (OPEN → LOCKED → RESOLVED)
    → vault / LP linkage + rebalance
    → liquidity routing (paper / canonical allocation)
    → homepage / markets page (VIEW: rank, featured, min-9 display)
```

### Three separate concerns (never merge)

| Concern | Question | Layer |
|---------|----------|--------|
| **Market existence** | Does this event exist in the protocol book? | Registry DB (`curated_events` upsert all valid) |
| **Liquidity allocation** | How much paper/LP budget does it get? | `canonicalLiquidityState` (currently top-N slots, e.g. 9) |
| **Homepage rendering** | What do we show first? | `LiveMarkets` + `ensureHomepageMinimumMarkets` (≥9 when pool allows) |

**Existence ≠ allocation ≠ featured UI.**

Default mode: `isProtocolRegistryMode()` = `!PREDICTIO_EDITORIAL_CATALOG_ONLY`.

---

## SEZIONE D — LP / VAULT MODEL

- Every **OPEN** registry row is a **vault candidate** (lifecycle + exposure bridge).
- **Registry** = universal set of tradable Azuro-linked events in Postgres.
- **LP allocation** = dynamic split of simulated (pre-testnet) or hybrid budget across a **canonical open slot cap** (`CANONICAL_OPEN_MARKET_CAP = 9` today) — intentional product constraint, not catalog size.
- **Rebalance** — `notifyCatalogLiquidityChanged` on registry sync, lock, refill, resolve (`vault_catalog_rebalance` logs).
- **No liquidity fragmentation** — single `allocationVersion` / canonical state; orphans flagged in diagnostics.

After cutover: **113 registry OPEN**, **9 LP-weighted** markets in canonical snapshot — by design until allocation cap is raised.

---

## SEZIONE E — ANTI-REGRESSION RULES

### NEVER

- Use **homepage UI** or **featured order** as persistence source of truth.
- Persist **only** featured / hero markets.
- Reintroduce **`CATALOG_TARGET_SIZE`** (or any N) as a **pre-persistence** gate in protocol mode.
- Apply **`slice(0, 9)`** (or similar) **before** writing `curated_events` in production AMM mode.
- Conflate **registry** (existence) with **view layer** (ranking) or **LP layer** (allocation).
- Ship protocol registry fixes **without** VPS rebuild + `prisma migrate deploy` + `/api/v1/version` SHA check.

### ALWAYS

- Persist **all** minimally valid Azuro events (subject to `protocolRegistryDbSyncCap`).
- Run **`REGISTRY_HEALTH_CHECK`** (see below) after deploy and on scheduler.
- Treat `GET /api/markets` as **read registry + optional throttled sync**, not editorial pick.
- Document deploy SHA via Docker build-args (`GIT_COMMIT_SHA`, `BUILD_TIME_ISO`).

### Automated guard: `REGISTRY_HEALTH_CHECK`

Implemented in `backend/src/services/registryHealthCheck.ts`.

| Alert code | Condition |
|------------|-----------|
| `OPEN_REGISTRY_BELOW_MIN` | DB OPEN &lt; `homepageMinMarkets()` (default 9) |
| `RAW_FEED_REGISTRY_GAP` | `RAW_FEED_COUNT` ≫ `OPEN_REGISTRY_COUNT` |
| `API_RESPONSE_BELOW_MIN` | Last API response count &lt; 9 |
| `OPEN_REGISTRY_SUDDEN_COLLAPSE` | OPEN count drops &gt;50% and below min |

Surfaces on:

- `GET /api/v1/health` → `registry` object (503 if critical)
- `GET /api/admin/health/full` (admin key)
- Logs after boot sync, registry sync, market status updater

Manual validation script:

```bash
cd backend && API_URL=https://api.predictio.live npm run debug:validate-registry
```

---

## Post-cutover validation notes (2026-05-16)

Sample markets on production API:

| Event | League | Kickoff (UTC) | Lock (−5m) | Reality |
|-------|--------|---------------|------------|---------|
| Slovakia – Norway | IIHF World Championship | 2026-05-16T10:20:00Z | 10:15Z | Real IIHF WC fixture (≈12:20 CEST) |
| Great Britain – Austria | IIHF World Championship | 2026-05-16T10:20:00Z | 10:15Z | Real IIHF WC fixture |
| HJK Helsinki – FC Ilves | Veikkausliiga | 2026-05-16T11:00:00Z | 10:55Z | Real Veikkausliiga fixture |

**Time integrity:** `lockedAt = startsAt − 5 minutes`; `timeToLock` matches server clock within probe tolerance.

**Residual issue:** IIHF hockey fixtures may appear with `sportSlug: football` in API — Azuro/taxonomy mapping; does not invalidate fixture times. Track via `canonicalSportTaxonomy` / indexer sport slug, not by shrinking registry.

**LP/view:** API returns 113 markets; paper liquidity fields populated for top canonical slots only; homepage shows ≥9 cards from full pool.

---

## Football-first stabilization (2026-05-16)

Protocol registry remains **persist-all**. Football-first applies only to:

- **Taxonomy** — `resolveCanonicalSportFromRaw()` (league inference overrides wrong Azuro tags; no `?? "football"` default).
- **Homepage/view** — `buildFootballFirstHomepageView()` / `rankFootballFirstForView()`.
- **LP** — football-weighted slot pick + `FOOTBALL_LP_WEIGHT_MULTIPLIER` in canonical allocation.

Metrics: `FOOTBALL_FIRST_METRICS` on `REGISTRY_HEALTH_CHECK`. Tests: `npm run test:football-first-guards`.

---

## References

- Deploy: `scripts/vps-deploy-backend.sh`, `docs/deployment.md`
- Registry sync: `backend/src/services/protocolRegistrySync.ts`
- Mode flags: `backend/src/services/emergencyRelaxMode.ts`
- Cutover commits: `2fbc373`, `d65350f`
