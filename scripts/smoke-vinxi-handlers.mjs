/**
 * Vinxi / Vercel frontend server handler smoke (no backend Express required).
 *
 *   SMOKE_WEB_URL=https://predictio.live npm run smoke:vinxi-handlers
 *   SMOKE_WEB_URL=http://127.0.0.1:3000 npm run smoke:vinxi-handlers
 *
 * Env:
 *   SMOKE_WEB_URL — SPA origin (default http://127.0.0.1:3000)
 *   SMOKE_STRICT=1 — exit 1 on any failed check (default: warn only)
 */
const base = (process.env.SMOKE_WEB_URL || "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const strict = process.env.SMOKE_STRICT === "1";

const CRAWLER_UA = "facebookexternalhit/1.1";

async function probe(name, url, init = {}, expect = {}) {
  const started = Date.now();
  let res;
  let text = "";
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
    text = await res.text();
  } catch (err) {
    const msg = err?.cause?.code || err?.message || String(err);
    console.warn(`WARN ${name} unreachable (${msg})`);
    if (strict) process.exitCode = 1;
    return false;
  }
  const durationMs = Date.now() - started;
  const location = res.headers.get("location");
  const ok =
    (expect.status == null || res.status === expect.status) &&
    (expect.statusIn == null || expect.statusIn.includes(res.status)) &&
    (expect.locationPrefix == null ||
      (location && location.startsWith(expect.locationPrefix))) &&
    (expect.bodyIncludes == null || text.includes(expect.bodyIncludes)) &&
    (expect.jsonOk == null ||
      !expect.jsonOk ||
      (() => {
        try {
          const j = JSON.parse(text);
          return j?.ok === true;
        } catch {
          return false;
        }
      })());

  if (ok) {
    console.log(
      `OK  ${name} HTTP ${res.status} ${durationMs}ms${location ? ` → ${location.slice(0, 80)}` : ""}`,
    );
    return true;
  }

  console.warn(
    `WARN ${name} HTTP ${res.status} ${durationMs}ms (expected ${JSON.stringify(expect)})`,
  );
  if (strict) process.exitCode = 1;
  return false;
}

async function main() {
  console.log(`\nsmoke-vinxi-handlers base=${base}\n`);

  await probe("GET /api/live", `${base}/api/live`, {}, {
    status: 200,
    jsonOk: true,
  });

  await probe("GET /api/health", `${base}/api/health`, {}, {
    status: 200,
    jsonOk: true,
  });

  await probe("GET /api/version", `${base}/api/version`, {}, {
    status: 200,
    jsonOk: true,
  });

  await probe("GET /api/og (missing id)", `${base}/api/og`, {}, {
    statusIn: [400, 404],
  });

  await probe("GET /api/og/smoke-test-id", `${base}/api/og/smoke-test-id`, {}, {
    statusIn: [302, 307],
    locationPrefix: "http",
  });

  await probe(
    "GET /markets (crawler UA)",
    `${base}/markets`,
    { headers: { "user-agent": CRAWLER_UA } },
    { statusIn: [200, 304],
      bodyIncludes: "og:title",
    },
  );

  await probe("POST /api/debug/client-logs", `${base}/api/debug/client-logs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ logs: [] }),
  }, { status: 200, jsonOk: true });

  await probe("GET /api/debug/client-logs (405)", `${base}/api/debug/client-logs`, {}, {
    status: 405,
  });

  await probe("GET /trpc (batch health)", `${base}/trpc/health?input=%7B%7D`, {}, {
    statusIn: [200, 204, 404, 405],
  });

  console.log("\nsmoke-vinxi-handlers finished\n");
  if (process.exitCode) process.exit(process.exitCode);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
