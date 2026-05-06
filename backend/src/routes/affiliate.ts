import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET /api/affiliate/me?walletAddress=0x...
router.get("/affiliate/me", async (req, res) => {
  try {
    const walletAddress = req.query.walletAddress
      ? String(req.query.walletAddress).toLowerCase()
      : null;
    if (!walletAddress) return res.status(400).json({ error: "Missing walletAddress" });

    const affiliate = await prisma.affiliate.findUnique({
      where: { walletAddress },
    });
    const rewards = await prisma.affiliateReward.findMany({
      where: { walletAddress },
      take: 50,
      orderBy: { createdAt: "desc" },
    });

    res.json({ affiliate, rewards });
  } catch (e) {
    console.error("[affiliate] me failed", e);
    res.status(500).json({ error: "Failed to fetch affiliate" });
  }
});

// POST /api/affiliate/me (create/update refCode)
router.post("/affiliate/me", async (req, res) => {
  try {
    const walletAddress = req.body?.walletAddress
      ? String(req.body.walletAddress).toLowerCase()
      : null;
    if (!walletAddress) return res.status(400).json({ error: "Missing walletAddress" });

    const refCode = req.body?.refCode ? String(req.body.refCode).toUpperCase() : null;
    const isFounder = Boolean(req.body?.isFounder);

    const affiliate = await prisma.affiliate.upsert({
      where: { walletAddress },
      create: {
        walletAddress,
        refCode: refCode || `REF-${Date.now().toString(36).toUpperCase()}`,
        isFounder,
      },
      update: refCode ? { refCode, isFounder } : { isFounder },
    });

    res.status(201).json({ affiliate });
  } catch (e) {
    console.error("[affiliate] upsert failed", e);
    res.status(500).json({ error: "Failed to update affiliate" });
  }
});

// GET /api/affiliate/stats/:code
router.get("/affiliate/stats/:code", async (req, res) => {
  try {
    const code = String(req.params.code).toUpperCase();
    const affiliate = await prisma.affiliate.findUnique({
      where: { refCode: code },
    });
    if (!affiliate) return res.status(404).json({ error: "Affiliate not found" });

    res.json({
      refCode: affiliate.refCode,
      walletAddress: affiliate.walletAddress,
      totalReferrals: affiliate.totalReferrals,
      totalVolumeUsd: affiliate.totalVolumeUsd,
      totalRewardsUsd: affiliate.totalRewardsUsd,
      pendingRewardsUsd: affiliate.pendingRewardsUsd,
      pendingRewardsEur: affiliate.pendingRewardsEur,
      lastPayoutAt: affiliate.lastPayoutAt,
    });
  } catch (e) {
    console.error("[affiliate] stats failed", e);
    res.status(500).json({ error: "Failed to fetch affiliate stats" });
  }
});

export default router;

