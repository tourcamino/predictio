# Reset wallet paper / test (solo DB + istruzioni browser)

Serve un **runtime pulito** per validare trading, portfolio, LP, copy e sync cross-page **senza** toccare altri utenti. Lo strumento server agisce **solo** se il wallet è in allowlist.

---

## 1. Cosa viene resettato (per il wallet target)

| Area | Azione |
|------|--------|
| **Prediction paper** | Eliminati tutti gli `Order` con `wallet` = target |
| **Storico movimenti** | Eliminate tutte le `Transaction` con `wallet` = target |
| **LP** | Eliminate tutte le `LiquidityPosition` con `userWallet` = target (cascade su `LPFeeEarning` dove applicabile) |
| **Copy (copier e analyst)** | Eliminate `CopyRelationship` con `copierWallet` **oppure** `analystWallet` = target |
| **Notifiche** | Eliminate `Notification` per `walletAddress` |
| **Watchlist / alert** | Eliminate righe `Watchlist`, `PriceAlert` |
| **Points** | Eliminate `PointsLedger` e `PointsTotal` per il wallet; poi ricreati **due righe ledger a 0 punti** (`WALLET_CONNECTED`, `DAILY_LOGIN` con `metadata.paperResetBarrier`) + `PointsTotal` a 0 (vedi § sync sotto) |
| **Leaderboard row** | Eliminata riga `Leaderboard` con PK `walletAddress` |
| **Follow analyst (come follower)** | Eliminate `AnalystFollow` con `userWallet` = target |
| **Follow verso questo analyst** | Se esiste `Analyst` con `wallet` = target: eliminate `AnalystFollow` con quell’`analystId` e azzerate le statistiche numeriche sull’`Analyst` (profilo e `referralCode` restano) |
| **Appeals** | Eliminate `Appeal` con `userWallet` |
| **Referral (come invitato)** | Eliminate `ReferralTracking` con `referredWallet` |
| **Reward / payout log** | Eliminate `AffiliateReward`, `PayoutLog` per `walletAddress` |
| **LP waitlist** | Eliminate `LPWaitlist` per `walletAddress` |
| **Treasury log** | Eliminate `TreasuryLog` con `walletFrom` = target (se presenti) |
| **API keys / challenge** | Eliminate `ApiKey` (cascade `ApiUsage`) e `AuthChallenge` per `walletAddress` |
| **Affiliate (stesso wallet)** | **Non** cancellata la riga `Affiliate`; azzerati contatori economici (`totalReferrals`, volumi, reward pending, …) |
| **User paper counters** | `upsert` su `User`: `virtualBalance`, contatori azzerati, `onboardingCompleted: false`, `firstSeen` / `lastActive` aggiornati |

### Cosa **non** viene toccato

- `Market`, `VaultState`, `VaultAllocation`, `AmmOrder`, seed copy globali, altri utenti.
- Identità `Analyst` / `Affiliate` (display name, ref code founder, ecc.): **non** cancellate.

---

## 2. Perché prima sembrava “non resettarsi” (root cause)

1. **`syncUserAccount`** dopo un reset che **cancellava** tutto il ledger `PointsLedger` vedeva di nuovo assenza di `WALLET_CONNECTED` / `DAILY_LOGIN` del giorno e **riaccreditava** punti (`creditWalletLoginPointsAndStreak`), facendo risalire `PointsTotal` al primo sync.
2. **Solo** le relazioni copy lato `copierWallet` venivano rimosse: restavano copier verso un analyst con `analystWallet` = target.
3. **Saldo atteso 1000 vs 11000**: lo script sommava di default `PAPER_RESET_TRADING_USDC` + `PAPER_RESET_LP_TEST_TOPUP` (prima 1000 + 10000). Ora il default del top-up LP è **0** (solo 1000 USDC virtuali salvo override env).
4. **Client**: `WalletSync` invalidava soprattutto i points; portfolio / notifiche / leaderboard potevano restare “freddi” fino a refresh. Ora la sync invalida un set più ampio di query (vedi codice `invalidateAllWalletScopedQueries`).
5. **Scroll lock**: più layer (`body` + menu mobile + modali) impostavano `overflow: hidden` senza conteggio; un cleanup poteva sbloccare mentre un altro layer era ancora aperto, o lasciare il body bloccato. Ora c’è un lock **ref-counted** (`pushBodyScrollLock` / `pushHtmlScrollLock`) e, su cambio route, `resetStaleScrollLocksIfIdle()` ripulisce solo overflow “orfano” quando nessun lock del modulo è attivo (`~/lib/bodyScrollLock.ts`).

---

## 3. Tabelle Prisma + stato locale browser

| Store | Chiavi / note |
|-------|----------------|
| **PostgreSQL** | Vedi tabella sopra |
| **localStorage** | `predictio-wallet-v2` (preferenza wallet / onboarding; **nessun** indirizzo persistito), legacy `predictio-wallet` migrato e rimosso al boot, `predictio-trading`, demo `predictio_demo_*` — usare `clearPaperWalletClientCache` o cancellazione manuale |
| **React Query** | Dopo reset DB: hard refresh **oppure** riconnessione wallet (sync invalida molte query) |

---

## 4. Balance demo / paper dopo reset

```text
virtualBalance = PAPER_RESET_TRADING_USDC + PAPER_RESET_LP_TEST_TOPUP
```

Default: **1000 + 0 = 1000 USDC** virtuali.

Variabili opzionali:

- `PAPER_RESET_TRADING_USDC` (default `1000`)
- `PAPER_RESET_LP_TEST_TOPUP` (default `0`; impostare es. `10000` solo se vuoi ancora l’accredito extra sullo stesso saldo)

---

## 5. Logging script

- Per il wallet campione founder in dev (`0x7f3a8b2c4e2b9f1a6d5c8e7f9a2b4c6d8e0f1a3b`) lo script stampa snapshot estesi pre/post.
- `PREDICTIO_RESET_VERBOSE=1` abilita snapshot per qualsiasi wallet in allowlist.

Dopo il reset, `pointsLedger` in DB risulta tipicamente **2** righe (barrier a 0 punti), non zero: è voluto per bloccare il re-credito automatico in sync.

---

## 6. Comando (esempio)

```bash
export PREDICTIO_PAPER_RESET_ALLOWLIST="0xabc...,0xdef..."
export PAPER_RESET_TRADING_USDC=1000
export PAPER_RESET_LP_TEST_TOPUP=0
export PREDICTIO_RESET_VERBOSE=1

node --env-file=.env --import tsx ./src/server/scripts/resetPaperTestWallet.ts 0xabc...
```

Oppure `npm run paper:reset-wallet -- 0xabc...` dalla cartella `Predictio/`.

Logica condivisa: `~/server/services/paperWalletHardReset.ts`.

Vedi anche `docs/DATA-MODEL-GLOSSARY.md` per la terminologia Order / Position / LP.
