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

// GET /api/admin/keys/export.csv?walletAddress=0x...&active=1&revoked=0
router.get("/admin/keys/export.csv", requireAdminKey, async (req, res) => {
  try {
    const walletAddress = req.query.walletAddress
      ? String(req.query.walletAddress).toLowerCase()
      : undefined;
    const active = req.query.active != null ? String(req.query.active) : undefined;
    const revoked = req.query.revoked != null ? String(req.query.revoked) : undefined;

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
      take: 5000,
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

    res.setHeader("content-type", "text/csv; charset=utf-8");
    res.setHeader("content-disposition", `attachment; filename="api-keys.csv"`);
    res.write(
      [
        "id",
        "walletAddress",
        "keyPrefix",
        "keySuffix",
        "label",
        "permissions",
        "createdAt",
        "lastUsedAt",
        "revokedAt",
        "isActive",
        "paperMode",
      ].join(",") + "\n",
    );
    for (const k of keys) {
      res.write(
        [
          csvEscape(k.id),
          csvEscape(k.walletAddress),
          csvEscape(k.keyPrefix),
          csvEscape(k.keySuffix),
          csvEscape(k.label),
          csvEscape(JSON.stringify(k.permissions ?? null)),
          csvEscape(k.createdAt.toISOString()),
          csvEscape(k.lastUsedAt ? k.lastUsedAt.toISOString() : ""),
          csvEscape(k.revokedAt ? k.revokedAt.toISOString() : ""),
          csvEscape(k.isActive),
          csvEscape(k.paperMode),
        ].join(",") + "\n",
      );
    }
    res.end();
  } catch (e) {
    console.error("[admin/keys] export.csv failed", e);
    res.status(500).json({ error: "Failed to export keys" });
  }
});

export default router;

