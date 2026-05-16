import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { newPurchaseRequestId, logPurchaseFlowExpress } from "../lib/purchaseFlowDiagnostic";
import { validate } from "../middleware/validate";
import { runGetPointsSummaryWeb, runGetUserPointsWeb } from "../web/pointsSummaryWeb";
import { runPlacePaperPredictionWeb } from "../web/placePaperPredictionWeb";
import { runSyncUserAccountWeb } from "../web/syncUserWeb";
import { runGetPaperWalletBalanceWeb } from "../web/paperWalletBalanceWeb";
import { runDbRuntimeIdentityWeb } from "../web/dbRuntimeIdentityWeb";
import { runGetUserPositionsWeb } from "../web/getUserPositionsWeb";
import { runGetTransactionHistoryWeb } from "../web/getTransactionHistoryWeb";
import { runGetPortfolioSummaryWeb } from "../web/getPortfolioSummaryWeb";
import { runClosePositionWeb } from "../web/closePositionWeb";
import { resolveCanonicalLiquidityState } from "../services/canonicalLiquidityState";
import { getCatalogLiquidityVersionMeta } from "../services/catalogLiquidityRebalance";

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

const paperBalanceQuery = z.object({
  walletAddress: walletParam,
});

const positionsQuery = z.object({
  walletAddress: walletParam,
  status: z.enum(["all", "open", "closed", "resolved"]).default("all"),
});

const transactionHistoryQuery = z.object({
  walletAddress: walletParam,
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  type: z.string().default("all"),
});

const closeBody = z.object({
  orderId: z.string().trim().min(1),
  walletAddress: walletParam,
  sharesToSell: z.number().positive(),
  currentPrice: z.number().positive(),
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
    const { walletAddress } = req.query as z.infer<typeof pointsQuery>;
    try {
      const out = await runGetPointsSummaryWeb(prisma, walletAddress);
      console.log(
        JSON.stringify({
          tag: "user_points_read",
          wallet: walletAddress,
          points: out.totalPoints,
          source: "express-web-route",
          route: "GET points-summary",
        }),
      );
      res.json(out);
    } catch (e) {
      console.error(
        JSON.stringify({
          tag: "user_points_error",
          wallet: walletAddress,
          error: e instanceof Error ? e.message : String(e),
          runtime: "express-vps",
          route: "GET points-summary",
        }),
      );
      next(e);
    }
  });

  r.get("/user-points", validate({ query: pointsQuery }), async (req, res, next) => {
    const { walletAddress } = req.query as z.infer<typeof pointsQuery>;
    try {
      const out = await runGetUserPointsWeb(prisma, walletAddress);
      console.log(
        JSON.stringify({
          tag: "user_points_read",
          wallet: walletAddress,
          points: out.points,
          source: "express-web-route",
          route: "GET user-points",
        }),
      );
      res.json(out);
    } catch (e) {
      console.error(
        JSON.stringify({
          tag: "user_points_error",
          wallet: walletAddress,
          error: e instanceof Error ? e.message : String(e),
          runtime: "express-vps",
          route: "GET user-points",
        }),
      );
      next(e);
    }
  });

  r.get("/canonical-liquidity", async (req, res, next) => {
    try {
      const out = await resolveCanonicalLiquidityState(prisma);
      if (process.env.PREDICTIO_LOG_CANONICAL_LIQUIDITY === "1" || req.query.verbose === "1") {
        console.log(
          JSON.stringify({
            tag: "canonical_liquidity_state",
            route: "GET canonical-liquidity",
            openMarkets: out.canonicalOpenSlots,
            allocationSum: out.allocationSum,
            source: "express-web-route",
          }),
        );
      }
      res.json(out);
    } catch (e) {
      next(e);
    }
  });

  r.get("/catalog-liquidity-version", (_req, res) => {
    const meta = getCatalogLiquidityVersionMeta();
    res.json({
      ...meta,
      source: "canonical-liquidity-state",
    });
  });

  r.get(
    "/paper-wallet-balance",
    validate({ query: paperBalanceQuery }),
    async (req, res, next) => {
      try {
        const { walletAddress } = req.query as z.infer<typeof paperBalanceQuery>;
        const out = await runGetPaperWalletBalanceWeb(prisma, walletAddress);
        res.json(out);
      } catch (e) {
        next(e);
      }
    },
  );

  r.get("/db-runtime-identity", async (_req, res, next) => {
    try {
      res.json(await runDbRuntimeIdentityWeb(prisma));
    } catch (e) {
      next(e);
    }
  });

  r.get("/user-positions", validate({ query: positionsQuery }), async (req, res, next) => {
    try {
      const { walletAddress, status } = req.query as z.infer<typeof positionsQuery>;
      const out = await runGetUserPositionsWeb(prisma, walletAddress, status);
      res.json(out);
    } catch (e) {
      next(e);
    }
  });

  r.get(
    "/transaction-history",
    validate({ query: transactionHistoryQuery }),
    async (req, res, next) => {
      try {
        const q = req.query as unknown as z.infer<typeof transactionHistoryQuery>;
        const out = await runGetTransactionHistoryWeb(prisma, q);
        res.json(out);
      } catch (e) {
        next(e);
      }
    },
  );

  r.get(
    "/portfolio-summary",
    validate({ query: paperBalanceQuery }),
    async (req, res, next) => {
      try {
        const { walletAddress } = req.query as z.infer<typeof paperBalanceQuery>;
        const out = await runGetPortfolioSummaryWeb(prisma, walletAddress);
        res.json(out);
      } catch (e) {
        next(e);
      }
    },
  );

  r.post("/close-position", validate({ body: closeBody }), async (req, res, next) => {
    try {
      const out = await runClosePositionWeb(prisma, req.body);
      res.json(out);
    } catch (e) {
      next(e);
    }
  });

  r.post("/place-prediction", validate({ body: placeBody }), async (req, res, next) => {
    const headerRid = req.headers["x-purchase-request-id"];
    const requestId =
      typeof headerRid === "string" && headerRid.length > 0 ? headerRid : newPurchaseRequestId();
    const userId =
      typeof (req.body as { walletAddress?: string })?.walletAddress === "string"
        ? (req.body as { walletAddress: string }).walletAddress.trim().toLowerCase()
        : null;

    // #region agent log
    logPurchaseFlowExpress({
      requestId,
      userId,
      location: "webPublicPaper.ts:POST_place-prediction",
      phase: "express.route.place_prediction.request",
      payloadReceived: req.body,
    });
    // #endregion

    try {
      const out = await runPlacePaperPredictionWeb(prisma, req.body, { requestId });
      // #region agent log
      logPurchaseFlowExpress({
        requestId,
        userId,
        location: "webPublicPaper.ts:POST_place-prediction",
        phase: "express.route.place_prediction.response_json",
        apiResponse: out,
      });
      // #endregion
      res.json(out);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      // #region agent log
      logPurchaseFlowExpress({
        requestId,
        userId,
        location: "webPublicPaper.ts:POST_place-prediction",
        phase: "express.route.place_prediction.error",
        payloadReceived: req.body,
        errorMessage: err.message,
        errorStack: err.stack,
      });
      // #endregion
      next(e);
    }
  });

  return r;
}
