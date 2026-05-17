# Predictio — Testnet Readiness Audit (PR9 update)

## Readiness scores

| Tier | Score | Verdict |
|------|-------|---------|
| Internal alpha | 78 / 100 | Engine ready; payout proof pending |
| **Closed beta** | **80 / 100** | Credible with oracle-lag UX + alive pulse |
| **Public testnet** | **62 / 100** | **NOT READY** — no E2E payout proof |
| Public mainnet-prep | 45 / 100 | Blocked on oracle SLA + on-chain path |

**Overall protocol score: 80 / 100** (closed beta tier)

## Payout proof status

| Check | Status |
|-------|--------|
| Engine idempotent settlement | Ready |
| Condition selection PR6+ | Verified |
| Production E2E payout | **NOT PROVEN** — see `docs/PR9_PAYOUT_PROOF.md` |
| Blocker | Azuro `Prematch` on all sampled open markets |

## PR9 deliverables

| Area | Deliverable |
|------|-------------|
| Payout proof doc | `docs/PR9_PAYOUT_PROOF.md` (honest NOT ACHIEVED) |
| Market integrity | `docs/PR9_MARKET_INTEGRITY_AUDIT.md` + script |
| Oracle lag UX | `OracleLagStatusPanel`, `deriveOracleLagStatus` |
| Protocol alive | `ProtocolAliveStrip`, `getProtocolPulseSnapshot` |
| Ops | `chmod +x` settlement tick in deploy script |
| Cache | Online reconnect refetch, pulse invalidation |
| Lifecycle | Account “Trading” tab → `/trading` redirect (existing) |

## Dimension scores

| Dimension | Score | Status |
|-----------|-------|--------|
| UI / lifecycle clarity | 90 | PR9 |
| Oracle trust / transparency | 82 | PR9 lag panel |
| Execution integrity | 75 | Real pulse only |
| Settlement engine | 80 | Ready, unproven E2E |
| Oracle external dependency | 35 | **Blocker** |
| Ops (cron executable) | 70 | PR9 chmod fix |
| Market integrity | 65 | Orphan/prematch catalog |

## Public testnet gates

| Gate | Ready? |
|------|--------|
| Invite-only closed beta | **Yes** |
| Public testnet launch | **No** — need 1+ documented payout |
| Grants / rewards | **No** |

## Canonical runtime

Unchanged: Express positions, VPS settlement cron, tRPC diagnostics + PR9 `getProtocolPulseSnapshot`.
