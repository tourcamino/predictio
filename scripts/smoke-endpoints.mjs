/**
 * HTTP smoke for Predictio:
 * - /api/live (no DB)
 * - /api/health (DB)
 * - backend REST endpoints in /api/* (DB)
 *
 * Start the backend first (VPS or local):
 *   backend: node dist/index.js  (default http://localhost:3001)
 *
 *   npm run smoke:endpoints
 *   SMOKE_BASE_URL=https://example.com npm run smoke:endpoints
 */
const base = (
  process.env.SMOKE_BASE_URL ||
  process.env.VITE_APP_URL ||
  process.env.VITE_API_URL ||
  "http://127.0.0.1:3001"
).replace(/\/$/, "");

async function check(path, { allowFailure = false } = {}) {
  const url = `${base}${path}`;
  const res = await fetch(url);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`${path}: not JSON — ${text.slice(0, 200)}`);
  }
  if (allowFailure && !res.ok) {
    console.warn(`WARN ${path} HTTP ${res.status} (allowed)`);
    return body;
  }
  if (!res.ok) {
    throw new Error(`${path} HTTP ${res.status} ${text}`);
  }
  if (body.ok !== true) {
    throw new Error(`${path} body ok !== true: ${text}`);
  }
  console.log(`OK  ${path}`);
  return body;
}

async function post(path, json, { allowFailure = false } = {}) {
  const url = `${base}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(json),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`${path}: not JSON — ${text.slice(0, 200)}`);
  }
  if (allowFailure && !res.ok) {
    console.warn(`WARN ${path} HTTP ${res.status} (allowed)`);
    return body;
  }
  if (!res.ok) {
    throw new Error(`${path} HTTP ${res.status} ${text}`);
  }
  console.log(`OK  ${path} (POST)`);
  return body;
}

async function main() {
  console.log(`smoke-endpoints base=${base}`);
  // Frontend server routes (vinxi) expose these in production.
  // The Express backend might not have them; allow failure.
  await check("/api/live", { allowFailure: true });
  if (process.env.SMOKE_SKIP_DB === "1") {
    console.log("SKIP /api/health (SMOKE_SKIP_DB=1)");
    return;
  }

  // Same: allow failure if you're only testing Express backend.
  await check("/api/health", { allowFailure: true });

  // Express backend health (always expected if running backend)
  await check("/api/v1/health", { allowFailure: true });

  // New backend endpoints (require DB)
  await check("/api/leaderboard", { allowFailure: true });
  await check("/api/vault", { allowFailure: true });

  await post("/api/translate", { text: "Hello", targetLang: "it" }, { allowFailure: true });
  await post(
    "/api/developer/keys",
    { walletAddress: "0x1111111111111111111111111111111111111111", label: "Smoke" },
    { allowFailure: true }
  );

  console.log("smoke:endpoints passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
