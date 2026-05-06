import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET /api/copy?copierWallet=0x...
router.get("/copy", async (req, res) => {
  try {
    const copierWallet = req.query.copierWallet
      ? String(req.query.copierWallet).toLowerCase()
      : undefined;

    const relationships = await prisma.copyRelationship.findMany({
      where: copierWallet ? { copierWallet } : undefined,
      orderBy: { startedAt: "desc" },
    });

    res.json({ relationships });
  } catch (e) {
    console.error("[copy] list failed", e);
    res.status(500).json({ error: "Failed to fetch copy relationships" });
  }
});

// POST /api/copy
// Body: { action: "start"|"stop", copierWallet, analystWallet, maxPerTradeUsd, copyMode, selectedMarkets }
router.post("/copy", async (req, res) => {
  try {
    const { action, copierWallet, analystWallet } = req.body ?? {};

    if (!action || (action !== "start" && action !== "stop")) {
      return res.status(400).json({ error: "Invalid action" });
    }
    if (!copierWallet || !analystWallet) {
      return res.status(400).json({ error: "Missing copierWallet or analystWallet" });
    }

    const copier = String(copierWallet).toLowerCase();
    const analyst = String(analystWallet).toLowerCase();

    if (action === "stop") {
      const updated = await prisma.copyRelationship.update({
        where: { copierWallet_analystWallet: { copierWallet: copier, analystWallet: analyst } },
        data: { isActive: false, endedAt: new Date() },
      });
      return res.json({ relationship: updated });
    }

    const maxPerTradeUsd = Number(req.body.maxPerTradeUsd || 50);
    const copyMode = String(req.body.copyMode || "all");
    const selectedMarkets = Array.isArray(req.body.selectedMarkets)
      ? req.body.selectedMarkets.map((x: any) => String(x))
      : [];

    const relationship = await prisma.copyRelationship.upsert({
      where: { copierWallet_analystWallet: { copierWallet: copier, analystWallet: analyst } },
      create: {
        copierWallet: copier,
        analystWallet: analyst,
        maxPerTradeUsd,
        copyMode,
        selectedMarkets,
        isActive: true,
      },
      update: {
        maxPerTradeUsd,
        copyMode,
        selectedMarkets,
        isActive: true,
        endedAt: null,
      },
    });

    res.status(201).json({ relationship });
  } catch (e) {
    console.error("[copy] update failed", e);
    res.status(500).json({ error: "Failed to update copy settings" });
  }
});

export default router;

