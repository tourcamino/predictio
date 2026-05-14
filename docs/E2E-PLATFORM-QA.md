# QA end-to-end — lifecycle utente Predictio (paper / test)

**Scopo:** checklist manuale + mappa runtime (source of truth, query, mutazioni, invalidazioni) e **problemi noti da codice** (nessun refactor in questo documento).

**Prerequisiti:** wallet test in allowlist, `npm run paper:reset-wallet -- <wallet>`, hard refresh browser, `DATABASE_URL` verso DB di test.

---

## Flusso di test (manuale)

### Fase 1 — Account clean

1. Eseguire reset paper (`docs/PAPER_TEST_WALLET_RESET.md`).
2. Connettere wallet test → `/trading` lista vuota, `/portfolio` senza posizioni, `/account` overview coerente.
3. Verificare `getTransactionHistory` vuota o solo eventi attesi.

### Fase 2 — Paper trading (prediction)

1. Aprire mercato → acquisto (`placePrediction` via `TradingBox` / `BetBox` / `PredictionForm`).
2. Verificare: `/trading` (`getUserPositions` **open**), `/account?tab=predictions`, `/portfolio`, saldo header.
3. Chiudere posizione (`closePosition` da `TradingBox` o `PositionDetail`).
4. Verificare: PnL, saldo, history (`Transaction`), stats (`getPortfolioSummary`), punti (se abilitati).

**Query tipiche:** `getUserPositions` (open/all), `getMarketSummaries`, `getPortfolioSummary`, `getTransactionHistory`, `getPointsSummary`.  
**Mutazioni:** `placePrediction`, `closePosition`.  
**Invalidazioni:** già allineate per `getUserPositions` open+all e summary su buy/sell/close (vedi `TradingBox`, `PositionDetail`, `BetBox`, `PredictionForm`).

### Fase 3 — LP

1. Aprire liquidity UI → `provideLiquidity` (`AddLiquidityModal`, `ProtocolVaultDepositModal`).
2. Ritiro / claim fee → `withdrawLiquidity`, `claimLPFees` (`WithdrawLPModal`, `ProtocolVaultWithdrawModal`, `ManageLPModal`, portfolio “claim all”).
3. Verificare: `getUserLPPositions`, portfolio LP section, saldo header, `getTransactionHistory` — **senza F5** dopo ogni azione.

**Server:** `User.virtualBalance` aggiornato in `provideLiquidity` / `withdrawLiquidity` / `claimLPFees`; risposte con `newBalance`.  
**Client:** `invalidateWalletPortfolioLpQueries` dopo mutazioni LP (stesso spirito di `TradingBox`).

### Fase 4 — Social / copy

1. `/analysts/$id` → follow (`followAnalyst` / `unfollowAnalyst`) — invalidazioni locali su `isFollowingAnalyst` + `getAnalystDetail`.
2. Start/stop copy (`CopyPortfolioModal` → `startCopyTrading` / `stopCopyTrading`) — oggi `queryClient.invalidateQueries()` **senza filtro** su successo (invalida tutta la cache React Query: verificare performance e possibili race UI).
3. Verificare notifiche (`getNotifications`) se procedure le creano.

### Fase 5 — Account tabs

Percorrere: overview, predictions, wallet, history, stats, points, followed-analysts, referral, payout (link), analytics (link), settings.

---

## Mappa runtime per area funzionale

| Area | Source of truth | Query principali | Mutazioni | Invalidazioni note |
|------|-----------------|------------------|-----------|---------------------|
| Prediction open/closed | DB `Order` | `getUserPositions`, `getMarketSummaries` | `placePrediction`, `closePosition` | open + all + summary (+ points/notifications dove implementato) |
| Saldo paper spendibile | DB `User.virtualBalance` (+ wallet store) | `syncUserAccount` / wallet | `placePrediction`, `closePosition`, deposit/withdraw | aggiornamento `updateBalance` su success |
| Portfolio summary / stats | DB `Order` + `Transaction` + user rewards | `getPortfolioSummary` | — | dopo trade; vedere gap LP sotto |
| LP positions | DB `LiquidityPosition` | `getUserLPPositions`, `getMarketAPYHistory` | `provideLiquidity`, `withdrawLiquidity`, `claimLPFees` | Modali LP + portfolio: `invalidateWalletPortfolioLpQueries` |
| Transaction ledger | DB `Transaction` | `getTransactionHistory` | molte mutazioni creano `Transaction` | rischio stale se non invalidato |
| Follow analyst | DB `AnalystFollow` | `isFollowingAnalyst`, `getFollowedAnalysts`, `getAnalystDetail` | `followAnalyst`, `unfollowAnalyst` | invalidate su analyst page |
| Copy relationship | DB `CopyRelationship` | `getCopyRelationship` | `startCopyTrading`, `stopCopyTrading` | `invalidateQueries()` globale in `CopyPortfolioModal` / `CopyingAnalystsSection` |
| Leaderboard trader | DB / derive | `getLeaderboard` | — | dipende da job/aggiornamenti; verificare dopo trade |
| Points | DB points tables | `getPointsSummary` | varie (`creditWalletPoints`) | pattern `invalidateWalletPointsSummary` |

---

## Problemi individuati (da codice) — formato richiesto

| # | Severity | Classificazione | File / area | Causa | Fix minimo consigliato |
|---|----------|-----------------|-------------|-------|-------------------------|
| ~~1–3,7~~ | ~~High/Med~~ | **Risolto (LP)** | `provideLiquidity.ts`, `withdrawLiquidity.ts`, `claimLPFees.ts`, modali LP, `invalidateWalletPortfolioLpQueries.ts` | Accounting LP + invalidazioni cache | Già implementato: saldo server + `newBalance` + invalidazioni centralizzate. |
| 4 | **Medium** | partially mocked / semantic | `getPortfolioSummary.ts`, tab stats account | `totalDeposited` / `totalWithdrawn` sommano **tutti** i `Transaction` tipo `deposit` / `withdrawal` — includono movimenti **LP** (`metadata.type` lp_*), non solo wallet funding. | Filtrare in summary i deposit “wallet” vs “lp” **oppure** etichettare chiaramente in UI “include LP movements”. |
| 5 | **Medium** | legacy prototype | `src/routes/trader/$wallet.index.tsx` | `SimpleCopyModal`: TODO, solo `toast` — **nessuna** chiamata `startCopyTrading`. Lista copier `mockCopiers`. | Collegare a `startCopyTrading` + wallet gate come `CopyPortfolioModal`; rimuovere mock o sostituire con query. |
| 6 | **Low** | UX / disconnected | `account/index.tsx` tab stats | Esiste `sportBreakdown` in `getPortfolioSummary` ma la UI mostra ancora placeholder testuale. | Render minimale della lista da `summaryQuery.data.sportBreakdown` (o nascondere sezione). |
| 8 | **Info** | production-ready | `analysts/$id`, `FollowedAnalystsTab`, `ReferralDashboardTab` | Flussi follow/referral su tRPC con invalidate mirate (o globale in copy modal). | Nessun fix obbligatorio; solo verificare E2E con wallet reale. |

---

## Classificazione sintetica per superficie

| Superficie | Stato |
|------------|--------|
| Trading prediction (connesso) | **production-ready** (post allineamento `getUserPositions`) |
| Account (connesso) | **production-ready** salvo placeholder stats e link-only tab |
| LP modali + saldo DB | **production-ready** lato accounting/cache; validare in fase “real user” sotto |
| `/trader/$wallet` copy veloce | **legacy prototype** |
| Guest demo LP | **disconnected** (assente; vedi `docs/ACCOUNT-AND-DEMO-AUDIT.md`) |

---

## Verifica post-fix LP (regressione rapida)

- [x] Dopo `provideLiquidity` / `withdrawLiquidity` / `claimLPFees`: `User.virtualBalance` coerente; UI usa `newBalance` + invalidazioni.
- [ ] `getPortfolioSummary` “deposited/withdrawn” semanticamente chiaro rispetto a LP (#4 ancora aperto).
- [ ] Stress: più LP + trade misti senza F5 (vedi fase 6).

---

## Fase 6 — Real user behavior validation (runtime)

**Scopo:** usare la piattaforma come un utente reale (sessioni lunghe, navigazione multi-pagina, refresh, mobile) per trovare **drift runtime**, **stale UI**, **incoerenze analytics/social**, **notifiche duplicate**, **PnL errati** — non refactor teorici.

**Strumenti consigliati:** DevTools → Network (tRPC), Application → storage; React Query Devtools se abilitato; due tab stesso wallet per race; viewport mobile (375px).

### Protocollo sessione (checklist comportamento)

1. **Sessione lunga (30–60+ min):** lasciare aperta `/trading` o `/portfolio`, tornare indietro; osservare staleness numeri vs header saldo.
2. **Multi-page:** `/trading` → trade → `/portfolio` → `/account?tab=history` → `/analysts` → `/copy` → indietro; ogni salto confrontare saldo, posizioni aperte, LP, history.
3. **Disconnect/reconnect:** disconnettere wallet, riconnettere (stesso o altro account test); verificare che query `enabled` si resettino e niente “flash” di dati precedenti.
4. **Trade consecutivi:** 3–5 `placePrediction` rapidi sullo stesso mercato o mercati diversi; controllare `getUserPositions` open, fee, `newBalance`.
5. **LP multipli:** deposito → claim fee → withdraw parziale → add ancora; incrociare con un trade nel mezzo.
6. **Copy trading:** da `CopyPortfolioModal` start copy → far eseguire trade all’analyst (o simulare ambiente dove il mirror scatta in `placePrediction`) → verificare saldo copier, history, notifiche; stop copy; ripetere.
7. **Follow/unfollow:** `/analysts/$id` toggle; tab followed su account; coerenza `getFollowedAnalysts` / `isFollowingAnalyst`.
8. **Leaderboard:** dopo movimenti di volume/PnL, refresh e confronto ranking (se job/async: aspettare e riprovare).
9. **Refresh continui:** F5 aggressivo su `/portfolio` e `/account` durante stato “pending” di una mutazione (se riproducibile).
10. **Mobile:** stessi flussi con viewport stretto; scroll modali LP/copy; tastiera su input amount.

### Aree prioritarie (cosa guardare)

| Area | Cosa può andare storto | SoT / query / mutazioni da citare nei bug |
|------|------------------------|-------------------------------------------|
| Copy runtime | Copier non aggiornato, doppio mirror, saldo sbagliato | DB `CopyRelationship`, `Order`, `User`; `placePrediction` (blocco copy); `startCopyTrading` / `stopCopyTrading` |
| Leaderboard | Rank stale vs ultimo trade | `getLeaderboard` + come/when si aggiorna il dato |
| Analytics | Grafici vs summary tab | `getPortfolioSummary`, `getPortfolioPerformanceHistory`, aggregazioni client |
| Transaction history | Righe mancanti o duplicate | `getTransactionHistory`, `Transaction` types/metadata |
| Notifications | Toast ok ma badge stale o duplicati | `getNotifications`, invalidazioni `invalidateWalletNotifications` |
| Saldo | Header ≠ portfolio dopo navigazione | `syncUserAccount`, `updateBalance`, `virtualBalance` |
| Portfolio aggregation | PnL / totali incoerenti con ordini | `getPortfolioSummary`, `getUserPositions` |
| Settlement | Mercato resolved: posizioni chiuse, payout, UI | `closePosition`, procedure risoluzione mercato, `getUserPositions` status |

### Template segnalazione bug (copiare per ogni issue)

```text
Titolo:
Passi per riprodurre:
1.
2.

Comportamento atteso:
Comportamento osservato:

Source of truth coinvolta: (es. DB User.virtualBalance / Order / Transaction / cache header)
Query coinvolte: (es. getPortfolioSummary, getUserPositions open)
Mutazioni coinvolte: (es. placePrediction, startCopyTrading)
Cache / stato client: (es. React Query key, useWalletStore, invalidateQueries globale)

Severity: [cosmetic | UX | stale runtime | accounting risk | production blocker]

Fix minimo consigliato: (1–3 frasi, no mega-architettura)
```

### Smoke automatico (limiti)

`npm run smoke:e2e` — HTTP su health/auth/copy mismatch; **non** sostituisce sessione utente reale (niente browser, niente React Query).

---

## Riferimenti

- Reset test: `docs/PAPER_TEST_WALLET_RESET.md`
- Account / demo dual-track: `docs/ACCOUNT-AND-DEMO-AUDIT.md`
- Glossario entità: `docs/DATA-MODEL-GLOSSARY.md`
