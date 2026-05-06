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

const vaultActionBody = z.object({
  action: z.enum(["deposit", "withdraw"]),
  walletAddress: walletSchema,
  amountUsd: z.coerce.number().positive().max(1_000_000_000),
});

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
router.post("/vault", validate({ body: vaultActionBody }), async (req, res) => {
  try {
    const action = (req.body as any).action as string;
    const walletAddress = (req.body as any).walletAddress as string;
    const amountUsd = Number((req.body as any).amountUsd || 0);

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

