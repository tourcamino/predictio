import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET /api/vault
router.get("/vault", async (_req, res) => {
  try {
    const state = await prisma.vaultState.findUnique({
      where: { id: "singleton" },
    });
    const allocations = await prisma.vaultAllocation.findMany({
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    res.json({ state, allocations });
  } catch (e) {
    console.error("[vault] get failed", e);
    res.status(500).json({ error: "Failed to fetch vault" });
  }
});

// POST /api/vault (deposit/withdraw placeholder for demo)
router.post("/vault", async (req, res) => {
  try {
    const action = String(req.body?.action || "");
    const walletAddress = req.body?.walletAddress
      ? String(req.body.walletAddress).toLowerCase()
      : null;
    const amountUsd = Number(req.body?.amountUsd || 0);

    if (!walletAddress) return res.status(400).json({ error: "Missing walletAddress" });
    if (!Number.isFinite(amountUsd) || amountUsd <= 0)
      return res.status(400).json({ error: "Invalid amountUsd" });
    if (action !== "deposit" && action !== "withdraw")
      return res.status(400).json({ error: "Invalid action" });

    // TODO C4: replace with on-chain vault contract calls.
    const state = await prisma.vaultState.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        totalTvl: 500,
        availableLiquidity: 500,
        exposedLiquidity: 0,
        feeCollected: 0,
        lastRebalance: new Date(),
      },
      update: {},
    });

    const delta = action === "deposit" ? amountUsd : -amountUsd;
    const updated = await prisma.vaultState.update({
      where: { id: "singleton" },
      data: {
        totalTvl: { increment: delta },
        availableLiquidity: { increment: delta },
      },
    });

    // TODO C1: Add per-wallet vault positions table if needed.

    res.status(201).json({ previous: state, state: updated });
  } catch (e) {
    console.error("[vault] post failed", e);
    res.status(500).json({ error: "Failed to update vault" });
  }
});

export default router;

