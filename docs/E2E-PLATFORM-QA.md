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

1. Aprire liquidity UI → `provideLiquidity` (`AddLiquidityModal`).
2. Ritiro / claim fee → `withdrawLiquidity`, `claimLPFees`.
3. Verificare: `getUserLPPositions`, portfolio LP section, saldo, history.

### Fase 4 — Social / copy

1. `/analysts/$id` → follow (`followAnalyst` / `unfollowAnalyst`) — invalidazioni locali su `isFollowingAnalyst` + `getAnalystDetail`.
2. Start/stop copy (`CopyPortfolioModal` → `startCopyTrading` / `stopCopyTrading`) — `invalidateQueries()` globale su successo.
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
| LP positions | DB `LiquidityPosition` | `getUserLPPositions`, `getMarketAPYHistory` | `provideLiquidity`, `withdrawLiquidity`, `claimLPFees` | **Nessuna invalidazione esplicita** nei modali LP analizzati |
| Transaction ledger | DB `Transaction` | `getTransactionHistory` | molte mutazioni creano `Transaction` | rischio stale se non invalidato |
| Follow analyst | DB `AnalystFollow` | `isFollowingAnalyst`, `getFollowedAnalysts`, `getAnalystDetail` | `followAnalyst`, `unfollowAnalyst` | invalidate su analyst page |
| Copy relationship | DB `CopyRelationship` | `getCopyRelationship` | `startCopyTrading`, `stopCopyTrading` | invalidate globale in modal |
| Leaderboard trader | DB / derive | `getLeaderboard` | — | dipende da job/aggiornamenti; verificare dopo trade |
| Points | DB points tables | `getPointsSummary` | varie (`creditWalletPoints`) | pattern `invalidateWalletPointsSummary` |

---

## Problemi individuati (da codice) — formato richiesto

| # | Severity | Classificazione | File / area | Causa | Fix minimo consigliato |
|---|----------|-----------------|-------------|-------|-------------------------|
| 1 | **High** | stale / inconsistent | `src/server/trpc/procedures/provideLiquidity.ts`, `AddLiquidityModal.tsx` | La mutazione **non** aggiorna `User.virtualBalance`; il modal fa solo `updateBalance(balance - amount)` lato client. | In `provideLiquidity`: decrementare `virtualBalance` (e opzionalmente restituire `newBalance`); in modal usare risposta server come per `placePrediction`. |
| 2 | **High** | stesso di #1 | `withdrawLiquidity.ts`, `WithdrawLPModal.tsx` | Nessun accreditamento `User.virtualBalance` sul server; il modal accredità solo il client. | In `withdrawLiquidity`: incrementare `virtualBalance` di `totalWithdrawal`; restituire `newBalance`; allineare client. |
| 3 | **Medium** | stale / runtime risk | `AddLiquidityModal.tsx`, `WithdrawLPModal.tsx`, `ManageLPModal.tsx`, `portfolio/index.tsx` | Nessuna `invalidateQueries` per `getUserLPPositions`, `getPortfolioSummary`, `getTransactionHistory` dopo LP. | Dopo success: invalidare le stesse chiavi usate in portfolio/account (pattern come `TradingBox`). |
| 4 | **Medium** | partially mocked / semantic | `getPortfolioSummary.ts`, tab stats account | `totalDeposited` / `totalWithdrawn` sommano **tutti** i `Transaction` tipo `deposit` / `withdrawal` — includono movimenti **LP** (`metadata.type` lp_*), non solo wallet funding. | Filtrare in summary i deposit “wallet” vs “lp” **oppure** etichettare chiaramente in UI “include LP movements”. |
| 5 | **Medium** | legacy prototype | `src/routes/trader/$wallet.index.tsx` | `SimpleCopyModal`: TODO, solo `toast` — **nessuna** chiamata `startCopyTrading`. Lista copier `mockCopiers`. | Collegare a `startCopyTrading` + wallet gate come `CopyPortfolioModal`; rimuovere mock o sostituire con query. |
| 6 | **Low** | UX / disconnected | `account/index.tsx` tab stats | Esiste `sportBreakdown` in `getPortfolioSummary` ma la UI mostra ancora placeholder testuale. | Render minimale della lista da `summaryQuery.data.sportBreakdown` (o nascondere sezione). |
| 7 | **Low** | runtime risk | `claimLPFees` / `ManageLPModal` | `updateBalance(balance + feesPending)` senza invalidazione portfolio; possibile drift se server differisce. | Usare ritorno server se aggiunto; invalidare LP + summary + history. |
| 8 | **Info** | production-ready | `analysts/$id`, `FollowedAnalystsTab`, `ReferralDashboardTab` | Flussi follow/referral su tRPC con invalidate mirate (o globale in copy modal). | Nessun fix obbligatorio; solo verificare E2E con wallet reale. |

---

## Classificazione sintetica per superficie

| Superficie | Stato |
|------------|--------|
| Trading prediction (connesso) | **production-ready** (post allineamento `getUserPositions`) |
| Account (connesso) | **production-ready** salvo placeholder stats e link-only tab |
| LP modali + saldo DB | **stale/inconsistent** rispetto a `User` e cache (punti #1–#3, #7) |
| `/trader/$wallet` copy veloce | **legacy prototype** |
| Guest demo LP | **disconnected** (assente; vedi `docs/ACCOUNT-AND-DEMO-AUDIT.md`) |

---

## Verifica post-fix (quando si applicano correzioni LP)

- [ ] Dopo `provideLiquidity`: DB `LiquidityPosition` **e** `User.virtualBalance` coerenti; UI saldo = server dopo refresh.
- [ ] `getTransactionHistory` mostra deposit LP; `getPortfolioSummary` “deposited” ha senso dichiarato in UI.
- [ ] Portfolio LP card si aggiorna senza F5 (`getUserLPPositions` invalidato).

---

## Riferimenti

- Reset test: `docs/PAPER_TEST_WALLET_RESET.md`
- Account / demo dual-track: `docs/ACCOUNT-AND-DEMO-AUDIT.md`
- Glossario entità: `docs/DATA-MODEL-GLOSSARY.md`
