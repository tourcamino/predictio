# Deployment e runtime (produzione)

Documento operativo: allinea **GitHub**, **Vercel (frontend)**, **Docker sulla VPS (backend)** e cosa controllare dopo ogni deploy. Obiettivo: ridurre mismatch tra codice sorgente e ciò che gira davvero in produzione.

---

## Frontend

### Vercel

- Progetto tipico: app **TanStack Start / Vinxi** nel repo (cartella radice del deploy, es. `Predictio/`).
- Dominio SPA: **`https://predictio.live`** (esempio; verificare in dashboard Vercel → Domains).
- **API REST** del backend long-lived non passa da Vercel: il browser usa **`https://api.predictio.live`** (vedi `vercel.json` → `VITE_API_URL` / `API_BASE_URL`).

### Branch production

- **`master`** e **`main` devono restare sullo stesso commit** prima di considerare il rilascio completo (es. da `master`: `git checkout main && git merge origin/master && git push origin main`, oppure l’inverso). Così Vercel riceve le modifiche sia se il **Production Branch** in dashboard è `main`, sia se è `master`.
- In **Vercel → Settings → Git → Production Branch** verificare quale branch è collegato; ogni **push** su quel branch avvia un **nuovo deployment** automatico.
- Dopo allineamento, fare **push di entrambi** i branch su `origin` così GitHub, VPS (`git pull origin master`) e strumenti esterni restano coerenti.

### Auto deploy flow

1. `git push origin master`
2. Vercel: build (`prisma generate`, `vinxi build`, preset Nitro `vercel` se `VERCEL=1`)
3. Promozione automatica su production se il build è **READY**

### Runtime serverless

- Le route server definite in **`app.config.ts`** (router HTTP: `/trpc`, `/api/health`, `/api/live`, …) girano come **funzioni serverless** Node su Vercel.
- **tRPC** same-origin: `https://predictio.live/trpc/...` (il client usa `window.location.origin` per tRPC quando `VITE_API_URL` è un altro host — vedi `src/trpc/react.tsx`).

### Nitro / Vinxi (note operative)

- **`VERCEL=1`** → Nitro preset **`vercel`** (non `node-server`).
- **Prisma e Rollup:** con preset `vercel`, **non** esternalizzare `@prisma/client` e `.prisma/client` nel bundle server (in `app.config.ts` gli externals Prisma si applicano solo a `node-server`). Esternalizzarli su Vercel causava **`ERR_MODULE_NOT_FOUND`** e **`FUNCTION_INVOCATION_FAILED`** su tutte le route server.
- **Handler HTTP:** usare **`import { defineEventHandler } from "vinxi/http"`** e **`return new Response(...)`** dove serve compatibilità con l’adapter Vercel. Pattern **`h3`** con **`event.node.res`** + **`setResponseHeader`** ha dato **500** su `/api/health` e `/api/live` in produzione; allinearsi al pattern di `src/server/debug/client-logs-handler.ts`.

---

## Backend

### VPS — architettura Docker

- Stack definita in **`docker-compose.prod.yml`**, inclusa da **`docker-compose.yml`** (`include:` — richiede Compose **v2.20+**).
- Servizi principali: **`backend`** (Node/Express), **Postgres**, **Redis**, bot opzionali (`market-maker-bot`, `growth-engine-bot`, …).
- Il backend espone API HTTP e WebSocket dietro **Nginx** sull’host.

### Struttura compose

| File | Ruolo |
|------|--------|
| `docker-compose.yml` | Include `docker-compose.prod.yml` (default sulla VPS). |
| `docker-compose.prod.yml` | Servizi produzione: `backend`, DB, Redis, healthcheck, … |

### Container `backend`

- **Build context:** `./backend` (Dockerfile nella cartella `backend/`).
- **Healthcheck (compose):** `GET http://localhost:3001/api/v1/health` dentro il container.
- **CORS** tipico: `CORS_ORIGIN=https://predictio.live` (vedi compose).

### Porte (riferimento `docker-compose.prod.yml`)

| Esposizione host | Container | Uso |
|------------------|------------|-----|
| `127.0.0.1:3001:3001` | backend | HTTP API (Nginx → `proxy_pass` qui). |
| `127.0.0.1:8080:8080` | backend | WebSocket (`/ws` via Nginx). |

### Flusso Nginx

- File di riferimento in repo: **`nginx/nginx.conf`** (es. `server_name api.predictio.live`).
- **`location /api/`** → `proxy_pass http://127.0.0.1:3001;`
- **`location /ws`** → `proxy_pass http://127.0.0.1:8080;` (upgrade WebSocket).
- **`/health`** (host API) → rewrite interno verso `http://127.0.0.1:3001/api/v1/health`.

### Rebuild backend (VPS)

Dalla directory del progetto sul server (es. `/root/predictio` — adattare al path reale):

```bash
git pull origin master
docker compose build backend
docker compose up -d --force-recreate backend
```

Verificare subito dopo:

```bash
docker ps
docker compose ps
curl -sS http://127.0.0.1:3001/api/v1/health
```

---

## Standard deploy procedure

### Frontend (Vercel)

1. **`git push origin master`** (o merge su branch collegato a Production).
2. Attendere deploy **READY** in Vercel (Dashboard → Deployments).
3. **Verifiche post-deploy** (vedi checklist sotto).

### Backend (VPS Docker)

1. **`git pull origin master`** nella cartella del deploy.
2. **`docker compose build backend`**
3. **`docker compose up -d --force-recreate backend`**
4. Verificare health container e curl locale (checklist).

---

## Runtime verification checklist

### Frontend (browser o `curl` pubblico)

| Check | URL / azione | Esito atteso |
|--------|----------------|--------------|
| Health | `GET https://predictio.live/api/health` | **200**, JSON `ok`, `service`, `timestamp` |
| Live | `GET https://predictio.live/api/live` | **200**, JSON `ok`, `status`, `timestamp` |
| Copy page | `GET https://predictio.live/copy` | **200** (HTML) |
| tRPC leaderboard | `GET https://predictio.live/trpc/getAnalystLeaderboard?batch=1&input=...` | **200**, body JSON tRPC (SuperJSON) |

Esempio input batch minimo per `getAnalystLeaderboard` (URL-encoded):

```text
?batch=1&input={"0":{"json":{"limit":5,"sortBy":"roi","currentUserWallet":""}}}
```

### Backend (sulla VPS)

| Check | Comando / azione | Esito atteso |
|--------|------------------|--------------|
| Container in esecuzione | `docker ps` | `predictio-backend-1` (o nome servizio) **Up** |
| Healthy | `docker compose ps` / health Docker | healthy (se configurato) |
| API locale | `curl -sS http://127.0.0.1:3001/api/v1/health` | JSON ok dal backend |
| Via dominio | `curl -sS https://api.predictio.live/health` (se Nginx attivo) | allineato a health backend |

---

## Known pitfalls (troubleshooting reale)

1. **Backend Docker con codice vecchio**  
   GitHub aggiornato **non** aggiorna il container finché non si fa **`build` + `up --force-recreate`**. Sintomo: route mancanti (`NOT_FOUND`), file assenti in `dist/` rispetto al repo.

2. **Vercel serverless + Prisma “external”**  
   Marcare `@prisma/client` / `.prisma/client` come **rollup external** con preset **`vercel`**: build ok, runtime **`ERR_MODULE_NOT_FOUND`**. Soluzione: esternalizzare Prisma **solo** su `node-server`; su Vercel includerlo nel bundle (vedi `app.config.ts`).

3. **Nitro/Vinxi vs handler `h3` puri**  
   Handler che usano **`event.node.res`** e **`setResponseHeader`** da **`"h3"`** possono fallire in serverless con **500 generico**. Usare **`vinxi/http`** + **`Response`**.

4. **Rollup external vs moduli a runtime**  
   Ogni `external:` esclude il modulo dal bundle: su Vercel il pacchetto Lambda deve comunque **risolvere** quel modulo a runtime. Se non è tracciato/copiato → crash all’avvio della funzione.

5. **Sorgente vs runtime**  
   - Frontend produzione = **ultimo deploy Vercel** (commit SHA in dashboard).  
   - Backend produzione = **immagine Docker** buildata sul server (non il solo `git status` sul disco se non hai ricostruito).

6. **Due “health” diversi**  
   - **`predictio.live/api/health`** → app Vinxi su Vercel.  
   - **`api.predictio.live`** / **`/api/v1/health`** → Express nel container backend. Non confondere i due quando si debugga.

---

## Emergency rollback

### Docker backend

Prima di operazioni rischiose, tag dell’immagine corrente:

```bash
docker tag predictio-backend:latest predictio-backend:backup-$(date +%Y%m%d-%H%M)
```

Rollback rapido (se esiste un’immagine nota buona):

```bash
docker tag predictio-backend:backup-YYYYMMDD-HHMM predictio-backend:latest
docker compose up -d --force-recreate backend
```

Oppure **`git checkout <commit>`** + rebuild come in procedura standard.

### Vercel (frontend)

- Dashboard Vercel → **Deployments** → deployment precedente **READY** → **Promote to Production** (o **Rollback** secondo UI).
- Verificare subito la checklist frontend.

---

## Raccomandazioni future (non implementate qui)

Aggiungere un endpoint tipo **`GET /api/version`** (solo lettura, senza dati sensibili) che esponga almeno:

- **build hash** / commit Git (`VERCEL_GIT_COMMIT_SHA` su Vercel, variabile custom in Docker),
- **deployment id** Vercel (`VERCEL_DEPLOYMENT_ID`),
- timestamp build,

per confrontare in secondi **cosa crede il browser** vs **cosa risponde il server**. Utile accanto a `/api/health` e `/api/live`.

---

## Riferimenti file nel repo

| Argomento | File |
|-----------|------|
| Preset Nitro, Prisma rollup, maxDuration Vercel | `app.config.ts` |
| Variabili build-time frontend / domini API | `vercel.json` |
| Compose produzione | `docker-compose.prod.yml`, `docker-compose.yml` |
| Esempio Nginx API | `nginx/nginx.conf` |
| Client tRPC / origine | `src/trpc/react.tsx` |
| Health/Live handler (pattern consigliato) | `src/server/health-handler.ts`, `src/server/live-handler.ts` |
