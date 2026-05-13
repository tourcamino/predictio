import { defineEventHandler } from "vinxi/http";

/**
 * GET /api/health — app liveness probe.
 *
 * Keep this route dependency-light: Nitro bundles all HTTP routers together, and pulling Prisma into
 * this handler breaks local node-server builds when pnpm-style node_modules are present.
 */
export default defineEventHandler(async () => {
  return new Response(
    JSON.stringify({
      ok: true,
      service: "predictio-web",
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
    },
  );
});
