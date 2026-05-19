# PR22 — Subgraph Eradication Audit

**Date:** 2026-05-19  
**Goal:** Map every remaining legacy Azuro subgraph usage → canonical REST replacement.

---

## Summary

| Category | Migrated (PR22) | Legacy fallback | Diagnostic-only |
|----------|-----------------|-----------------|---------------|
| Inventory ingest | ✅ REST | subgraph in `azuroCuratorGraphql.ts` | — |
| Settlement oracle | ✅ REST via `azuroOracleAdapter` | `AzuroLegacySubgraphProvider` | — |
| Backend market status | ✅ REST in `checkAzuroResolution` | subgraph path if REST fails | — |
| Frontend market fetch | ⚠️ Still subgraph | `fetchAzuroGames` / `fetchAzuroGameDetail` | Uses backend API for main UX |
| Forensics scripts | — | — | Intentional compare REST vs subgraph |
| Admin debug routes | — | `adminCuration.ts` GraphQL probe | Debug only |

---

## OLD SOURCE → NEW SOURCE

| Location | Function | OLD | NEW | Status |
|----------|----------|-----|-----|--------|
| `backend/src/services/azuroCuratorGraphql.ts` | Inventory ingest | `data-feed-polygon` GraphQL | `azuroMarketManagerApi.ts` REST | REST primary when `AZURO_USE_REST_FEED=true` |
| `backend/src/services/azuroMarketManagerApi.ts` | Inventory + oracle lookup | — | `games-by-filters`, `games-by-ids`, `conditions-by-game-ids` | **Canonical** |
| `backend/src/jobs/marketStatusUpdater.ts` | Resolution poll | `game(id:)` subgraph | `fetchRestOracleResolution()` | REST when `isAzuroRestFeedEnabled()` |
| `src/lib/oracle/azuroRestOracleProvider.ts` | Settlement oracle | — | REST games + conditions | **Canonical** |
| `src/lib/oracle/azuroOracleAdapter.ts` | Provider selection | — | REST default, subgraph fallback | **Canonical** |
| `src/services/azuro.ts` | `checkResolvedMarkets` | Direct GraphQL | `pollAzuroOracleSnapshots()` | **Migrated PR22** |
| `src/services/azuro.ts` | `fetchAzuroGameForSettlement` | GraphQL | Oracle adapter | **Migrated PR22** |
| `src/services/azuro.ts` | `fetchAzuroGames` | GraphQL | Should use backend `/api/markets` | **Remaining** — low traffic |
| `src/services/azuro.ts` | `fetchAzuroGameDetail` | GraphQL | REST `games-by-ids` | **Remaining** |
| `src/server/scripts/runGlobalPaperSettlementTick.ts` | Cron settlement | Subgraph via azuro.ts | REST oracle | **Migrated PR22** |
| `docker-compose.prod.yml` | Env | `AZURO_DATA_FEED_URL` still set | + `AZURO_USE_REST_ORACLE=true` | Fallback env only |
| `scripts/vps-run-settlement-tick.sh` | VPS cron | Exports `AZURO_DATA_FEED_URL` | REST oracle via env flags | Add `AZURO_USE_REST_ORACLE` |
| `backend/src/routes/adminCuration.ts` | Admin debug probe | GraphQL | Keep for diff/debug | Diagnostic |
| `src/lib/settlement/settlementDiagnostics.ts` | Error messages | "subgraph" wording | Update copy to "oracle feed" | Cosmetic |
| `src/lib/protocol/deriveOracleActionContext.ts` | UX copy | "Azuro subgraph" | "Azuro oracle (REST)" | Cosmetic follow-up |
| `scripts/pr21-*.mjs`, `pr19-*.mjs`, etc. | Forensics | Both endpoints | Intentional | Do not remove |
| `scripts/pr22-settlement-recovery.mjs` | PR22 probe | Compare REST vs subgraph | Intentional | **New** |

---

## Deprecated endpoints (never use for production paths)

```
https://thegraph-1.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-data-feed-polygon
https://thegraph.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-data-feed-polygon  (404)
https://thegraph.com/hosted-service/subgraph/azuro-protocol/azuro-api-gnosis  (HTML)
```

**Client subgraph** (`azuro-api-polygon-v3`) — bet history only, NOT feed/oracle.

---

## Env flags (production target)

```env
AZURO_USE_REST_FEED=true
AZURO_USE_REST_ORACLE=true
AZURO_ENVIRONMENT=PolygonUSDT
AZURO_REST_API_BASE=https://api.onchainfeed.org/api/v1/public/market-manager
# AZURO_DATA_FEED_URL — legacy fallback ONLY when REST unreachable
```

---

## Regression protection

- `ORACLE_SOURCE` / `SETTLEMENT_SOURCE` logged on every settlement tick
- `AzuroLegacySubgraphProvider` marked `@deprecated` in code
- This audit + `docs/AZURO_ARCHITECTURE_CANON.md` are canonical references

---

## Remaining work (post-PR22)

1. Migrate `fetchAzuroGameDetail` to REST (frontend direct Azuro reads)
2. Update protocol UX copy from "subgraph" → "oracle feed"
3. Remove `AZURO_DATA_FEED_URL` from docker-compose once REST proven stable 7d
4. Admin curation debug route: add REST side-by-side compare
