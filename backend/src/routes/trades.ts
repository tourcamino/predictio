import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { calculateFeeSplit, persistFeeSplit } from "../services/fees";
import { getReferralCodeFromRequest } from "../middleware/referral";
import { validate } from "../middleware/validate";
import { realtimeBus } from "../services/realtimeBus";
import {
  developerApiKeyForWrite,
  rateLimitByApiKey,
  requireDeveloperPermission,
} from "../middleware/auth";
import { ApiError } from "../middleware/errors";
import { idempotency } from "../middleware/idempotency";

const router = Router();
const prisma = new PrismaClient();

const walletSchema = z
  .string()
  .trim()
  .transform((s) => s.toLowerCase())
  .refine((s) => /^0x[a-f0-9]{40}$/i.test(s), "Invalid wallet address");

const listTradesQuery = z.object({
  walletAddress: walletSchema.optional(),
  marketId: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const createTradeBody = z.object({
  marketId: z.string().trim().min(1),
  outcome: z.string().trim().min(1),
  amountUsd: z.coerce.number().positive(),
  walletAddress: walletSchema.optional(),
  analystWallet: walletSchema.optional().nullable(),
  referralWallet: walletSchema.optional().nullable(),
});

function getWalletFromReq(req: any): string | null {
  const w =
    (req.headers["x-wallet-address"] as string | undefined) ||
    (req.headers["x-wallet"] as string | undefined) ||
    (req.body?.walletAddress as string | undefined) ||
    (req.query?.walletAddress as string | undefined);
  return w ? String(w).toLowerCase() : null;
}

// GET /api/trades?walletAddress=0x...&marketId=...&limit=...&offset=...
router.get("/trades", validate({ query: listTradesQuery }), async (req, res, next) => {
  try {
    const { walletAddress, marketId } = req.query as any;
    const limit = Number((req.query as any).limit || 50);
    const offset = Number((req.query as any).offset || 0);

    const where: any = {};
    if (walletAddress) where.wallet = walletAddress;
    if (marketId) where.marketId = marketId;

    const orders = await prisma.order.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    });

    res.json({ trades: orders, total: orders.length, page: Math.floor(offset / limit) + 1 });
  } catch (e) {
    return next(e);
  }
});

// POST /api/trades
// Body: { marketId, outcome, amountUsd, walletAddress?, analystWallet?, referralWallet? }
router.post(
  "/trades",
  developerApiKeyForWrite,
  requireDeveloperPermission("trade"),
  rateLimitByApiKey({ windowMs: 60_000, max: 120, code: "WRITE_RATE_LIMITED" }),
  idempotency(),
  validate({ body: createTradeBody }),
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

    const { marketId, outcome, amountUsd, analystWallet, referralWallet } = req.body as any;
    const size = Number(amountUsd);

    const market = await prisma.market.findUnique({ where: { id: marketId } });
    if (!market || market.status !== "open") {
      return res.status(400).json({ error: "Market not available" });
    }

    // Price model is still simplified in demo mode.
    const avgPrice = 0.65;
    const shares = size / avgPrice;

    const order = await prisma.order.create({
      data: {
        marketId,
        wallet: walletAddress,
        outcome: outcome.toUpperCase(),
        amount: size,
        shares,
        avgPrice,
        orderType: "MARKET",
        status: "open",
      },
    });

    await prisma.market.update({
      where: { id: marketId },
      data: {
        volume: { increment: size },
        predictions: { increment: 1 },
      },
    });

    // Resolve referral wallet (cookie/query → refCode → affiliate wallet)
    let resolvedReferralWallet: string | null =
      referralWallet ? String(referralWallet).toLowerCase() : null;

    if (!resolvedReferralWallet) {
      const refCode = getReferralCodeFromRequest(req);
      if (refCode) {
        const affiliate = await prisma.affiliate.findUnique({ where: { refCode } });
        resolvedReferralWallet = affiliate?.walletAddress?.toLowerCase() || null;
      }
    }

    // Founder rule: users without referral are attributed to PREDICTIO for tracking,
    // but founder does not earn referral rewards (handled by fee engine founder exclusion).
    if (!resolvedReferralWallet) {
      const founderRefCode = (process.env.FOUNDER_REF_CODE || "PREDICTIO").toUpperCase();
      await prisma.referralTracking
        .upsert({
          where: { referredWallet: walletAddress },
          create: {
            refCode: founderRefCode,
            referredWallet: walletAddress,
            cookieExpires: new Date(
              Date.now() + Number(process.env.REFERRAL_COOKIE_DAYS || 120) * 86400 * 1000
            ),
            isActive: true,
          },
          update: {
            refCode: founderRefCode,
            isActive: true,
          },
        })
        .catch(() => null);
    } else {
      // Track attribution for this wallet as well (refCode can be backfilled later)
      await prisma.referralTracking
        .upsert({
          where: { referredWallet: walletAddress },
          create: {
            refCode: "UNKNOWN",
            referredWallet: walletAddress,
            cookieExpires: new Date(
              Date.now() + Number(process.env.REFERRAL_COOKIE_DAYS || 120) * 86400 * 1000
            ),
            isActive: true,
          },
          update: { isActive: true },
        })
        .catch(() => null);
    }

    const split = calculateFeeSplit({
      tradeId: order.id,
      traderWallet: walletAddress,
      volumeUsd: size,
      analystWallet: analystWallet || null,
      referralWallet: resolvedReferralWallet,
    });

    await prisma.transaction.create({
      data: {
        wallet: walletAddress,
        type: "trade",
        amount: size,
        marketId,
        orderId: order.id,
        status: "completed",
        feePaid: split.feeTotalUsd,
        metadata: {
          outcome: outcome.toUpperCase(),
          feeSplit: {
            vault: split.vaultUsd,
            analyst: split.analystUsd,
            referral: split.referralUsd,
            treasury: split.treasuryUsd,
          },
        },
      },
    });

    await persistFeeSplit({
      prisma,
      input: {
        tradeId: order.id,
        traderWallet: walletAddress,
        volumeUsd: size,
        analystWallet: analystWallet || null,
        referralWallet: resolvedReferralWallet,
      },
      split,
    });

    realtimeBus.emitMessage({
      type: "trade",
      marketId,
      data: {
        id: order.id,
        marketId,
        wallet: walletAddress,
        outcome: outcome.toUpperCase(),
        amountUsd: size,
        createdAt: order.createdAt,
        feeTotalUsd: split.feeTotalUsd,
      },
      timestamp: Date.now(),
    });

    res.status(201).json({
      trade: order,
      fee: {
        totalUsd: split.feeTotalUsd,
        vaultUsd: split.vaultUsd,
        analystUsd: split.analystUsd,
        referralUsd: split.referralUsd,
        treasuryUsd: split.treasuryUsd,
      },
    });
  } catch (e) {
    return next(e);
  }
});

export default router;

