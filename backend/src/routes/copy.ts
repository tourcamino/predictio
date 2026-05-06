import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { developerApiKeyForWrite, rateLimitByApiKey } from "../middleware/auth";
import { ApiError } from "../middleware/errors";

const router = Router();
const prisma = new PrismaClient();

const walletSchema = z
  .string()
  .trim()
  .transform((s) => s.toLowerCase())
  .refine((s) => /^0x[a-f0-9]{40}$/i.test(s), "Invalid wallet address");

const copyListQuery = z.object({
  copierWallet: walletSchema.optional(),
});

const copyUpsertBody = z.object({
  action: z.enum(["start", "stop"]),
  copierWallet: walletSchema,
  analystWallet: walletSchema,
  maxPerTradeUsd: z.coerce.number().positive().max(1_000_000).optional(),
  copyMode: z.string().trim().optional(),
  selectedMarkets: z.array(z.string().trim().min(1)).optional(),
});

// GET /api/copy?copierWallet=0x...
router.get("/copy", validate({ query: copyListQuery }), async (req, res, next) => {
  try {
    const copierWallet = (req.query as any).copierWallet as string | undefined;

    const relationships = await prisma.copyRelationship.findMany({
      where: copierWallet ? { copierWallet } : undefined,
      orderBy: { startedAt: "desc" },
    });

    res.json({ relationships });
  } catch (e) {
    return next(e);
  }
});

// POST /api/copy
// Body: { action: "start"|"stop", copierWallet, analystWallet, maxPerTradeUsd, copyMode, selectedMarkets }
router.post(
  "/copy",
  developerApiKeyForWrite,
  rateLimitByApiKey({ windowMs: 60_000, max: 120, code: "WRITE_RATE_LIMITED" }),
  validate({ body: copyUpsertBody }),
  async (req, res, next) => {
  try {
    const authedWallet = (req as any).walletAddress as string | undefined;
    const { action, copierWallet, analystWallet } = req.body as any;

    const copier = String(copierWallet).toLowerCase();
    const analyst = String(analystWallet).toLowerCase();

    if (authedWallet && authedWallet !== copier) {
      throw new ApiError("Wallet mismatch", { status: 403, code: "WALLET_MISMATCH" });
    }

    if (action === "stop") {
      const updated = await prisma.copyRelationship.update({
        where: { copierWallet_analystWallet: { copierWallet: copier, analystWallet: analyst } },
        data: { isActive: false, endedAt: new Date() },
      });
      return res.json({ relationship: updated });
    }

    const maxPerTradeUsd = Number((req.body as any).maxPerTradeUsd || 50);
    const copyMode = String((req.body as any).copyMode || "all");
    const selectedMarkets = Array.isArray((req.body as any).selectedMarkets)
      ? (req.body as any).selectedMarkets.map((x: any) => String(x))
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
    return next(e);
  }
});

export default router;

