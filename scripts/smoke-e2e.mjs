/**
 * Predictio E2E smoke (HTTP only).
 *
 * Goals:
 * - Validate "always logged in" primitives (/api/me, auth gating) when keys are provided
 * - Validate core health endpoints in both local and VPS/proxy setups
 *
 * Usage:
 *   SMOKE_BASE_URL=https://api.predictio.live BOT_API_KEY=... node ./scripts/smoke-e2e.mjs
 *   SMOKE_BASE_URL=http://127.0.0.1:3001 node ./scripts/smoke-e2e.mjs
 *
 * Optional:
 *   ADMIN_API_KEY=...  -> enables /api/admin/health/full check
 */
const base = (
  process.env.SMOKE_BASE_URL ||
  process.env.VITE_API_URL ||
  "http://127.0.0.1:3001"
).replace(/\/$/, "");

const botKey = process.env.BOT_API_KEY || "";
const adminKey = process.env.ADMIN_API_KEY || "";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function req(path, { method = "GET", headers = {}, body } = {}) {
  const url = `${base}${path}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, text, json };
}

async function main() {
  console.log(`smoke-e2e base=${base}`);

  // Health (best-effort depending on whether you're hitting vinxi or backend directly)
  {
    const { res } = await req("/api/v1/health");
    if (!res.ok) {
      console.warn(`WARN /api/v1/health HTTP ${res.status} (allowed)`);
    } else {
      console.log("OK  /api/v1/health");
    }
  }

  // /api/me should require auth when WRITE_AUTH_REQUIRED/permission gates are on.
  {
    const { res, json, text } = await req("/api/me");
    if (res.ok) {
      console.warn("WARN /api/me is public (allowed in some local modes)");
    } else {
      // Expect JSON error shape when backend is hit.
      if (json?.error?.code) {
        console.log(`OK  /api/me unauth -> ${json.error.code}`);
      } else {
        console.warn(`WARN /api/me unauth not JSON (allowed): ${text.slice(0, 120)}`);
      }
    }
  }

  if (botKey) {
    const { res, json, text } = await req("/api/me", {
      headers: { authorization: `Bearer ${botKey}` },
    });
    assert(res.ok, `/api/me auth failed HTTP ${res.status} ${text}`);
    assert(json && (json.walletAddress || json.apiKeyId || json.apiKey), `/api/me unexpected body: ${text}`);
    console.log("OK  /api/me (auth)");
  } else {
    console.log("SKIP /api/me (auth) — BOT_API_KEY not set");
  }

  if (adminKey) {
    const { res, json, text } = await req("/api/admin/health/full", {
      headers: { "x-predictio-key": adminKey },
    });
    assert(res.ok, `/api/admin/health/full failed HTTP ${res.status} ${text}`);
    assert(json?.db?.ok === true, `/api/admin/health/full db not ok: ${text}`);
    console.log("OK  /api/admin/health/full");
  } else {
    console.log("SKIP /api/admin/health/full — ADMIN_API_KEY not set");
  }

  console.log("smoke:e2e passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

