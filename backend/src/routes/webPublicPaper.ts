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
import { runGetPortfolioPerformanceHistoryWeb } from "../web/getPortfolioPerformanceHistoryWeb";
import { runGetLeaderboardWeb } from "../web/getLeaderboardWeb";
import { runGetPointsLeaderboardWeb } from "../web/getPointsLeaderboardWeb";
import {
  runGetCopyRelationshipWeb,
  runStartCopyTradingWeb,
  runStopCopyTradingWeb,
} from "../web/copyTradingWeb";
import { runGetAnalystLeaderboardWeb } from "../web/getAnalystLeaderboardWeb";
import { runGetFollowedAnalystsWeb } from "../web/getFollowedAnalystsWeb";
import { runGetUserLPPositionsWeb } from "../web/getUserLPPositionsWeb";
import {
  runProvideLiquidityWeb,
  runWithdrawLiquidityWeb,
} from "../web/lpMutationsWeb";
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

const performanceQuery = z.object({
  walletAddress: walletParam,
  timeRange: z
    .enum(["7D", "30D", "90D", "1W", "1M", "3M", "6M", "1Y", "ALL", "CUSTOM"])
    .default("1M"),
});

const leaderboardQuery = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  currentUserWallet: walletParam.optional(),
});

const copyRelationshipQuery = z.object({
  copierWallet: walletParam,
  analystWallet: walletParam,
});

const startCopyBody = z.object({
  copierWallet: walletParam,
  analystWallet: walletParam,
  maxPerTradeUsd: z.number().min(10).max(10000),
  copyMode: z.enum(["all", "selective"]).default("all"),
  selectedMarkets: z.array(z.string()).default([]),
});

const stopCopyBody = z.object({
  copierWallet: walletParam,
  analystWallet: walletParam,
});

const analystLeaderboardQuery = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  sortBy: z.enum(["roi", "winRate", "followers", "earned"]).default("earned"),
  currentUserWallet: walletParam.optional(),
});

const followedAnalystsQuery = z.object({
  userWallet: walletParam,
});

const lpPositionsQuery = z.object({
  walletAddress: walletParam,
  status: z.enum(["all", "active", "withdrawn"]).default("active"),
});

const placeBody = z.object({
  marketId: z.string().trim().min(1),
  outcome: z.string().trim().min(1),
  amount: z.number().positive().max(10_000),
  walletAddress: walletParam,
  orderType: z.enum(["MARKET", "LIMIT"]).optional(),
  limitPrice: z.number().min(0.01).max(0.99).optional(),
});

const provideLiquidityBody = z.object({
  marketId: z.string().trim().min(1),
  amount: z.number().positive().max(1_000_000),
  walletAddress: walletParam,
});

const withdrawLiquidityBody = z.object({
  positionId: z.string().trim().min(1),
  amount: z.number().positive(),
  claimFees: z.boolean().optional(),
  walletAddress: walletParam,
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

  r.get(
    "/portfolio-performance-history",
    validate({ query: performanceQuery }),
    async (req, res, next) => {
      try {
        const q = req.query as unknown as z.infer<typeof performanceQuery>;
        const out = await runGetPortfolioPerformanceHistoryWeb(prisma, q);
        res.json(out);
      } catch (e) {
        next(e);
      }
    },
  );

  r.get("/leaderboard", validate({ query: leaderboardQuery }), async (req, res, next) => {
    try {
      const q = req.query as unknown as z.infer<typeof leaderboardQuery>;
      res.json(await runGetLeaderboardWeb(prisma, q));
    } catch (e) {
      next(e);
    }
  });

  r.get("/points-leaderboard", validate({ query: leaderboardQuery }), async (req, res, next) => {
    try {
      const q = req.query as unknown as z.infer<typeof leaderboardQuery>;
      res.json(await runGetPointsLeaderboardWeb(prisma, q));
    } catch (e) {
      next(e);
    }
  });

  r.get("/copy-relationship", validate({ query: copyRelationshipQuery }), async (req, res, next) => {
    try {
      const q = req.query as unknown as z.infer<typeof copyRelationshipQuery>;
      res.json(await runGetCopyRelationshipWeb(prisma, q.copierWallet, q.analystWallet));
    } catch (e) {
      next(e);
    }
  });

  r.post("/start-copy-trading", validate({ body: startCopyBody }), async (req, res, next) => {
    try {
      res.json(await runStartCopyTradingWeb(prisma, req.body));
    } catch (e) {
      next(e);
    }
  });

  r.post("/stop-copy-trading", validate({ body: stopCopyBody }), async (req, res, next) => {
    try {
      const b = req.body as z.infer<typeof stopCopyBody>;
      res.json(await runStopCopyTradingWeb(prisma, b.copierWallet, b.analystWallet));
    } catch (e) {
      next(e);
    }
  });

  r.get(
    "/analyst-leaderboard",
    validate({ query: analystLeaderboardQuery }),
    async (req, res, next) => {
      try {
        const q = req.query as unknown as z.infer<typeof analystLeaderboardQuery>;
        res.json(await runGetAnalystLeaderboardWeb(prisma, q));
      } catch (e) {
        next(e);
      }
    },
  );

  r.get(
    "/followed-analysts",
    validate({ query: followedAnalystsQuery }),
    async (req, res, next) => {
      try {
        const { userWallet } = req.query as z.infer<typeof followedAnalystsQuery>;
        res.json(await runGetFollowedAnalystsWeb(prisma, userWallet));
      } catch (e) {
        next(e);
      }
    },
  );

  r.get(
    "/user-lp-positions",
    validate({ query: lpPositionsQuery }),
    async (req, res, next) => {
      try {
        const q = req.query as unknown as z.infer<typeof lpPositionsQuery>;
        res.json(
          await runGetUserLPPositionsWeb(prisma, {
            walletAddress: q.walletAddress,
            status: q.status,
          }),
        );
      } catch (e) {
        next(e);
      }
    },
  );

  r.post("/provide-liquidity", validate({ body: provideLiquidityBody }), async (req, res, next) => {
    try {
      res.json(await runProvideLiquidityWeb(prisma, req.body));
    } catch (e) {
      next(e);
    }
  });

  r.post("/withdraw-liquidity", validate({ body: withdrawLiquidityBody }), async (req, res, next) => {
    try {
      res.json(await runWithdrawLiquidityWeb(prisma, req.body));
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
