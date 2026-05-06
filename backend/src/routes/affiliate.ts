import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { validate } from "../middleware/validate";
import {
  developerApiKeyForWrite,
  optionalDeveloperApiKey,
  rateLimitByApiKey,
  requireDeveloperPermission,
} from "../middleware/auth";
import { ApiError } from "../middleware/errors";

const router = Router();
const prisma = new PrismaClient();

const walletSchema = z
  .string()
  .trim()
  .transform((s) => s.toLowerCase())
  .refine((s) => /^0x[a-f0-9]{40}$/i.test(s), "Invalid wallet address");

const affiliateMeQuery = z.object({
  walletAddress: walletSchema.optional(),
});

const affiliateUpsertBody = z.object({
  walletAddress: walletSchema.optional(),
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
router.get("/affiliate/me", optionalDeveloperApiKey, validate({ query: affiliateMeQuery }), async (req, res, next) => {
  try {
    const authedWallet = (req as any).walletAddress as string | undefined;
    const queryWallet = (req.query as any).walletAddress as string | undefined;
    const walletAddress = authedWallet || queryWallet || null;
    if (!walletAddress) {
      throw new ApiError("Wallet not authenticated", { status: 401, code: "UNAUTHORIZED" });
    }
    if (authedWallet && queryWallet && authedWallet !== queryWallet) {
      throw new ApiError("Wallet mismatch", { status: 403, code: "WALLET_MISMATCH" });
    }

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
    return next(e);
  }
});

// POST /api/affiliate/me (create/update refCode)
router.post(
  "/affiliate/me",
  developerApiKeyForWrite,
  requireDeveloperPermission("trade"),
  rateLimitByApiKey({ windowMs: 60_000, max: 120, code: "WRITE_RATE_LIMITED" }),
  validate({ body: affiliateUpsertBody }),
  async (req, res, next) => {
  try {
    const authedWallet = (req as any).walletAddress as string | undefined;
    const bodyWallet = (req.body as any).walletAddress as string | undefined;
    const walletAddress = authedWallet || bodyWallet || null;
    if (!walletAddress) {
      throw new ApiError("Wallet not authenticated", { status: 401, code: "UNAUTHORIZED" });
    }
    if (authedWallet && bodyWallet && authedWallet !== bodyWallet) {
      throw new ApiError("Wallet mismatch", { status: 403, code: "WALLET_MISMATCH" });
    }

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
    return next(e);
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

