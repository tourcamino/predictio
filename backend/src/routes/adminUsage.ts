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

export default router;

