import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import {
  calculateFeeSplit,
  persistFeeSplit,
  TAKER_FEE_RATE,
} from "../services/fees";
import { getReferralCodeFromRequest } from "../middleware/referral";
import { validate } from "../middleware/validate";
import { realtimeBus } from "../services/realtimeBus";
import { mirrorTradeToActiveCopiers } from "../services/mirrorCopyTrades";
import {
  developerApiKeyForWrite,
  rateLimitByApiKey,
  requireDeveloperPermission,
} from "../middleware/auth";
import { ApiError } from "../middleware/errors";
import { idempotency } from "../middleware/idempotency";
import { newPurchaseRequestId, logPurchaseFlowExpress } from "../lib/purchaseFlowDiagnostic";

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

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      trades: orders,
      total,
      page: Math.floor(offset / limit) + 1,
    });
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
  const requestId = newPurchaseRequestId();
  const walletForLog = (() => {
    const authedWallet = (req as any).walletAddress as string | undefined;
    const bodyWallet = (req.body).walletAddress as string | undefined;
    const w = authedWallet || bodyWallet || null;
    return w ? String(w).toLowerCase() : null;
  })();

  // #region agent log
  logPurchaseFlowExpress({
    requestId,
    userId: walletForLog,
    location: "trades.ts:POST_/trades",
    phase: "express.rest.trades.request",
    payloadReceived: {
      marketId: (req.body as { marketId?: string })?.marketId,
      outcome: (req.body as { outcome?: string })?.outcome,
      amountUsd: (req.body as { amountUsd?: unknown })?.amountUsd,
      walletAddress: (req.body as { walletAddress?: string })?.walletAddress,
    },
  });
  // #endregion

  try {
    const authedWallet = (req as any).walletAddress as string | undefined;
    const bodyWallet = (req.body).walletAddress as string | undefined;
    const walletAddress = authedWallet || bodyWallet || null;
    if (!walletAddress) {
      throw new ApiError("Wallet not authenticated", { status: 401, code: "UNAUTHORIZED" });
    }
    if (authedWallet && bodyWallet && authedWallet !== bodyWallet) {
      throw new ApiError("Wallet mismatch", { status: 403, code: "WALLET_MISMATCH" });
    }

    const { marketId, outcome, amountUsd, analystWallet, referralWallet } = req.body;
    const size = Number(amountUsd);

    // Azuro curated markets lifecycle (OPEN only, closes 5 min before kickoff)
    const now = new Date();
    const azuroGameId = typeof marketId === "string" && marketId.startsWith("azuro-")
      ? marketId.slice("azuro-".length)
      : null;

    let curated: Awaited<
      ReturnType<typeof prisma.curatedEvent.findUnique>
    > | null = null;
    if (azuroGameId) {
      try {
        curated = await prisma.curatedEvent.findUnique({
          where: { gameId: azuroGameId },
        });
      } catch {
        curated = null;
      }
    }

    if (curated) {
      if ((curated as any).status !== "OPEN") {
        return res.status(400).json({
          error: "Market is not open for trading",
          status: (curated as any).status,
          lockedAt: curated.lockedAt,
        });
      }
      if (now >= curated.lockedAt) {
        return res.status(400).json({
          error: "Trading closed — match lock reached",
          lockedAt: curated.lockedAt,
          kickoff: curated.startsAt,
        });
      }
    }

    const market = await prisma.market.findUnique({ where: { id: marketId } });
    if (!market || market.status !== "open") {
      return res.status(400).json({ error: "Market not available" });
    }

    // Price model is still simplified in demo mode.
    const avgPrice = 0.65;
    const shares = size / avgPrice;

    // Resolve referral wallet (cookie/query → refCode → affiliate wallet)
    let resolvedReferralWallet: string | null = referralWallet
      ? String(referralWallet).toLowerCase()
      : null;
    let trackingRefCode: string | null = null;

    if (resolvedReferralWallet) {
      const affByWallet = await prisma.affiliate.findUnique({
        where: { walletAddress: resolvedReferralWallet },
      });
      trackingRefCode = affByWallet?.refCode ?? null;
    }

    if (!resolvedReferralWallet) {
      const refCode = getReferralCodeFromRequest(req);
      if (refCode) {
        const affiliate = await prisma.affiliate.findUnique({ where: { refCode } });
        resolvedReferralWallet = affiliate?.walletAddress?.toLowerCase() || null;
        trackingRefCode = refCode;
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      const userRow = await tx.user.upsert({
        where: { wallet: walletAddress },
        create: { wallet: walletAddress },
        update: {},
      });

      const splitPreview = calculateFeeSplit({
        tradeId: "preview",
        traderWallet: walletAddress,
        volumeUsd: size,
        analystWallet: analystWallet || null,
        referralWallet: resolvedReferralWallet,
      });
      const totalCost = size + splitPreview.feeTotalUsd;

      if (totalCost > userRow.virtualBalance) {
        throw new ApiError(
          `Insufficient balance. Required: $${totalCost.toFixed(2)}, Available: $${userRow.virtualBalance.toFixed(2)}`,
          { status: 400, code: "INSUFFICIENT_BALANCE" },
        );
      }

      const created = await tx.order.create({
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

      await tx.market.update({
        where: { id: marketId },
        data: {
          volume: { increment: size },
          predictions: { increment: 1 },
        },
      });

      // Founder rule: users without referral are attributed to PREDICTIO for tracking,
      // but founder does not earn referral rewards (handled by fee engine founder exclusion).
      if (!resolvedReferralWallet) {
        const founderRefCode = (process.env.FOUNDER_REF_CODE || "PREDICTIO").toUpperCase();
        await tx.referralTracking.upsert({
          where: { referredWallet: walletAddress },
          create: {
            refCode: founderRefCode,
            referredWallet: walletAddress,
            cookieExpires: new Date(
              Date.now() + Number(process.env.REFERRAL_COOKIE_DAYS || 120) * 86400 * 1000,
            ),
            isActive: true,
          },
          update: {
            refCode: founderRefCode,
            isActive: true,
          },
        });
      } else {
        const refCodeStored =
          trackingRefCode ||
          (resolvedReferralWallet
            ? `WALLET-${resolvedReferralWallet.slice(2, 14)}`
            : "UNATTRIBUTED");
        await tx.referralTracking.upsert({
          where: { referredWallet: walletAddress },
          create: {
            refCode: refCodeStored,
            referredWallet: walletAddress,
            cookieExpires: new Date(
              Date.now() + Number(process.env.REFERRAL_COOKIE_DAYS || 120) * 86400 * 1000,
            ),
            isActive: true,
          },
          update: {
            isActive: true,
            refCode: refCodeStored,
          },
        });
      }

      const split = calculateFeeSplit({
        tradeId: created.id,
        traderWallet: walletAddress,
        volumeUsd: size,
        analystWallet: analystWallet || null,
        referralWallet: resolvedReferralWallet,
      });

      await tx.user.update({
        where: { wallet: walletAddress },
        data: {
          virtualBalance: { decrement: totalCost },
          tradesCount: { increment: 1 },
          totalVolume: { increment: size },
          predictions: { increment: 1 },
          lastActive: new Date(),
        },
      });

      await tx.transaction.create({
        data: {
          wallet: walletAddress,
          type: "trade",
          amount: size,
          balanceBefore: userRow.virtualBalance,
          balanceAfter: userRow.virtualBalance - totalCost,
          marketId,
          orderId: created.id,
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
        prisma: tx,
        input: {
          tradeId: created.id,
          traderWallet: walletAddress,
          volumeUsd: size,
          analystWallet: analystWallet || null,
          referralWallet: resolvedReferralWallet,
        },
        split,
      });

      return { order: created, split };
    });

    const { order: orderRow, split } = order;

    let copyOrderIds: string[] = [];
    try {
      const analyst = await prisma.analyst.findUnique({
        where: { wallet: walletAddress },
      });
      if (analyst) {
        copyOrderIds = await mirrorTradeToActiveCopiers({
          prisma,
          analystWallet: walletAddress,
          analystDisplayName: analyst.displayName,
          marketId,
          outcome: String(outcome),
          avgPrice,
        });
      }
    } catch (copyErr) {
       
      console.error("[COPY TRADING] mirror after main trade failed", copyErr);
    }

    realtimeBus.emitMessage({
      type: "trade",
      marketId,
      data: {
        id: orderRow.id,
        marketId,
        wallet: walletAddress,
        outcome: outcome.toUpperCase(),
        amountUsd: size,
        createdAt: orderRow.createdAt,
        feeTotalUsd: split.feeTotalUsd,
      },
      timestamp: Date.now(),
    });

    res.status(201).json({
      trade: orderRow,
      fee: {
        totalUsd: split.feeTotalUsd,
        vaultUsd: split.vaultUsd,
        analystUsd: split.analystUsd,
        referralUsd: split.referralUsd,
        treasuryUsd: split.treasuryUsd,
      },
      ...(copyOrderIds.length > 0
        ? { copyTrades: { count: copyOrderIds.length, orderIds: copyOrderIds } }
        : {}),
    });

    // #region agent log
    logPurchaseFlowExpress({
      requestId,
      userId: walletForLog,
      location: "trades.ts:POST_/trades",
      phase: "express.rest.trades.success",
      apiResponse: {
        orderId: orderRow.id,
        marketId,
        feeTotalUsd: split.feeTotalUsd,
        copyOrderCount: copyOrderIds.length,
      },
      dbWrite: {
        model: "Order",
        summary: { id: orderRow.id, marketId, wallet: walletAddress, amount: size },
      },
    });
    // #endregion
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    // #region agent log
    logPurchaseFlowExpress({
      requestId,
      userId: walletForLog,
      location: "trades.ts:POST_/trades",
      phase: "express.rest.trades.error",
      payloadReceived: req.body,
      errorMessage: err.message,
      errorStack: err.stack,
    });
    // #endregion
    return next(e);
  }
  });

export default router;

