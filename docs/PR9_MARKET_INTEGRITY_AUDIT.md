# PR9 — Market Integrity Audit

**Audited:** 2026-05-17 · Production API + Azuro Polygon data-feed

## Scoring system

| Grade | Meaning | Action |
|-------|---------|--------|
| **A** | Oracle Resolved/Finished, valid condition | Settle on next tick |
| **B** | Prematch, game on subgraph | Wait oracle |
| **C** | Prematch long after catalog close | Monitor / retire if stale |
| **D** | GAME_NOT_IN_SUBGRAPH | Retire market, refund path review |
| **F** | NON_AZURO open order | Legacy row — retire |

## Sample wallet (`0x665cee…`)

| Category | Count |
|----------|-------|
| Prematch (B) | 8 |
| Settlement eligible (A) | 0 |
| Subgraph orphan (D) | 0 (with current feed) |

## Global queue (VPS logs)

- **13** open markets, **23** open orders
- **1** non-Azuro market (`cmotw7xw…`)
- Historical cron lines showed subgraph gaps before data-feed env fix

## Retirement candidates

1. `cmotw7xw60000pl0hieqht8ix` — non-Azuro prefix
2. Any market with persistent `GAME_NOT_IN_SUBGRAPH` after feed fix
3. Open orders on games never returning from indexer (archived fixtures)

## Healthy markets list

- Active curated catalog: **43** football open (VPS boot)
- No open-order market reached Azuro terminal state in PR9 sample

## Unsupported / stale

- All sample wallet fixtures: Azuro still **Prematch** post match (external lag)
- Cron permission errors may delay ticks — fixed in PR9 repo (`chmod +x`)

## Script

```bash
node scripts/pr9-market-integrity-audit.mjs [wallet]
```
