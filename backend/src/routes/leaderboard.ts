import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET /api/leaderboard?limit=50
router.get("/leaderboard", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const leaderboard = await prisma.leaderboard.findMany({
      take: limit,
      orderBy: { rank: "asc" },
    });
    res.json({ leaderboard, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.error("[leaderboard] failed", e);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

export default router;

