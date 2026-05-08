/**
 * One-shot local runtime verification (HTTP + optional WS).
 *
 * Prerequisites for full green:
 *   - Postgres: `docker compose -f docker-compose.dev.yml up -d`
 *   - Migrations: `npx prisma migrate deploy` (DATABASE_URL for localhost)
 *   - Backend: `cd backend && npm run dev` (API :3001, WS :8080 by default)
 *
 * Env:
 *   SMOKE_BASE_URL — API base (default http://127.0.0.1:3001)
 *   WS_URL — WebSocket URL (default ws://127.0.0.1:8080/trading — needs /trading for {type:ready})
 *   SMOKE_SKIP_WS=1 — skip WebSocket check
 *   SMOKE_STRICT=1 — exit 1 if API base is unreachable (default: warn only)
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function runNode(script, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, script)], {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, ...env },
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} exited ${code}`));
    });
    child.on("error", reject);
  });
}

async function probeHttp(base) {
  try {
    const r = await fetch(`${base.replace(/\/$/, "")}/api/v1/health`, {
      signal: AbortSignal.timeout(3000),
    });
    const text = await r.text();
    let j;
    try {
      j = JSON.parse(text);
    } catch {
      return { ok: false, reason: "not json" };
    }
    return { ok: r.ok && (j?.status === "ok" || j?.ok === true), body: j };
  } catch (e) {
    return { ok: false, reason: e?.cause?.code || e?.message || String(e) };
  }
}

async function main() {
  const base =
    process.env.SMOKE_BASE_URL ||
    process.env.VITE_API_URL ||
    "http://127.0.0.1:3001";
  const strict = process.env.SMOKE_STRICT === "1";

  console.log("\n=== Predictio runtime smoke ===\n");

  const probe = await probeHttp(base);
  if (!probe.ok) {
    console.warn(`WARN API not reachable (${probe.reason}) at ${base}`);
    console.warn(
      "      Start: docker compose -f docker-compose.dev.yml up -d",
    );
    console.warn(
      "      Then:  cd backend && npm run dev   (needs DATABASE_URL + prisma migrate deploy)",
    );
    if (strict) {
      process.exit(1);
    }
  } else {
    console.log(`OK  probe GET ${base}/api/v1/health`);
  }

  try {
    await runNode("scripts/smoke-endpoints.mjs", { SMOKE_BASE_URL: base });
  } catch (e) {
    console.error(e);
    if (strict) process.exit(1);
  }

  if (process.env.SMOKE_SKIP_WS === "1") {
    console.log("\nSKIP WS (SMOKE_SKIP_WS=1)\n");
    process.exit(0);
  }

  const wsPort = process.env.WS_PORT || "8080";
  const defaultWs = `ws://127.0.0.1:${wsPort}/trading`;
  const wsUrl = process.env.WS_URL || defaultWs;

  console.log(`\n--- WebSocket (${wsUrl}) ---\n`);
  try {
    await runNode("scripts/smoke-ws.mjs", {
      WS_URL: wsUrl,
      ...(strict ? {} : { SMOKE_ALLOW_DOWN: "1" }),
    });
  } catch (e) {
    console.warn(`WARN smoke-ws failed: ${e.message || e}`);
    console.warn(
      "      Ensure backend is running (WS on port " + wsPort + ", path /trading).",
    );
    if (strict) process.exit(1);
  }

  console.log("\n=== smoke-runtime finished ===\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
