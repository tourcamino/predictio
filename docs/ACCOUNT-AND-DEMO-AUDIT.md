# Audit: My Account, demo dual-track, LP, allineamento cross-page

Obiettivo: mappa **runtime reale** (query, DB, localStorage) senza mega-refactor. Per allineamenti futuri: una feature alla volta, una source-of-truth alla volta.

Documenti correlati: `docs/DATA-MODEL-GLOSSARY.md`, `docs/PAPER_TEST_WALLET_RESET.md`.

---

## 0. Due modalità “demo” (concetto chiave)

| Modalità | Wallet | Source of truth prediction | Source of truth LP | `/account` |
|----------|--------|------------------------------|--------------------|------------|
| **Guest demo** | Disconnesso | `demoStorage` + `useDemoAccount` | **Non implementato** — nessuna riga `LiquidityPosition` locale | **Non accessibile**: redirect a home + modal connect |
| **Paper connesso** | Connesso | DB `Order` + `getUserPositions` | DB `LiquidityPosition` + procedure LP | **Sì** — tutte le tab usano `walletKey` + tRPC |

Conclusione UX: oggi l’“esperienza completa” **LP + account tabs** passa da **wallet connesso** (paper su DB). Estendere LP al **guest** richiede estendere `DemoState` e ogni superficie LP/portfolio (vedi §7).

---

## 1. Mappa completa `/account` (tab → dati)

| Tab | tRPC / dati | Stato | Note |
|-----|-------------|--------|------|
| **overview** | `getUserPositions` (enabled solo overview\|predictions), `getMarketSummaries`, `getPortfolioSummary`, `balance` da `useWallet` | **Production-ready (paper)** | Balance = store wallet (sincronizzato con DB dopo sync/deposit). Metriche da `getPortfolioSummary`. |
| **predictions** | Stesse query overview + tabella `Order` | **Production-ready (paper)** | Filtri All/Open/Resolved collegati a `Order.status` (open vs non-open). PnL riga usa YES/NO su `currentPrice` (DRAW edge come altrove). |
| **points** | `getPointsSummary` | **Production-ready** | Solo con wallet. |
| **wallet** | `balance`, `getPortfolioSummary` (totalInvested), link explorer | **Production-ready (paper)** | “Total portfolio value” = `balance + totalInvested` (non include esplicitamente valore mark-to-market LP aggregato in questa card — coerenza con come è calcolato `totalInvested` lato server). |
| **history** | `getTransactionHistory` | **Production-ready** | Ledger DB `Transaction`. |
| **stats** | `getPortfolioSummary` | **Parzialmente mock** | Sezione “Predictions by Sport” è **placeholder** (testo statico). Achievements: logica semplice derivata da summary (OK). |
| **followed-analysts** | `getFollowedAnalysts`, `unfollowAnalyst` | **Production-ready** | DB `AnalystFollow` / procedure social. |
| **referral-earnings** | `getReferralEarnings` | **Production-ready** | Dipende da dati referral reali / codice. |
| **payout-history** | Nessuna query inline | **Stub navigazione** | Solo bottone verso `/account/payouts`. |
| **analytics** | Nessuna query inline | **Stub navigazione** | Solo bottone verso `/account/analytics`. |
| **settings** | `localStorage` (`predictio_display_name`, `predictio_avatar`) | **Preferenze locali** | Non sono persistite server-side per l’utente paper. |

**Gate globale `/account`:** se `!isConnected` → redirect. Quindi **nessun** tab account per guest puro.

---

## 2. Quali tab sono “production-ready” (paper wallet)

- overview, predictions, points, wallet, history, followed-analysts, referral-earnings (se backend popolato).
- settings (preferenze locali, OK per MVP).

---

## 3. Quali usano ancora mock / legacy / stub

| Area | Tipo |
|------|------|
| Stats — “Predictions by Sport” | Mock / placeholder |
| payout-history / analytics tab in account | Stub (redirect) |
| Guest demo LP | **Assente** (non solo mock: manca il modello dati) |

---

## 4. Incoerenze / rischi noti

| Problema | Impatto |
|----------|---------|
| Guest non vede `/account` ma vede `/trading` + `/portfolio` in demo | **Dual UX**: per “full account” serve wallet. |
| `demoStorage` non ha LP | Portfolio LP in modalità guest mostra solo UI demo altrove; **add/remove LP** tipicamente richiede tRPC + DB. |
| `balance` (wallet store) vs `User.virtualBalance` | Di solito allineati dopo `syncUserAccount` / mutazioni; dopo operazioni verificare invalidazioni (già migliorate per `getUserPositions` open/all). |
| PnL / prezzo DRAW | Possibile divergenza tabella account vs adapter trading (noto). |
| “Portfolio value” su wallet tab | Formula semplice; potrebbe non includere componenti LP se il summary non le aggrega nella stessa metrica — **verificare** `getPortfolioSummary` server se serve parità con `/portfolio`. |

---

## 5. Fix minimi consigliati (priorità)

1. **Documentare** (fatto qui) il dual-track guest vs paper; onboarding prodotto opzionale.  
2. ~~**Collegare i filtri** Open/Resolved su tab predictions~~ **Fatto** (filtro su `Order.status`).  
3. **Sostituire placeholder** “Predictions by Sport” con query aggregata esistente o nascondere finché non pronta.  
4. **Allineare invalidazioni** dopo operazioni LP (come fatto per trading) se si trovano cache `getUserLPPositions` / summary stale.  
5. **Guest LP (epic incrementale)**: vedere §7 — non mescolare dati fake server; tenere tutto in `demoStorage` o forzare paper wallet per LP.

---

## 6. Architettura target (layer mentali, senza rename)

| Layer | Ruolo |
|-------|--------|
| **Account overview** | Aggregazione UI: saldo + summary + link alle tab. |
| **Predictions** | Vista tabellare su `Order` (+ summaries). |
| **Wallet** | Saldo spendibile + investito in prediction (da summary) + azioni deposit/withdraw. |
| **History** | `Transaction` ledger. |
| **Stats / analytics** | Metriche derivate da summary / analytics route dedicate. |
| **Followed analysts** | Grafo sociale DB. |
| **Referral / payouts** | Strato affiliate / payout pages. |
| **Settings** | Preferenze client (fino a persistenza server dedicata). |

---

## 7. Allineare trading · portfolio · account · LP · copy · analytics (senza mega rewrite)

**Oggi (coerente):**  
Con wallet: `Order` ↔ `getUserPositions`; LP ↔ `LiquidityPosition` + `getUserLPPositions`; copy ↔ `CopyRelationship` + procedure; punti/notifiche come da invalidazioni.

**Guest demo:**  
Estendere **solo lato client** in ordine:

1. `DemoState` + `demoStorage`: aggiungere es. `lpPositions: DemoLiquidityPosition[]`, `lpTradeHistory?`.  
2. `useDemoAccount`: mutazioni `executeDemoAddLiquidity` / `executeDemoRemoveLiquidity` (stesso pattern di `executeDemoTrade`) che aggiornano balance locale e array LP.  
3. Componenti LP (`AddLiquidityModal`, `WithdrawLPModal`, …): ramo `isDemoActive && !isConnected` che chiama hook demo invece di tRPC.  
4. `/portfolio`: sezione LP già ha ramo demo parziale — **unificare** lettura da `useDemoAccount` invece di duplicare calcoli.  
5. **Non** popolare DB server con LP “fake” per guest — evita contaminazione e mantiene “solo locale” chiaro.

**Analytics / account sub-pages:**  
Riutilizzare le stesse query del route dedicato o passare `walletKey` e riusare componenti — refactor modulare quando stabile.

---

## 8. Checklist verifica cross-page (paper wallet)

- [ ] Trade prediction → compare su `/trading`, `/account?tab=predictions`, `/portfolio`.  
- [ ] LP add/remove → `getUserLPPositions`, portfolio LP card, balance wallet.  
- [ ] Copy follow/unfollow → account tab + pagina copy.  
- [ ] History → `getTransactionHistory` dopo ogni mutazione.  
- [ ] Hard refresh su ogni route.

---

## 9. Fase 1 “Demo LP completo” — stato lavoro

| Richiesta | Stato codice oggi |
|-----------|-------------------|
| Guest LP add/remove + posizioni + returns in portfolio/account | **Non implementato** — richiede estensione `demoStorage` + wiring UI (§7). |
| Paper wallet LP | **Già** runtime reale DB (stesso stack produzione paper). |

Raccomandazione operativa immediata: per QA “completo”, usare **wallet test paper** + script reset (`docs/PAPER_TEST_WALLET_RESET.md`). Per guest pura, pianificare epic §7 per sprint dedicato.
