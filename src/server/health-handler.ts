import { defineEventHandler, setResponseHeader } from "h3";
import { db } from "~/server/db";

/**
 * GET /api/health — liveness + PostgreSQL connectivity (for Nginx/VPS probes).
 */
export default defineEventHandler(async (event) => {
  const res = event.node?.res;
  if (!res) {
    return '{"ok":false,"error":"bad_gateway"}';
  }

  setResponseHeader(event, "Content-Type", "application/json; charset=utf-8");

  const payload = (ok: boolean, dbStatus: string) =>
    JSON.stringify({
      ok,
      db: dbStatus,
      timestamp: new Date().toISOString(),
    });

  try {
    await db.$queryRaw`SELECT 1`;
    res.statusCode = 200;
    return payload(true, "up");
  } catch (err) {
    console.error("[health] database check failed:", err);
    res.statusCode = 503;
    return payload(false, "down");
  }
});
