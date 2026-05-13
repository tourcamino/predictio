import { defineEventHandler, setResponseHeader } from "h3";

/**
 * GET /api/health — app liveness probe.
 *
 * Keep this route dependency-light: Nitro bundles all HTTP routers together, and pulling Prisma into
 * this handler breaks local node-server builds when pnpm-style node_modules are present.
 */
export default defineEventHandler(async (event) => {
  const res = event.node?.res;
  if (!res) {
    return '{"ok":false,"error":"bad_gateway"}';
  }

  setResponseHeader(event, "Content-Type", "application/json; charset=utf-8");

  res.statusCode = 200;
  return JSON.stringify({
    ok: true,
    service: "predictio-web",
    timestamp: new Date().toISOString(),
  });
});
