/**
 * Predictio WS smoke (optional).
 *
 * Usage:
 *   WS_URL=wss://host/ws/trading BOT_API_KEY=... node ./scripts/smoke-ws.mjs
 *
 * Notes:
 * - Local backend: use URL path /trading (or /ws/trading) so the server sends type ready on connect.
 * - Default: ws://127.0.0.1:8080/trading (override WS_PORT)
 * - If WS_AUTH_REQUIRED=1 on server, use a valid developer apiKey query param or Bearer token as configured.
 */
import WebSocket from "ws";

const wsPort = process.env.WS_PORT || "8080";
const wsUrl =
  process.env.WS_URL || `ws://127.0.0.1:${wsPort}/trading`;
const botKey = process.env.BOT_API_KEY || "";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log(`smoke-ws url=${wsUrl}`);

  const headers = {};
  if (botKey) headers.authorization = `Bearer ${botKey}`;

  const ws = new WebSocket(wsUrl, { headers });

  const timeoutMs = Number(process.env.WS_SMOKE_TIMEOUT_MS || 15000);

  const ready = await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("WS timeout waiting for ready")), timeoutMs);

    ws.on("open", () => {
      // nothing; server should send ready when auth is done
    });
    ws.on("error", (e) => {
      clearTimeout(t);
      reject(e instanceof Error ? e : new Error(String(e)));
    });
    ws.on("message", (buf) => {
      let msg;
      try {
        msg = JSON.parse(String(buf));
      } catch {
        return;
      }
      if (msg?.type === "ready") {
        clearTimeout(t);
        resolve(true);
      }
      if (msg?.type === "error") {
        clearTimeout(t);
        reject(new Error(`WS error: ${JSON.stringify(msg)}`));
      }
    });
  });
  assert(ready === true, "WS did not become ready");
  console.log("OK  ws ready");

  // Ping/pong smoke (app-level)
  const pong = await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("WS timeout waiting for pong")), timeoutMs);
    ws.send(JSON.stringify({ type: "ping" }));
    ws.on("message", (buf) => {
      let msg;
      try {
        msg = JSON.parse(String(buf));
      } catch {
        return;
      }
      if (msg?.type === "pong") {
        clearTimeout(t);
        resolve(true);
      }
    });
  });
  assert(pong === true, "No pong received");
  console.log("OK  ws ping/pong");

  ws.close(1000, "smoke done");
  console.log("smoke:ws passed");
}

main().catch((e) => {
  const code = e?.code || e?.cause?.code;
  const msg = e instanceof Error ? e.message : String(e);
  const down =
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    /ECONNREFUSED|ENOTFOUND/i.test(msg);
  if (process.env.SMOKE_ALLOW_DOWN === "1" && down) {
    console.warn(`WARN smoke-ws skipped (${code || msg})`);
    process.exit(0);
  }
  console.error(e);
  process.exit(1);
});

