# Predictio — Testnet Readiness Audit (PR5)

**Date:** 2026-05-17  
**Scope:** Protocol-first hardening after PR1–PR4. No mock trading data introduced.

## Score: **62 / 100 — NOT READY** for public testnet

| Area | Status | Notes |
|------|--------|-------|
| Runtime ownership (Express canonical) | **Ready** | Wallet-critical reads on Express in production config |
| Canonical DB (Postgres VPS) | **Ready** | Paper orders, ledger, markets in Prisma |
| Express vs tRPC | **Partial** | Positions/portfolio Express; diagnostics & timeline via tRPC |
| Settlement pipeline | **Partial** | Cron + `checkResolvedMarkets` work; blocked on Azuro Prematch lag |
| Oracle reliability | **Not ready** | Prematch after kickoff, `conditions[0]` risk, subgraph gaps |
| Wallet reliability | **Ready** | Connect/sync decoupled; ledger stable |
| Lifecycle visibility | **Improved** | Settlement timeline + diagnostics UI (PR5) |
| Protocol coherence | **Improved** | Surface wayfinder + activity timeline from DB |
| Stale cache risks | **Mitigated** | Shorter staleTime, refetch on focus/reconnect, post-trade refetch |
| Unresolved blockers | See below | Oracle lag, WS trade feed optional |

## PR5 deliverables

### Settlement timeline (FASE 1)
- `SettlementTimelinePanel` + `deriveSettlementTimeline`
- `SettlementTimelineSection` (diagnostic + timeline)
- Surfaces: `/markets/$id`, `PositionDetail`, `/trading` (mobile selected position)

### Protocol activity (FASE 2)
- `getMarketProtocolTimeline` — real orders + ledger rows from Postgres
- `ProtocolActivityTimeline` — no synthetic tape

### Position visibility (FASE 3)
- `PROTOCOL_CACHE` shared stale/refetch policy
- `useUserPositions`: refetchOnWindowFocus, refetchOnReconnect, 8s stale
- `refetchCanonicalPositionReads` after trade/close

### Oracle forensics (FASE 4)
- `fetchAzuroGameForSettlement` + `getMarketSettlementDiagnostic`
- `SettlementDiagnosticBanner` with reason codes (ORACLE_PREMATCH, GAME_NOT_IN_SUBGRAPH, etc.)
- Existing `classifyAzuroGameForSettlement` unchanged for settlement math

## Remaining blockers (testnet)

1. **Azuro Prematch after event end** — settlement tick skips until Resolved/Finished
2. **Game not in subgraph** — mapping `azuro-{gameId}` must match indexer
3. **conditions[0] assumption** — multi-condition markets may need index selection
4. **WebSocket trade feed** — `RecentTradesFeed` empty when WS offline (by design, not mock)
5. **End-to-end payout proof** — requires live oracle resolution on test wallet

## Architectural risks

- **Dual read paths** (Express + tRPC) — must keep invalidation predicates in sync
- **Oracle external dependency** — paper settlement cannot beat Azuro publication lag
- **Zustand trading store** — display-only; canonical rows always from `getUserPositions`

## Recommended before testnet launch

1. Run settlement tick on VPS after each major match window; inspect `settlement_diagnostic` logs
2. Wallet E2E: place → visible in &lt;20s → close → settle when oracle resolves
3. Monitor `ORACLE_PREMATCH` rate in diagnostics API
4. Football-only catalog audit on production API responses
