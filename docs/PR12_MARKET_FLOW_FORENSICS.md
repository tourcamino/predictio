# PR12 — Market flow & protocol breadth forensics

**Date:** 2026-05-18  
**Scope:** “The market is alive” layer on top of PR10/PR11 trader terminal  
**Constraints:** no fake trades, volume, liquidity, tape, or RNG

---

## 1. Root cause — protocol felt dead

| Surface | Finding |
|---------|---------|
| Homepage | Hero + static grids; no live fills or pool utilization |
| `/markets` | Search-first; curated lanes hidden when `canonicalCuratedCatalog` |
| `/trading` | PR11 desk pulse = **your book only**, not global market |
| Protocol strip | `ProtocolAliveStrip` buried in ops collapsible on trading |
| Discovery | Sections existed client-side but no unified “discovery terminal” |
| Liquidity | LP/treasury opaque; users didn’t see open interest vs pool |

---

## 2. Discovery findings

**`buildMarketDiscoveryLanes`** (client, catalog quotes):

- Live now · Trending volume · Most active · Nearing resolution  
- High disagreement (near 50¢) · Oracle pending · Wide conviction spread  

**`MarketDiscoveryTerminal`**: horizontal lanes on `/markets` when filters inactive.

---

## 3. Liquidity clarity

**`LiquidityClarityStrip`** from `getProtocolMarketBreadth`:

- Protocol pool (`totalLiquidity` canonical)  
- Open interest (sum open order `amount`)  
- Utilization % (OI / pool)  
- Active catalog slots  

---

## 4. Protocol pulse

**`getProtocolMarketBreadth`** (server, DB):

- Fills 24h (count), wallets 24h, payouts 24h  
- Open orders / markets, oracle queue, live DB markets, ending soon  
- `biggestMovers` = top markets by real fill count 24h  
- `recentFills` / `recentSettlements` for flow feed  

**`GlobalProtocolMarketPulse`**: homepage, markets, trading (compact).

---

## 5. Homepage

- Strip below hero: compact pulse + protocol flow feed  
- Retains `LiveMarkets` for football catalog cards  

---

## 6. Mobile

- Pulse grid 2×2 on small screens  
- Discovery lanes horizontal scroll  
- Flow feed single column  

---

## 7. Remaining dead-feel areas

1. No global WebSocket tape (by design — no fake tape)  
2. Movers need DB fill history; thin markets show low counts honestly  
3. Catalog without `priceHistory` → “probability movers” = conviction spread, not time series  
4. Oracle prematch still blocks “market resolved” narrative  

---

## 8. Premium consistency

- Bloomberg-style mono pulse, cyan/green accents  
- Not sportsbook/casino; discovery copy explains data source  

---

## 9–12. Deploy

| Item | Value |
|------|--------|
| **Commit SHA** | `65b5cd2` |
| **Vercel deploy ID** | `dpl_*` (production build triggered on push) |
| **Backend** | Redeploy API host if tRPC is not bundled with Vercel (new `getProtocolMarketBreadth` procedure) |

### Regressions avoided

- PR10/11 trading hierarchy unchanged  
- No synthetic market data added  
- Existing `ProtocolAliveStrip` in ops panel preserved  

### Blockers

- Azuro prematch / E2E payout (unchanged)  
- Low fill volume → pulse numbers may look quiet (truthful)
