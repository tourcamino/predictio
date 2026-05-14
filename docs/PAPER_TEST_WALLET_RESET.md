# Reset wallet paper / test (solo DB + istruzioni browser)

Serve un **runtime pulito** per validare trading, portfolio, LP, copy e sync cross-page **senza** toccare altri utenti. Lo strumento server agisce **solo** se il wallet è in allowlist.

---

## 1. Cosa viene resettato (per il wallet target)

| Area | Azione |
|------|--------|
| **Prediction paper** | Eliminati tutti gli `Order` con `wallet` = target |
| **Storico movimenti** | Eliminate tutte le `Transaction` con `wallet` = target |
| **LP** | Eliminate tutte le `LiquidityPosition` con `userWallet` = target (cascade su `LPFeeEarning` dove applicabile) |
| **Copy (come copier)** | Eliminate `CopyRelationship` con `copierWallet` = target |
| **Notifiche** | Eliminate `Notification` per `walletAddress` |
| **Watchlist / alert** | Eliminate righe `Watchlist`, `PriceAlert` |
| **Points** | Eliminate `PointsLedger` e `PointsTotal` per il wallet |
| **Leaderboard row** | Eliminata riga `Leaderboard` con PK `walletAddress` |
| **Follow analyst** | Eliminate `AnalystFollow` con `userWallet` |
| **Appeals** | Eliminate `Appeal` con `userWallet` |
| **Referral (come invitato)** | Eliminate `ReferralTracking` con `referredWallet` |
| **Reward / payout log** | Eliminate `AffiliateReward`, `PayoutLog` per `walletAddress` |
| **LP waitlist** | Eliminate `LPWaitlist` per `walletAddress` |
| **User paper counters** | `upsert` su `User`: `virtualBalance`, `totalPnl`, `tradesCount`, `predictions`, `wins`, `losses`, `totalVolume`, holding rewards azzerati |

### Cosa **non** viene toccato

- `Market`, `VaultState`, `VaultAllocation`, `AmmOrder`, seed copy globali, altri utenti.
- `Analyst` / `Affiliate` (profilo pubblico e ref code): **non** cancellati (evita rotture cross-ambiente). Se serve profilo analyst pulito, va gestito a parte.
- `CopyRelationship` dove il wallet è **analyst** (`analystWallet`): **non** cancellato da questo script (solo lato copier).

---

## 2. Tabelle Prisma + stato locale browser

| Store | Chiavi / note |
|-------|----------------|
| **PostgreSQL** | Vedi tabella sopra (`Order`, `Transaction`, `LiquidityPosition`, …) |
| **localStorage (guest demo)** | `predictio_demo_state`, `predictio_demo_opt_in` — solo se usi demo **senza** wallet; il reset DB non li cancella |
| **localStorage (trading UI)** | `predictio-trading` (Zustand persist parziale: `selectedPositionId`) |
| **React Query** | Nessun persist globale nel repo; dopo reset DB basta **hard refresh** o svuotare site data |

---

## 3. Balance demo / paper dopo reset

Lo script imposta:

```text
virtualBalance = PAPER_RESET_TRADING_USDC + PAPER_RESET_LP_TEST_TOPUP
```

Default: **1000 + 10000 = 11000 USDC** virtuali.

**Importante:** nel modello attuale esiste **un solo** `User.virtualBalance`. Non c’è un secondo saldo “LP only” nel DB: i **10k** sono un **accredito aggiuntivo sullo stesso saldo paper**, da usare **per convenzione** per operazioni LP / test, mentre i primi 1000 rappresentano il “playground” prediction. Separazione contabile reale richiederebbe schema dedicato (fuori scope).

Variabili opzionali:

- `PAPER_RESET_TRADING_USDC` (default `1000`)
- `PAPER_RESET_LP_TEST_TOPUP` (default `10000`)

---

## 4. Come aggiungere i 10k “LP demo”

Non è un bucket separato: è il **`PAPER_RESET_LP_TEST_TOPUP`** sommato al saldo come sopra. Dopo il reset, depositi LP consumeranno quel saldo come in produzione paper.

---

## 5. Rischi

| Rischio | Mitigazione |
|---------|-------------|
| **Reset su wallet sbagliato** | Obbligatorio `PREDICTIO_PAPER_RESET_ALLOWLIST` + wallet deve comparire nella lista |
| **Cache React Query stale** | Hard refresh del browser dopo lo script; in dev eventualmente chiudere tab |
| **Contaminazione cross-wallet** | Lo script filtra sempre per `wallet` / `walletAddress` / `userWallet` / `copierWallet` / `referredWallet` coerenti con il target |
| **Leaderboard / points** | Righe eliminate o azzerate per quel wallet; ricompariranno quando l’app le rigenera |
| **Analyst copy lato analyst** | Se il wallet test è analyst, relazioni `analystWallet` non vengono rimosse da questo script |

---

## 6. Come verificare che il reset sia completo

1. **Esegui lo script** e controlla i log `Before` / `After` (orders/transactions/LP/copy = 0 dove atteso).
2. **Browser**: connesso con il wallet test → hard reload.
3. **`/trading`**: lista vuota, nessun `pos-*`.
4. **`/account?tab=predictions`**: nessun ordine; saldo coerente con `virtualBalance`.
5. **`/portfolio`**: nessuna posizione prediction/LP per quel wallet; nessun PnL legacy dalle righe eliminate.
6. **Copy**: nessuna relazione attiva come copier (fino a nuovo follow).
7. **Leaderboard / points UI**: valori azzerati o assenti fino a nuova attività.
8. **Guest demo** (opzionale): in DevTools → Application → Local Storage, cancella chiavi `predictio_*` per l’origine dell’app se vuoi anche demo locale pulita.

---

## Comando (esempio)

```bash
# .env sulla macchina che punta al DB di test
export PREDICTIO_PAPER_RESET_ALLOWLIST="0xabc...,0xdef..."
export PAPER_RESET_TRADING_USDC=1000
export PAPER_RESET_LP_TEST_TOPUP=10000

node --env-file=.env --import tsx ./src/server/scripts/resetPaperTestWallet.ts 0xabc...
```

Oppure `npm run paper:reset-wallet -- 0xabc...` dalla cartella `Predictio/`.

Vedi anche `docs/DATA-MODEL-GLOSSARY.md` per la terminologia Order / Position / LP.
