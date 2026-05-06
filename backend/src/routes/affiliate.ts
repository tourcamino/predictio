import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { validate } from "../middleware/validate";

const router = Router();
const prisma = new PrismaClient();

const walletSchema = z
  .string()
  .trim()
  .transform((s) => s.toLowerCase())
  .refine((s) => /^0x[a-f0-9]{40}$/i.test(s), "Invalid wallet address");

const affiliateMeQuery = z.object({
  walletAddress: walletSchema,
});

const affiliateUpsertBody = z.object({
  walletAddress: walletSchema,
  refCode: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[A-Z0-9_-]+$/i, "Invalid refCode")
    .optional(),
  isFounder: z.coerce.boolean().optional(),
});

// GET /api/affiliate/me?walletAddress=0x...
router.get("/affiliate/me", validate({ query: affiliateMeQuery }), async (req, res) => {
  try {
    const walletAddress = (req.query as any).walletAddress as string;

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
router.post("/affiliate/me", validate({ body: affiliateUpsertBody }), async (req, res) => {
  try {
    const walletAddress = (req.body as any).walletAddress as string;
    const refCode = (req.body as any).refCode ? String((req.body as any).refCode).toUpperCase() : null;
    const isFounder = Boolean((req.body as any)?.isFounder);

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

