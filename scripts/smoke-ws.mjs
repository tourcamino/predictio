/**
 * Predictio WS smoke (optional).
 *
 * Usage:
 *   WS_URL=wss://api.predictio.live/ws BOT_API_KEY=... node ./scripts/smoke-ws.mjs
 *
 * Notes:
 * - If WS_AUTH_REQUIRED=1 on server, BOT_API_KEY is required.
 * - The backend sends {type:"ready"} after auth; we wait for it before ping/subscribe.
 */
import WebSocket from "ws";

const wsUrl = process.env.WS_URL || "";
const botKey = process.env.BOT_API_KEY || "";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  assert(wsUrl, "WS_URL is required (e.g. wss://api.predictio.live/ws)");

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
      reject(e);
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
  console.error(e);
  process.exit(1);
});

