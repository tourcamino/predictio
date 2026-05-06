import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

function requireAdmin(req: any, res: any, next: any) {
  const key = req.headers["x-predictio-key"];
  const expected = process.env.BOT_API_KEY || "dev_bot_key";
  if (!key || key !== expected) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
}

// GET /api/admin/payouts?status=pending_payment
router.get("/admin/payouts", requireAdmin, async (req, res) => {
  try {
    const status = req.query.status ? String(req.query.status) : "pending_payment";
    const rewards = await prisma.affiliateReward.findMany({
      where: { status },
      take: 200,
      orderBy: { createdAt: "asc" },
    });
    res.json({ rewards });
  } catch (e) {
    console.error("[admin/payouts] list failed", e);
    res.status(500).json({ error: "Failed to fetch payouts" });
  }
});

// POST /api/admin/payouts
// Body: { walletAddress, rewardIds: string[], txHash?, paidBy? }
router.post("/admin/payouts", requireAdmin, async (req, res) => {
  try {
    const walletAddress = req.body?.walletAddress
      ? String(req.body.walletAddress).toLowerCase()
      : null;
    const rewardIds = Array.isArray(req.body?.rewardIds)
      ? req.body.rewardIds.map((x: any) => String(x))
      : [];
    if (!walletAddress) return res.status(400).json({ error: "Missing walletAddress" });
    if (rewardIds.length === 0) return res.status(400).json({ error: "Missing rewardIds" });

    const rewards = await prisma.affiliateReward.findMany({
      where: { id: { in: rewardIds }, walletAddress },
    });
    if (rewards.length === 0) return res.status(404).json({ error: "No rewards found" });

    const amountUsd = rewards.reduce((s, r) => s + r.rewardUsd, 0);
    const amountEur = rewards.reduce((s, r) => s + r.rewardEur, 0);

    await prisma.affiliateReward.updateMany({
      where: { id: { in: rewardIds } },
      data: { status: "paid", paidAt: new Date(), txHash: req.body?.txHash ?? null },
    });

    await prisma.affiliate.update({
      where: { walletAddress },
      data: {
        pendingRewardsUsd: { decrement: amountUsd },
        pendingRewardsEur: { decrement: amountEur },
        lastPayoutAt: new Date(),
      },
    });

    const log = await prisma.payoutLog.create({
      data: {
        walletAddress,
        amountUsd,
        amountEur,
        txHash: req.body?.txHash ?? null,
        paidBy: String(req.body?.paidBy || "manual_founder"),
        rewardIds: [],
      },
    });

    res.status(201).json({ payout: log, amountUsd, amountEur });
  } catch (e) {
    console.error("[admin/payouts] create failed", e);
    res.status(500).json({ error: "Failed to create payout" });
  }
});

export default router;

