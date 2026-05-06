import express from "express";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import { PrismaClient } from "@prisma/client";
import rateLimit from "express-rate-limit";
import developerApiRouter from './developerApi';
import { translateText } from "./services/translate";
import { createClient } from "redis";
import tradesRouter from "./routes/trades";
import copyRouter from "./routes/copy";
import leaderboardRouter from "./routes/leaderboard";
import affiliateRouter from "./routes/affiliate";
import vaultRouter from "./routes/vault";
import adminPayoutsRouter from "./routes/adminPayouts";
import adminUsageRouter from "./routes/adminUsage";
import adminWalletKeysRouter from "./routes/adminWalletKeys";
import adminKeysRouter from "./routes/adminKeys";
import developerKeysRouter from "./routes/developerKeys";
import { registerAdminCurationRoutes } from "./routes/adminCuration";
import { referralCookieMiddleware } from "./middleware/referral";
import { requestContext } from "./middleware/requestContext";
import { errorHandler, notFound } from "./middleware/errors";
import { requestLogger } from "./middleware/requestLogger";
import { apiUsageTracker } from "./middleware/apiUsageTracker";
import { realtimeBus, type TradingWsMessage } from "./services/realtimeBus";
import {
  verifyDeveloperApiKeyString,
  developerApiKeyForWrite,
  optionalDeveloperApiKey,
  rateLimitByApiKey,
  requireDeveloperPermission,
} from "./middleware/auth";
import { ApiError } from "./middleware/errors";
import { requireAdminKey } from "./middleware/auth";

function requireEnv(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v : undefined;
}

function startupEnvCheck() {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isProd = nodeEnv === "production";

  // DB URL
  const db = requireEnv("DATABASE_URL");
  if (!db) {
    if (isProd) {
      // fail fast in prod
      // eslint-disable-next-line no-console
      console.error("[startup] DATABASE_URL missing in production");
      process.exit(1);
    }
    // local dev fallback
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/predictio";
    // eslint-disable-next-line no-console
    console.warn("[startup] DATABASE_URL missing; using local fallback");
  }

  // Optional but important: warn if keys not set
  if (!requireEnv("BOT_API_KEY")) {
    // eslint-disable-next-line no-console
    console.warn("[startup] BOT_API_KEY not set (using default dev key)");
  }
  if (!requireEnv("ADMIN_API_KEY")) {
    // eslint-disable-next-line no-console
    console.warn("[startup] ADMIN_API_KEY not set");
  }
  if (!requireEnv("MARKET_MAKER_WALLET")) {
    // eslint-disable-next-line no-console
    console.warn(
      "[startup] MARKET_MAKER_WALLET not set — POST /api/v1/bot/market-maker/provide-liquidity will return 503",
    );
  }

  const feeVault = Number(process.env.FEE_VAULT || 0.5);
  const feeAnalyst = Number(process.env.FEE_ANALYST || 0.35);
  const feeReferral = Number(process.env.FEE_REFERRAL || 0.15);
  const feeSum = feeVault + feeAnalyst + feeReferral;
  if (isProd && Math.abs(feeSum - 1) > 1e-6) {
    // eslint-disable-next-line no-console
    console.error(
      `[startup] FEE_VAULT+FEE_ANALYST+FEE_REFERRAL must sum to 1 (got ${feeSum.toFixed(6)})`,
    );
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log(`[startup] env ok NODE_ENV=${nodeEnv}`);
}

startupEnvCheck();

const app = express();
const prisma = new PrismaClient();

// Behind nginx reverse proxy: use x-forwarded-for for req.ip
app.set("trust proxy", 1);

// Environment variables
const PORT = process.env.PORT || 3001;
const WS_PORT = process.env.WS_PORT || 8080;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
const BOT_API_KEY = process.env.BOT_API_KEY || "dev_bot_key";
const TRANSLATION_CACHE_TTL = Number(process.env.TRANSLATION_CACHE_TTL || 2592000); // 30d default

function isAllowedCorsOrigin(origin: string | undefined): boolean {
  if (!origin) return true; // non-browser / same-origin

  const raw = (CORS_ORIGIN || "").trim();
  const allowList = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Always allow localhost for dev tooling (Vinxi default 5173; alternate port when busy)
  allowList.push(
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  );

  // Exact matches
  if (allowList.includes(origin)) return true;

  // Allow Vercel preview deployments
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;

  return false;
}

async function ensureFounderAffiliate() {
  const founderWallet = (process.env.FOUNDER_WALLET || "").toLowerCase();
  const founderRefCode = (process.env.FOUNDER_REF_CODE || "PREDICTIO").toUpperCase();
  if (!founderWallet) return;

  try {
    await prisma.affiliate.upsert({
      where: { refCode: founderRefCode },
      create: {
        walletAddress: founderWallet,
        refCode: founderRefCode,
        isFounder: true,
      },
      update: {
        walletAddress: founderWallet,
        isFounder: true,
      },
    });
  } catch (e) {
    // DB may be offline during local dev; don't crash server.
    console.warn("[startup] founder affiliate upsert failed");
  }
}

// Middleware
app.use(requestContext);
app.use(requestLogger);
app.use(apiUsageTracker);
app.use(
  cors({
    origin(origin, cb) {
      if (isAllowedCorsOrigin(origin)) return cb(null, true);
      return cb(new Error("CORS blocked"));
    },
  }),
);
app.use((req, res, next) => {
  // Minimal hardening headers (avoid extra deps in C2)
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("x-frame-options", "DENY");
  res.setHeader("referrer-policy", "no-referrer");
  if (req.secure || req.headers["x-forwarded-proto"] === "https") {
    res.setHeader("strict-transport-security", "max-age=15552000; includeSubDomains");
  }
  next();
});
const HTTP_JSON_BODY_LIMIT = process.env.HTTP_JSON_BODY_LIMIT || "128kb";
app.use(express.json({ limit: HTTP_JSON_BODY_LIMIT }));
app.use(referralCookieMiddleware);

/** Root — API only (no SPA). Registered early so it always wins over the 404 handler. */
app.get("/", (_req, res) => {
  res.json({
    service: "predictio-api",
    ok: true,
    message: "REST API (no page at /). Use /api/v1/health for liveness.",
    health: "/api/v1/health",
  });
});

// Rate limiting
const publicLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // 300 req/min per IP
  handler(_req, res) {
    res.status(429).json({
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests from this IP",
        requestId: (res.locals as any).requestId,
      },
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const writeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60, // 60 writes/min per IP
  handler(_req, res) {
    res.status(429).json({
      error: {
        code: "RATE_LIMITED",
        message: "Too many write requests from this IP",
        requestId: (res.locals as any).requestId,
      },
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30, // 30 admin ops/min per IP
  handler(_req, res) {
    res.status(429).json({
      error: {
        code: "RATE_LIMITED",
        message: "Too many admin requests from this IP",
        requestId: (res.locals as any).requestId,
      },
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply limiters by path group
app.use("/api/v1/", publicLimiter);
app.use("/api/leaderboard", publicLimiter);
app.use("/api/vault", publicLimiter);
app.use("/api/affiliate", publicLimiter);
app.use("/api/copy", publicLimiter);
app.use("/api/trades", publicLimiter);

app.use("/api/trades", writeLimiter);
app.use("/api/vault", writeLimiter);
app.use("/api/translate", writeLimiter);
app.use("/api/v1/translate", writeLimiter);
app.use("/api/v1/orders", writeLimiter);

app.use("/api/admin/", adminLimiter);
app.use("/api/developer/keys", adminLimiter);

// Bot / admin shared key (mounted before /api sub-routers so MM routes always match here first)
function authenticateApiKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  const raw = req.headers["x-predictio-key"];
  const headerVal = Array.isArray(raw) ? raw[0] : raw;
  const got = headerVal ? String(headerVal).trim() : "";
  const expected = String(BOT_API_KEY).trim();
  if (!got || got !== expected) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

const MM_WALLET_RE = /^0x[a-f0-9]{40}$/i;

function parseMarketOutcomesField(outcomes: unknown): unknown {
  if (typeof outcomes === "string") {
    try {
      return JSON.parse(outcomes) as unknown;
    } catch {
      return outcomes;
    }
  }
  return outcomes;
}

function enabledMarketIdsFromJson(raw: unknown): string[] {
  const parsed = parseMarketOutcomesField(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((x): x is string => typeof x === "string");
}

function outcomeLabelsFromJson(outcomes: unknown): string[] {
  const parsed = parseMarketOutcomesField(outcomes);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return ["YES", "NO"];
  }
  return parsed.map((o) => {
    if (typeof o === "string") return o;
    if (o && typeof o === "object") {
      const rec = o as Record<string, unknown>;
      if (typeof rec.label === "string" && rec.label.trim()) return rec.label.trim();
      if (typeof rec.id === "string" && rec.id.trim()) return rec.id.trim();
      if (typeof rec.name === "string" && rec.name.trim()) return rec.name.trim();
    }
    return String(o);
  });
}

// GET /api/v1/bot/market-maker/config (BOT_API_KEY)
app.get("/api/v1/bot/market-maker/config", authenticateApiKey, async (_req, res) => {
  try {
    const config = await prisma.marketMakerConfig.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        targetSpread: 0.02,
        maxExposurePerMarket: 5000,
        rebalanceIntervalMs: 1_800_000,
        minLiquidity: 500,
        enabledMarkets: [],
      },
      update: {},
    });

    const enabledMarkets = enabledMarketIdsFromJson(config.enabledMarkets);

    res.json({
      targetSpread: config.targetSpread,
      maxExposurePerMarket: config.maxExposurePerMarket,
      rebalanceIntervalMs: config.rebalanceIntervalMs,
      minLiquidity: config.minLiquidity,
      enabledMarkets,
      rebalanceIntervalMinutes: Math.round(config.rebalanceIntervalMs / 60_000),
    });
  } catch (error) {
    console.error("[market-maker] config", error);
    res.status(500).json({ error: "Failed to load market maker config" });
  }
});

// POST /api/v1/bot/market-maker/provide-liquidity (BOT_API_KEY)
app.post("/api/v1/bot/market-maker/provide-liquidity", authenticateApiKey, async (req, res) => {
  try {
    const walletRaw = (process.env.MARKET_MAKER_WALLET || "").trim().toLowerCase();
    if (!MM_WALLET_RE.test(walletRaw)) {
      return res.status(503).json({
        error: "MARKET_MAKER_WALLET is not configured (set a 0x-prefixed 40-hex wallet)",
      });
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const marketId =
      (typeof body.marketId === "string" && body.marketId) ||
      (typeof body.market_id === "string" && body.market_id) ||
      "";
    const amountRaw = body.amountPerSide ?? body.amount_per_side;
    const amountPerSide = typeof amountRaw === "number" ? amountRaw : Number(amountRaw);

    if (!marketId) {
      return res.status(400).json({ error: "marketId is required" });
    }
    if (!Number.isFinite(amountPerSide) || amountPerSide <= 0) {
      return res.status(400).json({ error: "amountPerSide must be a positive number" });
    }

    const market = await prisma.market.findUnique({ where: { id: marketId } });
    if (!market || market.status !== "open") {
      return res.status(400).json({ error: "Market not available" });
    }

    const labels = outcomeLabelsFromJson(market.outcomes);
    const avgPrice = 0.65;
    const odds = 2.0;

    const result = await prisma.$transaction(async (tx) => {
      const createdIds: string[] = [];
      let volumeAdd = 0;

      for (const label of labels) {
        const amount = amountPerSide;
        volumeAdd += amount;
        const shares = amount / avgPrice;
        const order = await tx.order.create({
          data: {
            marketId,
            wallet: walletRaw,
            outcome: label,
            amount,
            shares,
            avgPrice,
            odds,
            orderType: "MAKER_LP",
            status: "open",
          },
        });
        createdIds.push(order.id);
      }

      const mRow = await tx.market.findUnique({ where: { id: marketId } });
      const prevLp = mRow?.totalLPPool ?? 0;

      await tx.market.update({
        where: { id: marketId },
        data: {
          volume: { increment: volumeAdd },
          predictions: { increment: labels.length },
          totalLPPool: prevLp + volumeAdd,
        },
      });

      return { orderIds: createdIds, outcomes: labels.length, volumeAdded: volumeAdd };
    });

    res.json({
      ok: true,
      marketId,
      ...result,
    });
  } catch (error) {
    console.error("[market-maker] provide-liquidity", error);
    res.status(500).json({ error: "Failed to provide liquidity" });
  }
});

// Developer API routes
if (process.env.DEVELOPER_API_ENABLED !== 'false') {
  app.use('/api', developerApiRouter);
  console.log('📡 Developer API enabled');
}

// C1 REST routes (master-context paths; backend-only)
app.use("/api", tradesRouter);
app.use("/api", copyRouter);
app.use("/api", leaderboardRouter);
app.use("/api", affiliateRouter);
app.use("/api", vaultRouter);
app.use("/api", adminPayoutsRouter);
app.use("/api", adminUsageRouter);
app.use("/api", adminWalletKeysRouter);
app.use("/api", adminKeysRouter);
app.use("/api", developerKeysRouter);

registerAdminCurationRoutes(app, prisma, publicLimiter);

// Health check
app.get("/api/v1/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      uptime: process.uptime(),
      version: "1.0.0",
      db: "connected",
      flags: {
        WRITE_AUTH_REQUIRED: process.env.WRITE_AUTH_REQUIRED === "1",
        WS_AUTH_REQUIRED: process.env.WS_AUTH_REQUIRED === "1",
        API_USAGE_ENABLED: !(process.env.API_USAGE_ENABLED === "0" || process.env.API_USAGE_ENABLED === "false"),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      db: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Admin: websocket stats (in-memory)
app.get("/api/admin/ws/stats", requireAdminKey, (req, res) => {
  const now = Date.now();
  const ips = Array.from(wsConnByIp.entries()).map(([ip, v]) => ({
    ip,
    count: v.count,
    resetInMs: Math.max(0, v.resetAt - now),
  }));
  ips.sort((a, b) => b.count - a.count);
  res.json({
    currentConnections: wsConnCurrent,
    windowMs: 60_000,
    maxConnectionsPerIp: WS_MAX_CONNECTIONS_PER_IP,
    ips: ips.slice(0, 200),
  });
});

// Admin: full health snapshot (best-effort)
app.get("/api/admin/health/full", requireAdminKey, async (_req, res) => {
  const startedAt = Date.now();
  const out: any = {
    at: new Date().toISOString(),
    version: "1.0.0",
    flags: {
      WRITE_AUTH_REQUIRED: process.env.WRITE_AUTH_REQUIRED === "1",
      WS_AUTH_REQUIRED: process.env.WS_AUTH_REQUIRED === "1",
      API_USAGE_ENABLED: !(process.env.API_USAGE_ENABLED === "0" || process.env.API_USAGE_ENABLED === "false"),
    },
    db: { ok: false },
    redis: { ok: false },
    ws: { currentConnections: wsConnCurrent, maxConnectionsPerIp: WS_MAX_CONNECTIONS_PER_IP },
    counts: {},
    ms: 0,
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    out.db.ok = true;
  } catch (e) {
    out.db.error = e instanceof Error ? e.message : String(e);
  }

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const client = createClient({ url: redisUrl });
      await client.connect();
      const pong = await client.ping();
      out.redis.ok = pong === "PONG";
      await client.quit();
    } catch (e) {
      out.redis.error = e instanceof Error ? e.message : String(e);
    }
  } else {
    out.redis.error = "REDIS_URL not set";
  }

  try {
    const [keysTotal, usageTotal] = await Promise.all([
      prisma.apiKey.count(),
      prisma.apiUsage.count(),
    ]);
    out.counts.apiKeys = keysTotal;
    out.counts.apiUsage = usageTotal;
  } catch (e) {
    out.countsError = e instanceof Error ? e.message : String(e);
  }

  out.ms = Date.now() - startedAt;
  res.json(out);
});

// Debug: "who am I" for bots/UI (developer API key)
app.get(
  "/api/me",
  writeLimiter,
  optionalDeveloperApiKey,
  requireDeveloperPermission("read"),
  rateLimitByApiKey({ windowMs: 60_000, max: 600, code: "READ_RATE_LIMITED" }),
  (req, res, next) => {
  try {
    const walletAddress = (req as any).walletAddress as string | undefined;
    const apiKey = (req as any).apiKey as any | undefined;
    if (!walletAddress || !apiKey) {
      throw new ApiError("Unauthorized", { status: 401, code: "UNAUTHORIZED" });
    }
    return res.json({
      walletAddress,
      apiKey: {
        id: apiKey.id,
        label: apiKey.label ?? null,
        createdAt: apiKey.createdAt ?? null,
        lastUsedAt: apiKey.lastUsedAt ?? null,
      },
      requestId: res.locals.requestId,
    });
  } catch (e) {
    return next(e);
  }
});

// GET /api/v1/markets
app.get("/api/v1/markets", async (req, res) => {
  try {
    const {
      sport,
      region,
      status = "open",
      sort = "volume",
      limit = 20,
      offset = 0,
    } = req.query;

    const where: any = {};
    if (sport && sport !== "all") where.sport = sport;
    if (status && status !== "all") where.status = status;

    const markets = await prisma.market.findMany({
      where,
      take: Number(limit),
      skip: Number(offset),
      orderBy: sort === "volume" ? { volume: "desc" } : { closesAt: "asc" },
    });

    const total = await prisma.market.count({ where });

    res.json({
      markets,
      total,
      page: Math.floor(Number(offset) / Number(limit)) + 1,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch markets" });
  }
});

// GET /api/v1/markets/hot
app.get("/api/v1/markets/hot", async (req, res) => {
  try {
    const markets = await prisma.market.findMany({
      where: { status: "open" },
      take: 20,
      orderBy: { volume: "desc" },
    });

    // Calculate score for each market
    type MarketRow = (typeof markets)[number];
    const scoredMarkets = (markets as MarketRow[]).map((market) => {
      const timeToClose = (new Date(market.closesAt).getTime() - Date.now()) / 1000;
      const volumeScore = (market.volume / 200000) * 50;
      const timeScore = timeToClose < 3600 ? 50 : timeToClose < 21600 ? 30 : 10;
      const score = volumeScore + timeScore;

      return { ...market, score, timeToClose };
    });

    // Sort by score and take top 5
    const topMarkets = scoredMarkets
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
      .slice(0, 5);

    res.json({ markets: topMarkets });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch hot markets" });
  }
});

// GET /api/v1/markets/:id
app.get("/api/v1/markets/:id", async (req, res) => {
  try {
    const market = await prisma.market.findUnique({
      where: { id: req.params.id },
      include: {
        orders: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!market) {
      return res.status(404).json({ error: "Market not found" });
    }

    // Calculate orderbook from orders
    const orderbook = calculateOrderbook(market.orders);
    const recentTrades = market.orders.slice(0, 10);

    res.json({ market, orderbook, recentTrades });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch market" });
  }
});

// POST /api/v1/markets (admin only)
app.post("/api/v1/markets", authenticateApiKey, async (req, res) => {
  try {
    const {
      sport,
      league,
      event,
      outcomes,
      closesAt,
      resolutionType = "automatic",
      description,
    } = req.body;

    const market = await prisma.market.create({
      data: {
        sport,
        league,
        event,
        outcomes,
        closesAt: new Date(closesAt),
        resolutionType,
        description,
        status: "open",
      },
    });

    res.json({ market, txHash: `0x${Math.random().toString(16).slice(2)}` });
  } catch (error) {
    res.status(500).json({ error: "Failed to create market" });
  }
});

// PUT /api/v1/markets/:id/resolve (admin only)
app.put("/api/v1/markets/:id/resolve", authenticateApiKey, async (req, res) => {
  try {
    const { winningOutcome, sourceUrl } = req.body;

    const market = await prisma.market.update({
      where: { id: req.params.id },
      data: {
        status: "resolved",
        winner: winningOutcome,
        resolvedAt: new Date(),
      },
    });

    // Calculate payouts
    const winners = await prisma.order.findMany({
      where: {
        marketId: req.params.id,
        outcome: winningOutcome,
        status: "open",
      },
    });

    type WinnerRow = (typeof winners)[number];
    const totalDistributed = (winners as WinnerRow[]).reduce(
      (sum: number, order) => sum + order.amount * (order.odds ?? 0),
      0
    );

    // Update winning orders
    await prisma.order.updateMany({
      where: {
        marketId: req.params.id,
        outcome: winningOutcome,
        status: "open",
      },
      data: {
        status: "won",
        resolvedAt: new Date(),
      },
    });

    // Update losing orders
    await prisma.order.updateMany({
      where: {
        marketId: req.params.id,
        outcome: { not: winningOutcome },
        status: "open",
      },
      data: {
        status: "lost",
        resolvedAt: new Date(),
      },
    });

    res.json({
      resolved: true,
      payouts: winners.length,
      totalDistributed,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to resolve market" });
  }
});

// POST /api/v1/orders
app.post("/api/v1/orders", developerApiKeyForWrite, requireDeveloperPermission("trade"), async (req, res, next) => {
  try {
    const authedWallet = (req as any).walletAddress as string | undefined;
    const { marketId, outcome, amount } = req.body;
    const bodyWallet = req.body?.walletAddress ? String(req.body.walletAddress).toLowerCase() : undefined;
    const walletAddress = authedWallet || bodyWallet || null;
    if (!walletAddress) {
      throw new ApiError("Wallet not authenticated", { status: 401, code: "UNAUTHORIZED" });
    }
    if (authedWallet && bodyWallet && authedWallet !== bodyWallet) {
      throw new ApiError("Wallet mismatch", { status: 403, code: "WALLET_MISMATCH" });
    }

    const market = await prisma.market.findUnique({
      where: { id: marketId },
    });

    if (!market || market.status !== "open") {
      return res.status(400).json({ error: "Market not available" });
    }

    // Calculate odds (simplified)
    const odds = 2.0; // In production, calculate from orderbook

    const order = await prisma.order.create({
      data: {
        marketId,
        outcome,
        amount,
        wallet: walletAddress,
        odds,
        status: "open",
      },
    });

    // Update market volume
    await prisma.market.update({
      where: { id: marketId },
      data: {
        volume: { increment: amount },
        predictions: { increment: 1 },
      },
    });

    res.json({
      orderId: order.id,
      txHash: `0x${Math.random().toString(16).slice(2)}`,
      odds,
      potentialWin: amount * odds,
      fee: amount * 0.01, // 0.8-1.2% dynamic fee (avg ~1%)
    });
  } catch (error) {
    return next(error);
  }
});

// GET /api/v1/stats/platform
app.get("/api/v1/stats/platform", async (req, res) => {
  try {
    const totalVolume = await prisma.order.aggregate({
      _sum: { amount: true },
    });

    const activeMarkets = await prisma.market.count({
      where: { status: "open" },
    });

    const totalUsers = await prisma.user.count();

    res.json({
      totalVolume: totalVolume._sum.amount || 0,
      activeMarkets,
      totalUsers,
      revenue24h: (totalVolume._sum.amount || 0) * 0.01, // Fixed 1% taker fee
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// POST /api/translate (and /api/v1/translate)
async function handleTranslate(req: express.Request, res: express.Response) {
  try {
    const { text, targetLang } = req.body ?? {};

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing text" });
    }
    if (!targetLang || typeof targetLang !== "string") {
      return res.status(400).json({ error: "Missing targetLang" });
    }

    // If already English, return as-is (frontend rule: UI is EN)
    if (targetLang.toLowerCase().startsWith("en")) {
      return res.json({ translatedText: text, cached: true });
    }

    const { translatedText, fromCache } = await translateText({
      text,
      targetLang,
      ttlSeconds: TRANSLATION_CACHE_TTL,
    });

    return res.json({ translatedText, cached: fromCache });
  } catch (error) {
    console.error("[translate] failed", error);
    return res.status(500).json({ error: "Translation failed" });
  }
}

app.post("/api/translate", handleTranslate);
app.post("/api/v1/translate", handleTranslate);

// 404 + error handler (must be last)
app.use(notFound);
app.use(errorHandler);

// Helper functions
function calculateOrderbook(orders: any[]) {
  const outcomeVolumes: Record<string, number> = {};
  
  orders.forEach((order) => {
    if (!outcomeVolumes[order.outcome]) {
      outcomeVolumes[order.outcome] = 0;
    }
    outcomeVolumes[order.outcome] += order.amount;
  });

  return Object.entries(outcomeVolumes).map(([outcome, volume]) => ({
    name: outcome,
    volume,
    percentage: 50, // Simplified
    odds: 2.0, // Simplified
  }));
}

// Start Express server
app.listen(PORT, () => {
  console.log(`🚀 API server running on port ${PORT}`);
  console.log(`📡 CORS origin: ${CORS_ORIGIN}`);
});

ensureFounderAffiliate().catch(() => null);

// WebSocket Server
const WS_MAX_MESSAGE_BYTES = Number(process.env.WS_MAX_MESSAGE_BYTES || 32_768);
const wss = new WebSocketServer({ port: Number(WS_PORT), maxPayload: WS_MAX_MESSAGE_BYTES });

console.log(`🔌 WebSocket server running on port ${WS_PORT}`);

type WsMode = "channel" | "trading";

type ClientState = {
  mode: WsMode;
  channel?: string;
  subscribedMarkets: Set<string>;
  walletAddress?: string;
  apiKeyId?: string;
};

const WS_AUTH_REQUIRED = process.env.WS_AUTH_REQUIRED === "1";
const WS_MAX_CONNECTIONS_PER_IP = Number(process.env.WS_MAX_CONNECTIONS_PER_IP || 30);
const WS_REQUIRE_SUBSCRIBE_SECONDS = Number(process.env.WS_REQUIRE_SUBSCRIBE_SECONDS || 0);
const WS_MAX_SUBSCRIPTIONS = Number(process.env.WS_MAX_SUBSCRIPTIONS || 200);
const WS_SERVER_PING_INTERVAL_SECONDS = Number(process.env.WS_SERVER_PING_INTERVAL_SECONDS || 30);
const WS_SERVER_PONG_TIMEOUT_SECONDS = Number(process.env.WS_SERVER_PONG_TIMEOUT_SECONDS || 15);
const wsConnByIp = new Map<string, { count: number; resetAt: number }>();
let wsConnCurrent = 0;

function parseWsMode(url: string | undefined): ClientState {
  const u = url || "";
  // Supported:
  // - /ws/<channel> (legacy channel stream used by useWebSocket hook)
  // - /trading (market subscriptions via messages, used by tradingSocket.ts)
  // - /ws/trading (same as /trading, when reverse-proxied under /ws)
  if (u === "/ws/trading" || u.startsWith("/ws/trading?")) {
    return { mode: "trading", subscribedMarkets: new Set() };
  }
  if (u.startsWith("/ws/")) {
    const channel = u.split("/").filter(Boolean)[1] || "markets";
    return { mode: "channel", channel, subscribedMarkets: new Set() };
  }
  if (u.startsWith("/trading")) {
    return { mode: "trading", subscribedMarkets: new Set() };
  }
  // default to channel markets
  return { mode: "channel", channel: "markets", subscribedMarkets: new Set() };
}

function sendJson(ws: WebSocket, obj: unknown) {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(obj));
}

function routeTradingMessage(state: ClientState, msg: TradingWsMessage): boolean {
  // trading mode: send only if subscribed to this market (or subscribed to wildcard "*")
  if (state.mode !== "trading") return false;
  if (state.subscribedMarkets.has("*") || state.subscribedMarkets.has(msg.marketId)) return true;
  return false;
}

function routeChannelMessage(state: ClientState, msg: TradingWsMessage): unknown | null {
  if (state.mode !== "channel") return null;
  // map into legacy message shape used by useWebSocket hook
  if (state.channel === "markets" && msg.type === "trade") {
    return {
      channel: "markets",
      event: "trade",
      data: msg.data,
      timestamp: msg.timestamp,
    };
  }
  return null;
}

wss.on("connection", (ws: WebSocket, req) => {
  wsConnCurrent += 1;
  const state = parseWsMode(req.url);
  (ws as any).__state = state;
  (ws as any).__lastPongAt = Date.now();

  const ip = req.socket?.remoteAddress || "unknown";
  const now = Date.now();
  const windowMs = 60_000;
  const rec = wsConnByIp.get(ip);
  if (!rec || now > rec.resetAt) {
    wsConnByIp.set(ip, { count: 1, resetAt: now + windowMs });
  } else {
    rec.count += 1;
    if (rec.count > WS_MAX_CONNECTIONS_PER_IP) {
      try {
        ws.close(1013, "Rate limited");
      } catch {}
      return;
    }
  }

  const url = new URL(`http://localhost${req.url || "/"}`);
  const apiKey = url.searchParams.get("apiKey") || "";

  (async () => {
    if (WS_AUTH_REQUIRED && state.mode === "trading") {
      const row = await verifyDeveloperApiKeyString(apiKey);
      if (!row) {
        sendJson(ws, { type: "error", error: "Unauthorized", timestamp: Date.now() });
        ws.close(1008, "Unauthorized");
        return;
      }
      // permissions: if present and missing "stream", deny trading socket
      const perms = Array.isArray((row as any).permissions) ? (row as any).permissions.map(String) : [];
      if (perms.length > 0 && !perms.includes("stream")) {
        sendJson(ws, { type: "error", error: "Forbidden", timestamp: Date.now() });
        ws.close(1008, "Forbidden");
        return;
      }
      state.walletAddress = row.walletAddress;
      state.apiKeyId = row.id;
    }

    console.log(
      `[WebSocket] connected url=${req.url} ip=${ip} wallet=${state.walletAddress || "-"} apiKeyId=${state.apiKeyId || "-"}`,
    );
    if (state.mode === "trading") {
      sendJson(ws, { type: "ready", timestamp: Date.now() });
    }

    let subscribeTimer: NodeJS.Timeout | null = null;
    if (state.mode === "trading" && WS_REQUIRE_SUBSCRIBE_SECONDS > 0) {
      subscribeTimer = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) return;
        if (state.subscribedMarkets.size > 0) return;
        sendJson(ws, { type: "error", error: "No subscriptions", timestamp: Date.now() });
        try {
          ws.close(1008, "No subscriptions");
        } catch {}
      }, WS_REQUIRE_SUBSCRIBE_SECONDS * 1000);
    }

    ws.on("message", (raw) => {
      if (state.mode !== "trading") return;
      if (WS_AUTH_REQUIRED && !state.walletAddress) {
        sendJson(ws, { type: "error", error: "Unauthorized", timestamp: Date.now() });
        try {
          ws.close(1008, "Unauthorized");
        } catch {}
        return;
      }
      try {
        const text = typeof raw === "string" ? raw : raw.toString("utf8");
        const m = JSON.parse(text);
        if (m?.type === "pong") {
          (ws as any).__lastPongAt = Date.now();
          return;
        }
        if (m?.action === "subscribe") {
          const marketId = String(m.marketId || "").trim();
          if (!marketId) {
            sendJson(ws, { type: "error", error: "Missing marketId", timestamp: Date.now() });
            return;
          }
          if (state.subscribedMarkets.size >= WS_MAX_SUBSCRIPTIONS) {
            sendJson(ws, { type: "error", error: "Too many subscriptions", timestamp: Date.now() });
            return;
          }
          state.subscribedMarkets.add(marketId);
          if (subscribeTimer) {
            clearTimeout(subscribeTimer);
            subscribeTimer = null;
          }
          sendJson(ws, { type: "subscribed", marketId, timestamp: Date.now() });
          return;
        }
        if (m?.action === "unsubscribe") {
          const marketId = String(m.marketId || "").trim();
          if (marketId) state.subscribedMarkets.delete(marketId);
          sendJson(ws, { type: "unsubscribed", marketId, timestamp: Date.now() });
          return;
        }
        if (m?.action === "ping") {
          sendJson(ws, { type: "pong", timestamp: Date.now() });
          return;
        }
      } catch (e) {
        sendJson(ws, { type: "error", error: "Invalid message", timestamp: Date.now() });
      }
    });
  })().catch((e) => {
    console.error("[WebSocket] auth failed", e);
    try {
      ws.close(1011, "Internal error");
    } catch {}
  });

  ws.on("error", (e) => {
    console.error("[WebSocket] error", e);
  });

  ws.on("close", (code, reason) => {
    wsConnCurrent = Math.max(0, wsConnCurrent - 1);
    const st: ClientState | undefined = (ws as any).__state;
    console.log(
      `[WebSocket] disconnected code=${code} reason=${String(reason || "")} wallet=${st?.walletAddress || "-"} apiKeyId=${st?.apiKeyId || "-"}`,
    );
  });
});

realtimeBus.on("message", (msg: TradingWsMessage) => {
  wss.clients.forEach((client) => {
    if (client.readyState !== WebSocket.OPEN) return;
    const state: ClientState | undefined = (client as any).__state;
    if (!state) return;

    if (routeTradingMessage(state, msg)) {
      sendJson(client, msg);
      return;
    }

    const mapped = routeChannelMessage(state, msg);
    if (mapped) sendJson(client, mapped);
  });
});

// Server-driven heartbeat for trading sockets
if (WS_SERVER_PING_INTERVAL_SECONDS > 0) {
  setInterval(() => {
    const now = Date.now();
    wss.clients.forEach((client) => {
      if (client.readyState !== WebSocket.OPEN) return;
      const state: ClientState | undefined = (client as any).__state;
      if (!state || state.mode !== "trading") return;
      if (WS_AUTH_REQUIRED && !(state as any).walletAddress) return;

      const lastPongAt = Number((client as any).__lastPongAt || 0);
      const ageMs = now - lastPongAt;
      if (lastPongAt && ageMs > WS_SERVER_PONG_TIMEOUT_SECONDS * 1000) {
        try {
          sendJson(client as any, { type: "error", error: "Heartbeat timeout", timestamp: Date.now() });
        } catch {}
        try {
          client.close(1008, "Heartbeat timeout");
        } catch {}
        return;
      }

      try {
        // ws library supports ping frames; we also send JSON ping for clients that only handle messages
        (client as any).ping?.();
      } catch {}
      try {
        sendJson(client as any, { type: "ping", timestamp: Date.now() });
      } catch {}
    });
  }, WS_SERVER_PING_INTERVAL_SECONDS * 1000).unref?.();
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing servers...");
  wss.close();
  await prisma.$disconnect();
  process.exit(0);
});
