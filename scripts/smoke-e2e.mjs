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

    const authedWallet = String(json.walletAddress || "").toLowerCase();
    if (/^0x[a-f0-9]{40}$/.test(authedWallet)) {
      const mismatchWallet =
        authedWallet.slice(0, 41) + (authedWallet.slice(41) === "0" ? "1" : "0");

      // Wallet mismatch: /api/vault
      {
        const r2 = await req("/api/vault", {
          method: "POST",
          headers: { authorization: `Bearer ${botKey}`, "content-type": "application/json" },
          body: { action: "deposit", walletAddress: mismatchWallet, amountUsd: 1 },
        });
        assert(r2.res.status === 403, `/api/vault mismatch expected 403 got ${r2.res.status} ${r2.text}`);
        assert(r2.json?.error?.code === "WALLET_MISMATCH", `/api/vault mismatch expected WALLET_MISMATCH got ${r2.text}`);
        console.log("OK  /api/vault wallet mismatch");
      }

      // Wallet mismatch: /api/copy
      {
        const r3 = await req("/api/copy", {
          method: "POST",
          headers: { authorization: `Bearer ${botKey}`, "content-type": "application/json" },
          body: {
            action: "start",
            copierWallet: mismatchWallet,
            analystWallet: "0x1111111111111111111111111111111111111111",
            maxPerTradeUsd: 5,
            copyMode: "all",
            selectedMarkets: [],
          },
        });
        assert(r3.res.status === 403, `/api/copy mismatch expected 403 got ${r3.res.status} ${r3.text}`);
        assert(r3.json?.error?.code === "WALLET_MISMATCH", `/api/copy mismatch expected WALLET_MISMATCH got ${r3.text}`);
        console.log("OK  /api/copy wallet mismatch");
      }

      // Wallet mismatch: /api/trades (requires an open market)
      {
        const m = await req("/api/v1/markets");
        if (m.res.ok && Array.isArray(m.json?.markets) && m.json.markets.length > 0) {
          const open = m.json.markets.find((x) => x?.status === "open") || m.json.markets[0];
          const marketId = open?.id;
          if (marketId) {
            const r4 = await req("/api/trades", {
              method: "POST",
              headers: { authorization: `Bearer ${botKey}`, "content-type": "application/json" },
              body: { marketId, outcome: "YES", amountUsd: 1, walletAddress: mismatchWallet },
            });
            assert(r4.res.status === 403, `/api/trades mismatch expected 403 got ${r4.res.status} ${r4.text}`);
            assert(
              r4.json?.error?.code === "WALLET_MISMATCH" || r4.json?.error?.code === "FORBIDDEN",
              `/api/trades mismatch expected WALLET_MISMATCH got ${r4.text}`,
            );
            console.log("OK  /api/trades wallet mismatch");
          } else {
            console.warn("WARN /api/trades mismatch skipped (no marketId)");
          }
        } else {
          console.warn("WARN /api/trades mismatch skipped (/api/v1/markets unavailable)");
        }
      }
    } else {
      console.warn("WARN mismatch tests skipped (walletAddress missing from /api/me)");
    }
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

  let versionOk = false;
  for (const p of ["/api/v1/version", "/api/version"]) {
    const { res, json, text } = await req(p);
    if (res.ok && json?.ok && json?.service) {
      console.log(`OK  ${p} service=${json.service} short=${json.gitCommitShort ?? "?"}`);
      versionOk = true;
      break;
    }
  }
  if (!versionOk) {
    console.warn("WARN deploy /api/v1/version and /api/version not both available on this base URL");
  }

  console.log("smoke:e2e passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

