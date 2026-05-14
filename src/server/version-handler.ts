import { defineEventHandler } from "vinxi/http";

import { getDeployRuntimeMeta } from "./lib/deployRuntimeMeta";

/**
 * GET /api/version — deploy identity (commit / branch / env) for production verification.
 * Dependency-light (no Prisma), same constraints as `health-handler.ts`.
 */
export default defineEventHandler(async () => {
  const body = {
    ok: true,
    ...getDeployRuntimeMeta(),
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
});
