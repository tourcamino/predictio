import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { generateAPIKey, hashAPIKey } from "../utils/apiKey";

const router = Router();
const prisma = new PrismaClient();

// GET /api/developer/keys?walletAddress=0x...
router.get("/developer/keys", async (req, res) => {
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
router.post("/developer/keys", async (req, res) => {
  try {
    const walletAddress = req.body?.walletAddress
      ? String(req.body.walletAddress).toLowerCase()
      : null;
    if (!walletAddress) return res.status(400).json({ error: "Missing walletAddress" });

    const { key, prefix } = generateAPIKey();
    const keyHash = await hashAPIKey(key);
    const keySuffix = key.slice(-4);

    const apiKey = await prisma.apiKey.create({
      data: {
        walletAddress,
        keyHash,
        keyPrefix: prefix,
        keySuffix,
        label: String(req.body?.label || "Default"),
        permissions: ["read", "trade", "stream"],
        nonceUsed: "manual",
        paperMode: req.body?.paperMode !== false,
      },
    });

    res.status(201).json({
      apiKey: key,
      id: apiKey.id,
      keyPrefix: apiKey.keyPrefix,
      keySuffix: apiKey.keySuffix,
      createdAt: apiKey.createdAt,
    });
  } catch (e) {
    console.error("[developer/keys] create failed", e);
    res.status(500).json({ error: "Failed to create API key" });
  }
});

export default router;

