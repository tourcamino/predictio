import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAdminKey } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// GET /api/admin/usage?walletAddress=0x...&apiKeyId=...&limit=...&offset=...
router.get("/admin/usage", requireAdminKey, async (req, res) => {
  try {
    const walletAddress = req.query.walletAddress
      ? String(req.query.walletAddress).toLowerCase()
      : undefined;
    const apiKeyId = req.query.apiKeyId ? String(req.query.apiKeyId) : undefined;
    const limit = Math.min(500, Math.max(1, Number(req.query.limit || 100)));
    const offset = Math.max(0, Number(req.query.offset || 0));

    let apiKeyIds: string[] | undefined = undefined;
    if (walletAddress) {
      const keys = await prisma.apiKey.findMany({
        where: { walletAddress },
        select: { id: true },
        take: 200,
      });
      apiKeyIds = keys.map((k) => k.id);
    }

    const where: any = {};
    if (apiKeyId) where.apiKeyId = apiKeyId;
    if (apiKeyIds) where.apiKeyId = { in: apiKeyIds };

    const usage = await prisma.apiUsage.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { timestamp: "desc" },
    });

    res.json({ usage, limit, offset });
  } catch (e) {
    console.error("[admin/usage] list failed", e);
    res.status(500).json({ error: "Failed to fetch usage" });
  }
});

// GET /api/admin/usage/export.json?days=1&walletAddress=0x...&apiKeyId=...
router.get("/admin/usage/export.json", requireAdminKey, async (req, res) => {
  try {
    const days = Math.min(90, Math.max(1, Number(req.query.days || 1)));
    const walletAddress = req.query.walletAddress
      ? String(req.query.walletAddress).toLowerCase()
      : undefined;
    const apiKeyId = req.query.apiKeyId ? String(req.query.apiKeyId) : undefined;
    const since = new Date(Date.now() - days * 86400 * 1000);

    let apiKeyIds: string[] | undefined = undefined;
    if (walletAddress) {
      const keys = await prisma.apiKey.findMany({
        where: { walletAddress },
        select: { id: true },
        take: 200,
      });
      apiKeyIds = keys.map((k) => k.id);
    }

    const where: any = { timestamp: { gte: since } };
    if (apiKeyId) where.apiKeyId = apiKeyId;
    if (apiKeyIds) where.apiKeyId = { in: apiKeyIds };

    const usage = await prisma.apiUsage.findMany({
      where,
      take: 5000,
      orderBy: { timestamp: "desc" },
    });

    res.json({ since, days, usage });
  } catch (e) {
    console.error("[admin/usage] export.json failed", e);
    res.status(500).json({ error: "Failed to export usage" });
  }
});

// GET /api/admin/usage/export.csv?days=1&walletAddress=0x...&apiKeyId=...
router.get("/admin/usage/export.csv", requireAdminKey, async (req, res) => {
  try {
    const days = Math.min(90, Math.max(1, Number(req.query.days || 1)));
    const walletAddress = req.query.walletAddress
      ? String(req.query.walletAddress).toLowerCase()
      : undefined;
    const apiKeyId = req.query.apiKeyId ? String(req.query.apiKeyId) : undefined;
    const since = new Date(Date.now() - days * 86400 * 1000);

    let apiKeyIds: string[] | undefined = undefined;
    if (walletAddress) {
      const keys = await prisma.apiKey.findMany({
        where: { walletAddress },
        select: { id: true },
        take: 200,
      });
      apiKeyIds = keys.map((k) => k.id);
    }

    const where: any = { timestamp: { gte: since } };
    if (apiKeyId) where.apiKeyId = apiKeyId;
    if (apiKeyIds) where.apiKeyId = { in: apiKeyIds };

    const usage = await prisma.apiUsage.findMany({
      where,
      take: 5000,
      orderBy: { timestamp: "desc" },
    });

    res.setHeader("content-type", "text/csv; charset=utf-8");
    res.setHeader("content-disposition", `attachment; filename="api-usage-${days}d.csv"`);
    res.write(["timestamp", "apiKeyId", "endpoint", "method", "statusCode", "latencyMs"].join(",") + "\n");
    for (const row of usage) {
      res.write(
        [
          csvEscape(row.timestamp.toISOString()),
          csvEscape(row.apiKeyId),
          csvEscape(row.endpoint),
          csvEscape(row.method),
          csvEscape(row.statusCode),
          csvEscape(row.latencyMs ?? ""),
        ].join(",") + "\n",
      );
    }
    res.end();
  } catch (e) {
    console.error("[admin/usage] export.csv failed", e);
    res.status(500).json({ error: "Failed to export usage" });
  }
});

// GET /api/admin/usage/summary?days=1&walletAddress=0x...
router.get("/admin/usage/summary", requireAdminKey, async (req, res) => {
  try {
    const days = Math.min(90, Math.max(1, Number(req.query.days || 1)));
    const walletAddress = req.query.walletAddress
      ? String(req.query.walletAddress).toLowerCase()
      : undefined;

    let apiKeyIds: string[] | undefined = undefined;
    if (walletAddress) {
      const keys = await prisma.apiKey.findMany({
        where: { walletAddress },
        select: { id: true },
        take: 200,
      });
      apiKeyIds = keys.map((k) => k.id);
    }

    const since = new Date(Date.now() - days * 86400 * 1000);
    const rows = await prisma.apiUsage.groupBy({
      by: ["apiKeyId", "endpoint", "method", "statusCode"],
      where: {
        timestamp: { gte: since },
        ...(apiKeyIds ? { apiKeyId: { in: apiKeyIds } } : {}),
      },
      _count: { _all: true },
      _avg: { latencyMs: true },
      // Note: Prisma requires orderBy when using take/skip; we sort+slice in JS instead.
    });

    const sorted = rows.sort((a, b) => (b._count?._all ?? 0) - (a._count?._all ?? 0)).slice(0, 200);
    res.json({ since, days, rows: sorted });
  } catch (e) {
    console.error("[admin/usage] summary failed", e);
    res.status(500).json({ error: "Failed to fetch usage summary" });
  }
});

// POST /api/admin/usage/purge
// Body: { olderThanDays?: number } (default: 30)
router.post("/admin/usage/purge", requireAdminKey, async (req, res) => {
  try {
    const days = Math.min(365, Math.max(1, Number(req.body?.olderThanDays || 30)));
    const cutoff = new Date(Date.now() - days * 86400 * 1000);
    const result = await prisma.apiUsage.deleteMany({
      where: { timestamp: { lt: cutoff } },
    });
    res.json({ deleted: result.count, olderThanDays: days, cutoff });
  } catch (e) {
    console.error("[admin/usage] purge failed", e);
    res.status(500).json({ error: "Failed to purge usage" });
  }
});

// GET /api/admin/usage/by-wallet?days=1&limit=50
router.get("/admin/usage/by-wallet", requireAdminKey, async (req, res) => {
  try {
    const days = Math.min(90, Math.max(1, Number(req.query.days || 1)));
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
    const since = new Date(Date.now() - days * 86400 * 1000);

    const byKey = await prisma.apiUsage.groupBy({
      by: ["apiKeyId"],
      where: { timestamp: { gte: since } },
      _count: { _all: true },
      _avg: { latencyMs: true },
    });

    const keyIds = byKey.map((r) => r.apiKeyId);
    const keys = await prisma.apiKey.findMany({
      where: { id: { in: keyIds } },
      select: { id: true, walletAddress: true },
      take: 500,
    });
    const walletByKey = new Map(keys.map((k) => [k.id, k.walletAddress]));

    const agg = new Map<string, { calls: number; weightedLatency: number; keys: Set<string> }>();
    for (const r of byKey) {
      const wallet = walletByKey.get(r.apiKeyId) || "unknown";
      const calls = r._count._all;
      const avg = r._avg.latencyMs ?? 0;
      const rec = agg.get(wallet) || { calls: 0, weightedLatency: 0, keys: new Set<string>() };
      rec.calls += calls;
      rec.weightedLatency += avg * calls;
      rec.keys.add(r.apiKeyId);
      agg.set(wallet, rec);
    }

    const rows = Array.from(agg.entries())
      .map(([walletAddress, v]) => ({
        walletAddress,
        calls: v.calls,
        apiKeys: v.keys.size,
        avgLatencyMs: v.calls > 0 ? v.weightedLatency / v.calls : null,
      }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, limit);

    res.json({ since, days, rows });
  } catch (e) {
    console.error("[admin/usage] by-wallet failed", e);
    res.status(500).json({ error: "Failed to fetch usage by wallet" });
  }
});

// GET /api/admin/usage/by-endpoint?days=1&limit=50
router.get("/admin/usage/by-endpoint", requireAdminKey, async (req, res) => {
  try {
    const days = Math.min(90, Math.max(1, Number(req.query.days || 1)));
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
    const since = new Date(Date.now() - days * 86400 * 1000);

    const rows = await prisma.apiUsage.groupBy({
      by: ["endpoint", "method", "statusCode"],
      where: { timestamp: { gte: since } },
      _count: { _all: true },
      _avg: { latencyMs: true },
    });

    const sorted = rows
      .map((r) => ({
        endpoint: r.endpoint,
        method: r.method,
        statusCode: r.statusCode,
        calls: r._count._all,
        avgLatencyMs: r._avg.latencyMs,
      }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, limit);

    res.json({ since, days, rows: sorted });
  } catch (e) {
    console.error("[admin/usage] by-endpoint failed", e);
    res.status(500).json({ error: "Failed to fetch usage by endpoint" });
  }
});

export default router;

