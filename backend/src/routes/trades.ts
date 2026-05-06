import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { calculateFeeSplit, persistFeeSplit } from "../services/fees";
import { getReferralCodeFromRequest } from "../middleware/referral";

const router = Router();
const prisma = new PrismaClient();

function getWalletFromReq(req: any): string | null {
  const w =
    (req.headers["x-wallet-address"] as string | undefined) ||
    (req.headers["x-wallet"] as string | undefined) ||
    (req.body?.walletAddress as string | undefined) ||
    (req.query?.walletAddress as string | undefined);
  return w ? String(w).toLowerCase() : null;
}

// GET /api/trades?walletAddress=0x...&marketId=...&limit=...&offset=...
router.get("/trades", async (req, res) => {
  try {
    const walletAddress = req.query.walletAddress
      ? String(req.query.walletAddress).toLowerCase()
      : undefined;
    const marketId = req.query.marketId ? String(req.query.marketId) : undefined;
    const limit = Number(req.query.limit || 50);
    const offset = Number(req.query.offset || 0);

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
    console.error("[trades] list failed", e);
    res.status(500).json({ error: "Failed to fetch trades" });
  }
});

// POST /api/trades
// Body: { marketId, outcome, amountUsd, walletAddress?, analystWallet?, referralWallet? }
router.post("/trades", async (req, res) => {
  try {
    const walletAddress = getWalletFromReq(req);
    const { marketId, outcome, amountUsd, analystWallet, referralWallet } = req.body ?? {};

    if (!walletAddress) return res.status(400).json({ error: "Missing walletAddress" });
    if (!marketId || typeof marketId !== "string")
      return res.status(400).json({ error: "Missing marketId" });
    if (!outcome || typeof outcome !== "string")
      return res.status(400).json({ error: "Missing outcome" });
    const size = Number(amountUsd);
    if (!Number.isFinite(size) || size <= 0)
      return res.status(400).json({ error: "Invalid amountUsd" });

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
    console.error("[trades] create failed", e);
    res.status(500).json({ error: "Failed to create trade" });
  }
});

export default router;

