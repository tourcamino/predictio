import express from "express";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import { PrismaClient } from "@prisma/client";
import rateLimit from "express-rate-limit";
import developerApiRouter from './developerApi';

const app = express();
const prisma = new PrismaClient();

// Environment variables
const PORT = process.env.PORT || 3001;
const WS_PORT = process.env.WS_PORT || 8080;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:8000";
const BOT_API_KEY = process.env.BOT_API_KEY || "dev_bot_key";

// Middleware
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: "Too many requests from this IP",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", apiLimiter);

// Developer API routes
if (process.env.DEVELOPER_API_ENABLED !== 'false') {
  app.use('/api', developerApiRouter);
  console.log('📡 Developer API enabled');
}

// Auth middleware
function authenticateApiKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  const apiKey = req.headers["x-predictio-key"];
  
  if (!apiKey || apiKey !== BOT_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  next();
}

// Health check
app.get("/api/v1/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      uptime: process.uptime(),
      version: "1.0.0",
      db: "connected",
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
    const scoredMarkets = markets.map((market) => {
      const timeToClose = (new Date(market.closesAt).getTime() - Date.now()) / 1000;
      const volumeScore = (market.volume / 200000) * 50;
      const timeScore = timeToClose < 3600 ? 50 : timeToClose < 21600 ? 30 : 10;
      const score = volumeScore + timeScore;

      return { ...market, score, timeToClose };
    });

    // Sort by score and take top 5
    const topMarkets = scoredMarkets
      .sort((a, b) => b.score - a.score)
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

    const totalDistributed = winners.reduce((sum, order) => sum + order.amount * order.odds, 0);

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
app.post("/api/v1/orders", async (req, res) => {
  try {
    const { marketId, outcome, amount, walletAddress } = req.body;

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
    res.status(500).json({ error: "Failed to place order" });
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
      revenue24h: (totalVolume._sum.amount || 0) * 0.01, // 0.8-1.2% dynamic fee (avg ~1%)
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

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

// WebSocket Server
const wss = new WebSocketServer({ port: Number(WS_PORT) });

console.log(`🔌 WebSocket server running on port ${WS_PORT}`);

wss.on("connection", (ws: WebSocket, req) => {
  const channel = req.url?.split("/").pop() || "markets";
  console.log(`[WebSocket] New connection to channel: ${channel}`);

  ws.on("error", console.error);

  ws.on("close", () => {
    console.log(`[WebSocket] Client disconnected from ${channel}`);
  });
});

// Mock event emitter for demo
function startMockEventEmitter(wss: WebSocketServer) {
  // New trade every 8s
  setInterval(() => {
    const message = JSON.stringify({
      channel: "markets",
      event: "trade",
      data: {
        marketId: `market-${Math.floor(Math.random() * 20) + 1}`,
        outcome: Math.random() > 0.5 ? "teamA" : "teamB",
        amount: Math.floor(Math.random() * 2000) + 50,
        wallet: `0x${Math.random().toString(16).slice(2, 10)}`,
        timestamp: Date.now(),
      },
    });

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }, 8000);

  // Price update every 15s
  setInterval(() => {
    const message = JSON.stringify({
      channel: "markets",
      event: "price_update",
      data: {
        marketId: `market-${Math.floor(Math.random() * 20) + 1}`,
        outcome: Math.random() > 0.5 ? "teamA" : "teamB",
        newOdds: (1.5 + Math.random() * 2).toFixed(2),
        newPercentage: (30 + Math.random() * 40).toFixed(1),
      },
    });

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }, 15000);

  // Platform update every 30s
  setInterval(() => {
    const message = JSON.stringify({
      channel: "platform",
      event: "volume_update",
      data: {
        total24h: Math.floor(Math.random() * 100000) + 500000,
        lastHour: Math.floor(Math.random() * 10000) + 20000,
        delta: (Math.random() * 20 - 10).toFixed(1),
      },
    });

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }, 30000);
}

startMockEventEmitter(wss);

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing servers...");
  wss.close();
  await prisma.$disconnect();
  process.exit(0);
});
