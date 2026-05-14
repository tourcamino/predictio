# Deployment e runtime (produzione)

Documento operativo: allinea **GitHub**, **Vercel (frontend)**, **Docker sulla VPS (backend)** e riduce **divergenze di commit** tra ambienti. Obiettivo: sapere sempre **quale SHA** sta girando e come verificarlo in pochi secondi.

---

## Fase 1 — Source of truth (branch e ruoli)

### 1. Cosa è davvero la “source of truth”

| Concetto | Definizione operativa |
|----------|------------------------|
| **Runtime source of truth** | Il **commit Git SHA** effettivamente deployato su ciascun runtime (Vercel serverless, immagine Docker backend). Il nome del branch da solo non basta. |
| **Source of truth del codice** | **GitHub** (`origin`): tag/branch puntano a SHA; PR e merge aggiornano lo storico. |

### 2. Branch “ufficiali” in questo repository

| Branch | Ruolo |
|--------|--------|
| **`master`** | Branch **primario** usato negli script e nella documentazione VPS (`git pull origin master`). |
| **`main`** | Deve restare **allineato a `master`** (stesso SHA) prima di considerare un rilascio “completo”, così Vercel o altri tool collegati a `main` non restano indietro. |

**Regola:** dopo ogni rilascio significativo → `git push origin master` **e** allineare `main` (fast-forward/merge) → `git push origin main`.

### 3. Chi usa quale branch (da configurare / verificare)

| Sistema | Cosa verificare |
|---------|-----------------|
| **Vercel** | Dashboard → **Settings → Git → Production Branch** (es. `main` o `master`). Il deploy production parte dal **push su quel branch** (se Git Integration attiva). |
| **VPS Docker** | Comandi documentati sotto usano **`git pull origin master`**. Se la squadra standardizza su `main`, aggiornare solo questo doc e gli script interni in modo coerente. |
| **CI/CD** | Se presente, deve fare checkout/pull dello **stesso branch** dichiarato come production in Vercel **o** buildare da tag SHA esplicito. |

---

## Fase 2 — Deploy verification (checklist obbligatoria)

Prima di dichiarare “production aggiornata”, confrontare i **SHA** (non solo “build verde”).

### Sul clone usato per il rilascio (locale o VPS)

```bash
git rev-parse HEAD
git branch --show-current
git log -1 --oneline
```

### GitHub (ultimo commit del branch production)

Esempio (API GitHub o UI): il commit in cima a `master` / `main` deve coincidere con `git rev-parse HEAD` del clone da cui hai buildato **o** con lo SHA incollato in Vercel.

### Vercel (frontend)

1. Dashboard → **Deployments** → deployment **Production** → **Source** / **Commit** (o variabile `VERCEL_GIT_COMMIT_SHA` nel build log).
2. Conferma con endpoint pubblico (vedi Fase 3):

```bash
curl -sS https://predictio.live/api/version
```

Campi attesi: `gitCommitSha`, `gitBranch`, `environment`, `vercelDeploymentId` (se su Vercel).

### VPS — immagine Docker backend

Dopo `docker compose build` + `up`, il container deve riflettere lo **stesso commit** con cui hai passato i build-arg (vedi Fase 4):

```bash
curl -sS http://127.0.0.1:3001/api/v1/version
```

Confrontare `gitCommitSha` con `git rev-parse HEAD` sul server **nello stesso momento** del build (idealmente identici).

### Tabella riepilogo “tutto coincide?”

| Controllo | Dove | Deve matchare con |
|-----------|------|-------------------|
| `git rev-parse HEAD` | Clone build | SHA GitHub production branch |
| `curl …/api/version` | `predictio.live` | Stesso SHA (frontend) |
| Vercel deployment commit | Dashboard | Stesso SHA |
| `curl …/api/v1/version` | API container | Stesso SHA del backend buildato |
| `docker image inspect` (opzionale) | Label/env | Coerente con rebuild appena fatto |

---

## Fase 3 — Runtime visibility (endpoint versione)

### Frontend (Vinxi su Vercel)

| Endpoint | Note |
|----------|------|
| `GET https://predictio.live/api/version` | JSON: `service`, `environment`, `gitCommitSha`, `gitCommitShort`, `gitBranch`, `buildTime`, `vercelDeploymentId`, `timestamp`. Su Vercel i campi `VERCEL_*` sono popolati automaticamente in build. `Cache-Control: no-store`. |

### Backend (Express in Docker)

| Endpoint | Note |
|----------|------|
| `GET https://api.predictio.live/api/v1/version` (o `http://127.0.0.1:3001/api/v1/version`) | Stesso scopo: commit/branch/build incisi in immagine tramite **build-args** Docker (vedi sotto). |

**Health distinti (non confondere):**

- `GET https://predictio.live/api/health` — liveness app web (leggero).
- `GET https://api.predictio.live/api/v1/health` — backend + DB.

---

## Frontend (Vercel) — dettaglio operativo

- Progetto: app **TanStack Start / Vinxi** nella root del repo deployato.
- Dominio SPA esempio: **`https://predictio.live`** (verificare in Vercel → Domains).
- API REST long-lived: **`https://api.predictio.live`** (`vercel.json` / `VITE_API_URL`).

### Auto deploy (push)

1. Push sul **Production Branch** configurato in Vercel.
2. Build (`prisma generate`, `vinxi build`, preset Nitro `vercel` se `VERCEL=1`).
3. Deploy **READY** → traffico production.

### Vercel: push vs CLI (`vercel deploy --prod`)

| Metodo | Quando usarlo |
|--------|-----------------|
| **Push Git** | Flusso normale: ogni merge su production branch → build automatica, storico commit in dashboard. |
| **`vercel deploy --prod`** | Hotfix urgente da working tree locale, ambiente senza Git collegato, o debug del team; **subito dopo** allineare GitHub (commit + push) così Git non resta indietro rispetto al runtime. |

**Preview vs Production:** i branch non-production e le PR generano **Preview**; solo il branch production riceve il dominio principale (salvo override manuali).

### Nitro / Vinxi (note operative)

- **`VERCEL=1`** → preset **`vercel`**.
- Prisma: su preset `vercel` non esternalizzare `@prisma/client` in modo che rompa il bundle (vedi `app.config.ts`).
- Handler HTTP: **`vinxi/http`** + **`Response`** dove necessario per compatibilità serverless.

---

## Backend (VPS Docker)

### Architettura

- **`docker-compose.prod.yml`**, incluso da **`docker-compose.yml`**.
- Servizi: **`backend`**, Postgres, Redis, bot opzionali.
- Healthcheck compose: `GET http://localhost:3001/api/v1/health`.

### Fase 4 — VPS safety (dopo ogni update backend)

Nella directory del deploy sul server:

```bash
git fetch origin
git checkout master   # o il branch production effettivo
git pull origin master
export GIT_COMMIT_SHA=$(git rev-parse HEAD)
export GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
export BUILD_TIME_ISO=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

docker compose -f docker-compose.yml build backend \
  --build-arg GIT_COMMIT_SHA="$GIT_COMMIT_SHA" \
  --build-arg GIT_BRANCH="$GIT_BRANCH" \
  --build-arg BUILD_TIME_ISO="$BUILD_TIME_ISO"

docker compose up -d --force-recreate backend
```

Verifiche immediate:

```bash
docker compose ps
curl -sS http://127.0.0.1:3001/api/v1/version
curl -sS http://127.0.0.1:3001/api/v1/health
```

Il campo `gitCommitSha` di `/api/v1/version` deve coincidere con `echo "$GIT_COMMIT_SHA"` usato al build.

### Rebuild minimo (senza build-args)

Se rebuild senza argomenti, `gitCommitSha` può risultare `null`: il container gira comunque ma **non** passa la checklist SHA della Fase 2 — da evitare in produzione.

---

## Standard deploy procedure (riepilogo)

### Frontend

1. Allineare `master` e `main` (stesso SHA), push su entrambi se usati.
2. Push sul branch collegato a **Production** in Vercel.
3. `curl -sS https://predictio.live/api/version` → confronto SHA con GitHub.

### Backend

1. `git pull` sul branch production.
2. `docker compose build` con **build-args** commit/branch/time.
3. `docker compose up -d --force-recreate backend`.
4. `curl` locale `/api/v1/version` e `/api/v1/health`.

---

## Runtime verification checklist (URL)

### Frontend

| Check | URL / azione | Esito atteso |
|--------|----------------|--------------|
| Health | `GET https://predictio.live/api/health` | 200, `ok`, `service`, `timestamp` |
| Version | `GET https://predictio.live/api/version` | 200, SHA/branch coerenti con GitHub |
| Live | `GET https://predictio.live/api/live` | 200 |

### Backend (VPS / API)

| Check | Comando / azione | Esito atteso |
|--------|------------------|--------------|
| Version | `curl -sS http://127.0.0.1:3001/api/v1/version` | `gitCommitSha` = commit build |
| Health | `curl -sS http://127.0.0.1:3001/api/v1/health` | DB ok |

---

## Known pitfalls (troubleshooting)

1. **Git aggiornato ma container vecchio** — senza `build` + `--force-recreate` il runtime non cambia.
2. **Vercel SHA vs GitHub** — usare `/api/version` e la dashboard; mismatch = deploy sbagliato o rollback.
3. **Preview `ERROR` ma Production `READY` (stesso commit)** — cache build diversa per branch + **pnpm 10** che non esegue lifecycle delle dipendenze salvo `pnpm.onlyBuiltDependencies`. Nei log: `ENOENT … @napi-rs/canvas-linux-x64-musl` in `vinxi build`. In repo: `onlyBuiltDependencies` include `@napi-rs/canvas` e `optionalDependencies` esplicite per `@napi-rs/canvas-linux-x64-gnu` / `@napi-rs/canvas-linux-x64-musl` (0.1.100) così i binari Linux restano nel lockfile anche se la cache Preview è “sporca”. Se persiste: **Redeploy** Preview con “Clear build cache”.
4. **Due health diversi** — web `/api/health` vs API `/api/v1/health` (vedi sopra).

---

## Emergency rollback

### Docker backend

Tag immagine prima di operazioni rischiose; rollback a immagine nota o `git checkout <sha>` + rebuild con stessi build-args.

### Vercel

Dashboard → deployment precedente **READY** → **Promote to Production** / rollback.

---

## Fase 6 — Futuro (non fare ora se stabile)

Valutare **un solo branch production** (es. solo `main` o solo `master`) per eliminare ambiguità. Richiede allineamento Vercel + VPS + abitudini team; **non** obbligatorio finché la regola “stesso SHA su `main` e `master`” è rispettata.

---

## Riferimenti file nel repo

| Argomento | File |
|-----------|------|
| Route `/api/version` (web) | `app.config.ts`, `src/server/version-handler.ts`, `src/server/lib/deployRuntimeMeta.ts` |
| Route `/api/v1/version` (API) | `backend/src/index.ts`, `backend/src/lib/deployRuntimeMeta.ts` |
| Build-args immagine backend | `backend/Dockerfile`, `docker-compose.prod.yml` |
| Preset Nitro / Prisma | `app.config.ts` |
| Variabili build-time | `vercel.json` |
| Compose produzione | `docker-compose.prod.yml`, `docker-compose.yml` |
| Nginx | `nginx/nginx.conf` |
| Client tRPC | `src/trpc/react.tsx` |
