# PR14 — Trading Readability + Markets Recovery

**Date:** 2026-05-18  
**Commit:** `fda97d9`  
**Vercel:** `dpl_DqoFu6M4gYnKzKBRrZXZsYPxBCyW`

## Summary

| Phase | Finding | Fix |
|-------|---------|-----|
| Typography | PR10–11 desk used 8–11px micro type vs PositionCard canon (lg/xl titles, 2xl PnL) | Restored scale in TraderPositionCard, TradingDeskHeader, pulse banner |
| `/markets` 500 | og-meta HTTP router at `/markets` returned `undefined` pass-through → Nitro 500 | `passThroughToClientSpa()` serves SPA index.html |
| AMM perception | Paper + Azuro quotes, not fill-driven CPMM | Documented in `PR14_AMM_FORENSICS.md` |
| Liquidity 18% vs 2% | Appeal-weighted allocation with 6–40% caps | By design |
| Banner fatigue | Onboarding shown for all non-completed users every sync | First-time only; hide active/returning traders; persistent demo dismiss |
| Oracle | Still Prematch post-FT | External blocker (unchanged) |

## Deploy

- Vercel: `dpl_DqoFu6M4gYnKzKBRrZXZsYPxBCyW` (predictio.live)
- VPS: not required (frontend + tRPC sync field only)

## Protocol health: **D+** (markets route restored; settlement still blocked)
