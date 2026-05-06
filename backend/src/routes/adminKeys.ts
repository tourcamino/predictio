import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAdminKey } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// GET /api/admin/keys?walletAddress=0x...&active=1&revoked=0&limit=...
router.get("/admin/keys", requireAdminKey, async (req, res) => {
  try {
    const walletAddress = req.query.walletAddress
      ? String(req.query.walletAddress).toLowerCase()
      : undefined;
    const active = req.query.active != null ? String(req.query.active) : undefined;
    const revoked = req.query.revoked != null ? String(req.query.revoked) : undefined;
    const limit = Math.min(500, Math.max(1, Number(req.query.limit || 100)));

    const where: any = {};
    if (walletAddress) where.walletAddress = walletAddress;
    if (active != null) where.isActive = active === "1" || active.toLowerCase() === "true";
    if (revoked != null) {
      const wantRevoked = revoked === "1" || revoked.toLowerCase() === "true";
      where.revokedAt = wantRevoked ? { not: null } : null;
    }

    const keys = await prisma.apiKey.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        walletAddress: true,
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

    res.json({ keys, limit });
  } catch (e) {
    console.error("[admin/keys] list failed", e);
    res.status(500).json({ error: "Failed to fetch keys" });
  }
});

export default router;

