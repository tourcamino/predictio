import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAdminKey } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

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

export default router;

