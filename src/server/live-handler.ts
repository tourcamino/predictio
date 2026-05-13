import { defineEventHandler } from "vinxi/http";

/**
 * GET /api/live — process up (no DB). Use when probes must not depend on PostgreSQL.
 */
export default defineEventHandler(async () => {
  return new Response(
    JSON.stringify({
      ok: true,
      status: "live",
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
