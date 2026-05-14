# Glossario dati: Order, Position, Portfolio, LP, Demo

Documento **concettuale** (niente refactor di naming o API). Obiettivo: allineare il team su cosa è persistito, cosa è view UI, e dove sta la source of truth.

> **Regola d’oro:** le *trading positions* sono una **rappresentazione UI** delle righe **`Order`** nel DB (paper trading). L’id mostrato in `/trading` per il flusso reale è sempre `Order.id` (CUID).

---

## 1. Mappa semantica (cosa significa cosa)

| Termine nel codice / UX | Natura | Persistenza | Note |
|-------------------------|--------|---------------|------|
| **`Order`** (Prisma) | Entity DB | Sì | Una riga = esposizione utente su un mercato (outcome, shares, avgPrice, status). È il nucleo del “prediction trade” paper. |
| **`Position`** (`~/store/tradingStore`, tipo `Position`) | View / stato UI | No (solo `selectedPositionId` in persist parziale) | Shape per lista trading + detail: PnL derivato, label mercato, ecc. Per wallet connesso è costruito da **adapter** su `Order` + `getMarketSummaries`. |
| **Trading position** | Sinonimo operativo di sopra | No | Solo naming: “posizione” nella pagina `/trading`. |
| **Prediction** (linguaggio prodotto) | Concetto marketing / UX | — | In UI spesso “My predictions” = stessi `Order` dell’utente, non un modello DB separato. |
| **`Transaction`** (Prisma) | Entity DB | Sì | Storico movimenti wallet (depositi, `bet_placed`, vendite/chiusure come `bet_won`/metadata, ecc.). Non è la posizione aperta. |
| **Portfolio (pagina / summary)** | Aggregazione UI + query | — | Combinazione di `getUserPositions`, `getPortfolioSummary`, performance, **LP** separato, ecc. |
| **`LiquidityPosition`** (Prisma) | Entity DB | Sì | Esposizione **LP** (pool), indipendente dalle prediction `Order`. |
| **`DemoPosition`** (`~/lib/demoStorage`) | Stato locale guest | No | Solo browser/localStorage quando demo attivo e **nessun** wallet per il flusso guest. |
| **`Trade`** (tipo in `tradingStore`: feed / WS) | UI / realtime | No | “Trade” nel senso di tick/orderbook feed, **non** la tabella `Transaction` (naming sovrapposto, vedi rischi). |
| **`AmmOrder`** (Prisma) | Entity DB | Sì | Ordini AMM separati dal flusso prediction paper principale; non confondere con `Order`. |

---

## 2. Source of truth ufficiali

| Dominio | Source of truth | Dove si consuma (esempi) |
|---------|-------------------|---------------------------|
| Posizioni prediction utente (paper) | DB **`Order`** + procedure **`getUserPositions`** | `/trading`, `/account?tab=predictions`, `/portfolio`, `TradingBox` (subset mercato), detail `/trading/position/:id` |
| Prezzi / label mercato per PnL UI | **`getMarketSummaries`** (+ dettaglio mercato dove serve) | Stesso adapter / pagine portfolio-account |
| Saldo paper | DB **`User.virtualBalance`** (+ invalidazioni dopo trade) | Wallet store dopo mutazioni |
| Storico movimenti | DB **`Transaction`** | Account history, export, analytics |
| LP | DB **`LiquidityPosition`** (+ procedure dedicate) | Portfolio sezione LP, modali LP |
| Demo guest | **`demoStorage` / `useDemoAccount`** | `/trading` senza wallet, parti di portfolio in modalità demo |

**Cache:** React Query keys per `getUserPositions` dipendono dall’input (`status: 'open' | 'all'`, …). Dopo mutazioni che cambiano gli ordini, invalidare **tutte le varianti** usate dalle pagine (pattern già applicato su buy/sell/close).

---

## 3. Terminologia consigliata (quando scrivi codice o PR)

- Usa **Order** quando parli del DB o del tipo Prisma / risposta grezza da `getUserPositions`.
- Usa **trading UI position** o **mapped position** quando parli del tipo `Position` in `tradingStore` costruito dall’adapter.
- Usa **prediction exposure** per riferirti all’insieme degli `Order` aperti/chiusi dell’utente sul mercato prediction.
- Usa **LP position** solo per `LiquidityPosition` / UI LP.
- Usa **demo row** per `DemoPosition`, mai “order” o “position” DB.

---

## 4. Cosa **non** rinominare adesso (stabilità runtime)

- Tabelle Prisma **`Order`**, **`Transaction`**, **`LiquidityPosition`**: renaming = migrazioni + rischio deploy.
- Procedure tRPC **`getUserPositions`**, **`placePrediction`**, **`closePosition`**: contratto client/server.
- Tipo export **`Position`** in `tradingStore` e nome file: usati ovunque nei componenti trading.
- Parametro route **`/trading/position/$id`**: l’`id` è semanticamente `orderId` ma il path resta così.
- Campo legacy **`Order.odds`**: lasciato per compatibilità schema.

---

## 5. Rischio / naming legacy (monitoraggio)

| Rischio | Dettaglio |
|---------|-----------|
| **`Position` vs “position” LP** | Stessa parola in inglese per prediction UI e LP; contestualizzare nei commenti. |
| **`Trade` in Zustand vs `Transaction` DB** | Omonimia: il feed “Trade” non è la riga `Transaction`. |
| **`getUserPositions` restituisce `positions`**| Il JSON dice `positions` ma sono **Order**; confusione solo nominale. |
| **Zustand `tradingStore.positions`** | Mirror opzionale / legacy per subscriber; lista principale reale arriva da query + prop su `/trading`. |
| **Mock / paper** | `executeBuy` / `executeSell` restano per demo UI e path non-DB; non mescolare con `Order` reale quando il wallet è connesso. |
| **DRAW pricing** | Portfolio e adapter possono divergere su edge DRAW se il mercato espone solo YES/NO in qualche calcolo; da unificare **solo** dopo stabilizzazione. |

---

## 6. Refactor futuri (solo dopo runtime stabilizzato)

1. Rinominare in codice (non in DB) `UserOrderRow` → documentazione esplicita `OrderWithRewards` ovunque.
2. Introdurre alias di tipo `type PredictionOrderRow = …` lato client **solo** se il team preferisce il linguaggio “prediction” nel codice UI.
3. Estrarre un unico helper “invalidate all wallet position queries” per evitare dimenticanze tra `open` / `all`.
4. Valutare rename route `orderId` in search params (breaking) — solo con versionamento o redirect.
5. Separare nominalmente `RecentTradeTick` vs `LedgerTransaction` per eliminare ambiguità `Trade`.

---

## 7. Riferimenti file (ancora)

| Area | File indicativi |
|------|-----------------|
| Adapter Order → UI trading | `src/lib/trading/mapDbOrderToTradingPosition.ts` |
| Tipo UI `Position` | `src/store/tradingStore.ts` |
| Query canonica | `src/server/trpc/procedures/getUserPositions.ts` |
| Demo locale | `src/lib/demoStorage.ts`, `src/hooks/useDemoAccount.ts` |
| Chiusura paper | `src/server/trpc/procedures/closePosition.ts` |

Ultimo aggiornamento: allineamento `/trading` ↔ `getUserPositions` e documentazione glossario.

---

## 8. Reset ambiente test (paper wallet)

Per azzerare **solo** un wallet in allowlist (ordini, LP, copy come copier, ledger, punti, ecc.) e ripristinare saldi paper controllati, vedi **`docs/PAPER_TEST_WALLET_RESET.md`** e lo script `src/server/scripts/resetPaperTestWallet.ts`.
