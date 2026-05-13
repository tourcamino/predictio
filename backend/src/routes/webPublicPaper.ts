import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { runGetPointsSummaryWeb } from "../web/pointsSummaryWeb";
import { runPlacePaperPredictionWeb } from "../web/placePaperPredictionWeb";
import { runSyncUserAccountWeb } from "../web/syncUserWeb";

const walletParam = z
  .string()
  .trim()
  .min(1)
  .transform((s) => s.toLowerCase());

const syncBody = z.object({
  walletAddress: walletParam,
  referralCode: z.string().optional(),
});

const pointsQuery = z.object({
  walletAddress: walletParam,
});

const placeBody = z.object({
  marketId: z.string().trim().min(1),
  outcome: z.string().trim().min(1),
  amount: z.number().positive().max(10_000),
  walletAddress: walletParam,
  orderType: z.enum(["MARKET", "LIMIT"]).optional(),
  limitPrice: z.number().min(0.01).max(0.99).optional(),
});

export function createWebPublicPaperRouter(prisma: PrismaClient): Router {
  const r = Router();

  const limiter = rateLimit({
    windowMs: 60_000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  });
  r.use(limiter);

  r.post("/sync-user", validate({ body: syncBody }), async (req, res, next) => {
    try {
      const out = await runSyncUserAccountWeb(prisma, req.body);
      res.json(out);
    } catch (e) {
      next(e);
    }
  });

  r.get("/points-summary", validate({ query: pointsQuery }), async (req, res, next) => {
    try {
      const { walletAddress } = req.query as z.infer<typeof pointsQuery>;
      const out = await runGetPointsSummaryWeb(prisma, walletAddress);
      res.json(out);
    } catch (e) {
      next(e);
    }
  });

  r.post("/place-prediction", validate({ body: placeBody }), async (req, res, next) => {
    try {
      const out = await runPlacePaperPredictionWeb(prisma, req.body);
      res.json(out);
    } catch (e) {
      next(e);
    }
  });

  return r;
}
