import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAdminKey } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// GET /api/admin/wallet/:walletAddress/keys
router.get("/admin/wallet/:walletAddress/keys", requireAdminKey, async (req, res) => {
  try {
    const walletAddress = String(req.params.walletAddress || "").toLowerCase();
    if (!/^0x[a-f0-9]{40}$/i.test(walletAddress)) {
      return res.status(400).json({ error: "Invalid walletAddress" });
    }

    const keys = await prisma.apiKey.findMany({
      where: { walletAddress },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        keyPrefix: true,
        keySuffix: true,
        label: true,
        permissions: true,
        createdAt: true,
        lastUsedAt: true,
        revokedAt: true,
        isActive: true,
        paperMode: true,
      },
    });

    const ids = keys.map((k) => k.id);
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const usageByKey = await prisma.apiUsage.groupBy({
      by: ["apiKeyId"],
      where: { apiKeyId: { in: ids }, timestamp: { gte: since } },
      _count: { _all: true },
      _avg: { latencyMs: true },
    });
    const usageMap = new Map(
      usageByKey.map((r) => [
        r.apiKeyId,
        { count24h: r._count._all, avgLatencyMs24h: r._avg.latencyMs },
      ]),
    );

    res.json({
      walletAddress,
      since,
      keys: keys.map((k) => ({
        ...k,
        usage24h: usageMap.get(k.id) || { count24h: 0, avgLatencyMs24h: null },
      })),
    });
  } catch (e) {
    console.error("[admin/wallet/keys] failed", e);
    res.status(500).json({ error: "Failed to fetch wallet keys" });
  }
});

// POST /api/admin/wallet/:walletAddress/disable-keys
// Revokes and disables all active keys for the wallet.
router.post("/admin/wallet/:walletAddress/disable-keys", requireAdminKey, async (req, res) => {
  try {
    const walletAddress = String(req.params.walletAddress || "").toLowerCase();
    if (!/^0x[a-f0-9]{40}$/i.test(walletAddress)) {
      return res.status(400).json({ error: "Invalid walletAddress" });
    }

    const result = await prisma.apiKey.updateMany({
      where: { walletAddress, revokedAt: null, isActive: true },
      data: { revokedAt: new Date(), isActive: false },
    });

    res.json({ walletAddress, disabled: result.count });
  } catch (e) {
    console.error("[admin/wallet/disable-keys] failed", e);
    res.status(500).json({ error: "Failed to disable keys" });
  }
});

export default router;

