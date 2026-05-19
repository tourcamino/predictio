# Azuro Architecture Canon

**Last updated:** 2026-05-19 (PR22)  
**Authority:** This document is the single source of truth for which Azuro endpoints Predictio uses and why.

---

## Source of truth by function

| Function | Canonical source | Env flags | Deprecated? |
|----------|------------------|-----------|-------------|
| Inventory ingest | REST `market-manager/games-by-filters` | `AZURO_USE_REST_FEED=true` | — |
| Market discovery | REST `games-by-filters` | `AZURO_ENVIRONMENT=PolygonUSDT` | — |
| Live fixtures | REST `gameState=Live` | same | — |
| Odds (ingest) | REST `conditions-by-game-ids` | same | — |
| Quotes / metadata | REST `games-by-ids` + conditions batch | same | — |
| Settlement polling | REST `games-by-ids` + `conditions-by-game-ids` | `AZURO_USE_REST_ORACLE=true` | — |
| Oracle terminal state | REST game `state` + condition `Resolved` | same | — |
| `wonOutcomeIds` | REST conditions (Resolved) | same | — |
| Condition states | REST `conditions-by-game-ids` | same | — |
| Terminal lifecycle | REST `Finished` / `Resolved` / `Canceled` | same | — |
| Bet history | Client subgraph `azuro-api-polygon-v3` | `AZURO_API_URL` | Feed data NOT here |

---

## DO NOT USE (deprecated / stale)

| Endpoint | Why |
|----------|-----|
| `thegraph-1.onchainfeed.org/.../azuro-data-feed-polygon` | **Deprecated** by Azuro; indexer ~9d lag; missing new gameIds |
| `thegraph.onchainfeed.org/.../azuro-data-feed-polygon` | Deployment does not exist |
| `thegraph.com/hosted-service/.../azuro-api-gnosis` | Returns HTML; legacy Gnosis |
| Client subgraph for feed/odds | V3 moved feed off client graph |
| `game(id:)` GraphQL in marketStatusUpdater | Stale; replaced by REST |

**Fallback only:** deprecated subgraph when `AZURO_USE_REST_ORACLE=false` or REST unreachable.

---

## Architecture layers

```
┌─────────────────────────────────────────────────────────┐
│  INVENTORY LAYER (REST market-manager)                  │
│  games-by-filters → conditions-by-game-ids              │
│  azuroMarketManagerApi.ts / fetchAzuroInventoryGames    │
└─────────────────────────────────────────────────────────┘
                          ↓ persist
┌─────────────────────────────────────────────────────────┐
│  PROTOCOL REGISTRY (Predictio DB curated_events)        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  ORACLE LAYER (REST — separate from inventory)          │
│  azuroOracleAdapter → AzuroRestOracleProvider           │
│  games-by-ids + conditions-by-game-ids (Resolved)     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  SETTLEMENT (runGlobalPaperSettlementTick)              │
│  checkResolvedMarkets → paperSettlementEngine           │
└─────────────────────────────────────────────────────────┘
```

**Never conflate inventory source with oracle source again.**

---

## Code map

| Module | Role |
|--------|------|
| `backend/src/services/azuroMarketManagerApi.ts` | REST inventory + oracle game lookup |
| `backend/src/services/azuroCuratorGraphql.ts` | Legacy subgraph ingest (fallback) |
| `src/lib/oracle/azuroOracleAdapter.ts` | Oracle provider selection |
| `src/lib/oracle/azuroRestOracleProvider.ts` | REST settlement poll |
| `src/lib/oracle/azuroLegacySubgraphProvider.ts` | Deprecated fallback |
| `src/services/azuro.ts` | `checkResolvedMarkets` (uses adapter) |

---

## Required logs (regression protection)

| Tag | When |
|-----|------|
| `INVENTORY_SOURCE` / `azuro_rest_fetch` | Boot + ingest |
| `ORACLE_SOURCE` | Every oracle poll |
| `SETTLEMENT_SOURCE` | Settlement tick start |
| `STALE_AGE` | Oracle snapshot (kickoff lag) |

---

## Environment (production)

```env
AZURO_USE_REST_FEED=true
AZURO_USE_REST_ORACLE=true
AZURO_ENVIRONMENT=PolygonUSDT
AZURO_REST_API_BASE=https://api.onchainfeed.org/api/v1/public/market-manager
# Legacy — fallback only, do not use for new code:
# AZURO_DATA_FEED_URL=https://thegraph-1.onchainfeed.org/.../azuro-data-feed-polygon
```

---

## UI lifecycle vocabulary

| UI state | Meaning |
|----------|---------|
| Live | Market open for trading |
| FT | Real match finished (kickoff passed) |
| Awaiting oracle | FT but payout not yet applied |
| Resolved | Oracle confirmed winner |
| Paid | Ledger credited / position closed |

See `src/lib/trading/traderPositionDesk.ts` for phase mapping.
