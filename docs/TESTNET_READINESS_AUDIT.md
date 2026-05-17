# Predictio — Testnet Readiness Audit (PR7 update)

## Readiness scores

| Tier | Score | Verdict |
|------|-------|---------|
| Internal alpha | 72 / 100 | Paper engine + UI diagnostics sufficient |
| **Closed beta** | **74 / 100** | **Acceptable** with oracle-delay copy + ops forensics |
| Public testnet | 58 / 100 | **NOT READY** — external oracle + E2E payout proof |

**Overall protocol score: 74 / 100** (up from 68 after PR6)

Closed beta with real wallets: **acceptable** when users see oracle trust layer and Prematch is explained as Azuro lag, not a bug.

## PR7 deliverables

| Area | Deliverable |
|------|-------------|
| Oracle trust | `OracleTrustLayer`, `oracleTrustLayer.ts`, enriched diagnostic copy |
| Payout confidence | `settlementConfidenceScore.ts` (HIGH / MEDIUM / LOW, deterministic) |
| Forensics UI | `/protocol/settlement` + `getSettlementForensicsDashboard` |
| Observability | `logSettlementMetric`, cron heartbeat `BotHeartbeat` id `settlement-cron` |
| VPS fix | `AZURO_DATA_FEED_URL` on host tick; deprecated `AZURO_GRAPHQL_URL` removed |
| Football purity | Forensics `footballAudit` block on open-market sample |

## Dimension scores

| Dimension | Score | Status |
|-----------|-------|--------|
| UI / lifecycle clarity | 88 | Ready |
| Oracle trust / transparency | 78 | PR7 |
| Wallet / Express runtime | 80 | Ready |
| Settlement engine (idempotent ledger) | 78 | Ready |
| Oracle condition mapping | 72 | PR6 moneyline pick |
| Oracle external dependency | 38 | **Blocker** |
| Ops (cron, VPS, forensics) | 70 | PR7 improved |

## Oracle trustworthiness

- Users see: oracle state, last sync, last cron tick, estimated lag, confidence tier
- Prematch after full-time: explicit copy — *finished match, Azuro not finalized yet*
- **VPS finding (PR7):** stale `AZURO_GRAPHQL_URL` (dead gnosis subgraph) caused false `GAME_NOT_IN_SUBGRAPH` — fixed to Polygon data-feed

## Payout observability

- Structured logs: `settlement_tick_*`, `settlement_attempt`, `payout_execution_time`, `settlement_diagnostic`
- Forensics route: queue, reason counts, failing markets, payouts 24h
- Cron heartbeat persisted for UI `lastSettlementTickAt`

## Settlement transparency

- Per-market: condition index/count, selection reason, skip reason code
- Global health bar + link to forensics
- No manual resolve / synthetic payout paths in PR7

## Operational tooling

- `/protocol/settlement` (internal)
- `scripts/vps-run-settlement-tick.sh` exports data-feed URL
- `getSettlementForensicsDashboard` tRPC

## Closed beta confidence

| Question | Answer |
|----------|--------|
| Is position live? | Lifecycle pipeline + order status |
| Payout pending? | Timeline + ORACLE_PREMATCH trust copy |
| Oracle delayed? | `estimatedOracleLagMinutes` when applicable |
| Settlement queued? | Open orders + cron cadence |
| Market valid? | Condition index + football audit |
| Protocol healthy? | Health bar + forensics |

## Unresolved blockers (next after PR7)

1. **Azuro Prematch** after real-world full-time — primary payout blocker
2. **E2E payout proof** — zero terminal settlements on sample wallet until oracle Resolved
3. Archived / missing subgraph games — retire from catalog
4. Paper-only — no on-chain settlement

## Testnet gates

| Gate | Ready? |
|------|--------|
| Invite-only closed beta | **Yes** |
| Public testnet | **No** |
| Protocol grants / rewards | **No** until post-Resolved payout E2E |

## Canonical runtime

- Positions: Express `getUserPositions`
- Settlement: VPS cron + `checkResolvedMarkets` (Polygon data-feed)
- Diagnostics: `getMarketSettlementDiagnostic`, `getSettlementProtocolHealth`, `getSettlementForensicsDashboard`
