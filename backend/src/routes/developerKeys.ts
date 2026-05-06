import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { generateAPIKey, hashAPIKey } from "../utils/apiKey";
import { requireAdminKey } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// GET /api/developer/keys?walletAddress=0x...
router.get("/developer/keys", requireAdminKey, async (req, res) => {
  try {
    const walletAddress = req.query.walletAddress
      ? String(req.query.walletAddress).toLowerCase()
      : null;
    if (!walletAddress) return res.status(400).json({ error: "Missing walletAddress" });

    const keys = await prisma.apiKey.findMany({
      where: { walletAddress, isActive: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        walletAddress: true,
        keyPrefix: true,
        keySuffix: true,
        label: true,
        createdAt: true,
        lastUsedAt: true,
        paperMode: true,
        isActive: true,
      },
    });

    res.json({ keys });
  } catch (e) {
    console.error("[developer/keys] list failed", e);
    res.status(500).json({ error: "Failed to fetch API keys" });
  }
});

// POST /api/developer/keys
// Body: { walletAddress, label?, paperMode? }
// Returns the plaintext key ONCE.
router.post("/developer/keys", requireAdminKey, async (req, res) => {
  try {
    const walletAddress = req.body?.walletAddress
      ? String(req.body.walletAddress).toLowerCase()
      : null;
    if (!walletAddress) return res.status(400).json({ error: "Missing walletAddress" });

    const { key, prefix } = generateAPIKey();
    const keyHash = await hashAPIKey(key);
    const keySuffix = key.slice(-4);

    const permissionsRaw = req.body?.permissions;
    const permissions =
      Array.isArray(permissionsRaw) && permissionsRaw.length > 0
        ? permissionsRaw.map((p: any) => String(p))
        : ["read", "trade", "stream"];

    const apiKey = await prisma.apiKey.create({
      data: {
        walletAddress,
        keyHash,
        keyPrefix: prefix,
        keySuffix,
        label: String(req.body?.label || "Default"),
        permissions,
        nonceUsed: "manual",
        paperMode: req.body?.paperMode !== false,
      },
    });

    res.status(201).json({
      apiKey: key,
      id: apiKey.id,
      keyPrefix: apiKey.keyPrefix,
      keySuffix: apiKey.keySuffix,
      permissions: apiKey.permissions,
      createdAt: apiKey.createdAt,
    });
  } catch (e) {
    console.error("[developer/keys] create failed", e);
    res.status(500).json({ error: "Failed to create API key" });
  }
});

// POST /api/developer/keys/revoke
// Body: { id } (revokes key by id)
router.post("/developer/keys/revoke", requireAdminKey, async (req, res) => {
  try {
    const id = req.body?.id ? String(req.body.id) : null;
    if (!id) return res.status(400).json({ error: "Missing id" });

    const row = await prisma.apiKey.findUnique({ where: { id } });
    if (!row) return res.status(404).json({ error: "Key not found" });

    await prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date(), isActive: false },
    });

    res.json({ revoked: true, id });
  } catch (e) {
    console.error("[developer/keys] revoke failed", e);
    res.status(500).json({ error: "Failed to revoke API key" });
  }
});

export default router;

