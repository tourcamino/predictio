import { defineEventHandler, setResponseHeader } from "h3";

/**
 * GET /api/live — process up (no DB). Use when probes must not depend on PostgreSQL.
 */
export default defineEventHandler(async (event) => {
  const res = event.node?.res;
  if (!res) {
    return '{"ok":false}';
  }

  setResponseHeader(event, "Content-Type", "application/json; charset=utf-8");
  res.statusCode = 200;
  return JSON.stringify({
    ok: true,
    status: "live",
    timestamp: new Date().toISOString(),
  });
});
