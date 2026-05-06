/**
 * HTTP smoke: GET /api/live (no DB) and /api/health (DB).
 * Start the app first: npm run dev
 *
 *   npm run smoke:endpoints
 *   SMOKE_BASE_URL=https://example.com npm run smoke:endpoints
 */
const base = (
  process.env.SMOKE_BASE_URL ||
  process.env.VITE_APP_URL ||
  "http://127.0.0.1:3050"
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

async function main() {
  console.log(`smoke-endpoints base=${base}`);
  await check("/api/live");
  if (process.env.SMOKE_SKIP_DB === "1") {
    console.log("SKIP /api/health (SMOKE_SKIP_DB=1)");
    return;
  }
  await check("/api/health");
  console.log("smoke:endpoints passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
