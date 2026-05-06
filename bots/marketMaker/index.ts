interface MarketMakerConfig {
  targetSpread: number;        // 0.02 = 2%
  maxExposurePerMarket: number; // USDC max per market
  rebalanceInterval: number;   // ms between rebalance
  minLiquidity: number;        // liquidità minima
  enabledMarkets: string[];    // Array of market IDs (empty = all markets)
}

const API_URL = process.env.API_URL || "http://localhost:3001";
const BOT_API_KEY = process.env.BOT_API_KEY || "dev_bot_key";

async function fetchConfig(): Promise<MarketMakerConfig> {
  try {
    const response = await fetch(`${API_URL}/api/v1/bot/market-maker/config`, {
      headers: {
        "X-Predictio-Key": BOT_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch config: ${response.status}`);
    }

    const config = await response.json();

    if (
      typeof config?.targetSpread !== "number" ||
      typeof config?.rebalanceIntervalMs !== "number"
    ) {
      throw new Error("Invalid config response");
    }

    return {
      targetSpread: config.targetSpread,
      maxExposurePerMarket: config.maxExposurePerMarket,
      rebalanceInterval: config.rebalanceIntervalMs,
      minLiquidity: config.minLiquidity,
      enabledMarkets: Array.isArray(config.enabledMarkets) ? config.enabledMarkets : [],
    };
  } catch (error) {
    console.error('[Market Maker] Failed to fetch config, using defaults:', error);
    // Fallback to defaults
    return {
      targetSpread: parseFloat(process.env.MARKET_MAKER_TARGET_SPREAD || "0.02"),
      maxExposurePerMarket: parseFloat(process.env.MARKET_MAKER_MAX_EXPOSURE || "5000"),
      rebalanceInterval: 1800000, // 30 min
      minLiquidity: 500,
      enabledMarkets: [],
    };
  }
}

interface Market {
  id: string;
  event: string;
  volume: number;
  status: string;
  score?: number;
}

interface Orderbook {
  outcomes: Array<{
    name: string;
    volume: number;
    percentage: number;
    odds: number;
  }>;
}

interface Quote {
  bid: number;
  ask: number;
  size: number;
}

async function getTopMarkets(): Promise<Market[]> {
  try {
    const response = await fetch(`${API_URL}/api/v1/markets/hot`, {
      headers: {
        "X-Predictio-Key": BOT_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.markets || [];
  } catch (error) {
    console.error("[Market Maker] Failed to fetch top markets:", error);
    return [];
  }
}

async function getOrderbook(marketId: string): Promise<Orderbook> {
  try {
    const response = await fetch(`${API_URL}/api/v1/markets/${marketId}/orderbook`, {
      headers: {
        "X-Predictio-Key": BOT_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`[Market Maker] Failed to fetch orderbook for ${marketId}:`, error);
    return { outcomes: [] };
  }
}

function calculateQuotes(orderbook: Orderbook, config: MarketMakerConfig): Quote {
  if (orderbook.outcomes.length === 0) {
    return {
      bid: 1.8,
      ask: 2.2,
      size: config.maxExposurePerMarket / 2,
    };
  }

  const mid = orderbook.outcomes.reduce((sum, o) => sum + o.odds, 0) / orderbook.outcomes.length;
  
  return {
    bid: mid * (1 - config.targetSpread / 2),
    ask: mid * (1 + config.targetSpread / 2),
    size: config.maxExposurePerMarket / 2,
  };
}

async function provideLiquidity(marketId: string, quotes: Quote): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/v1/bot/market-maker/provide-liquidity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Predictio-Key": BOT_API_KEY,
      },
      body: JSON.stringify({
        marketId,
        amountPerSide: quotes.size,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    console.log(`[Market Maker] ✅ Provided liquidity to ${marketId}:`, result);
    return true;
  } catch (error) {
    console.error(`[Market Maker] Failed to provide liquidity to ${marketId}:`, error);
    return false;
  }
}

function logMakerActivity(marketId: string, quotes: Quote, config: MarketMakerConfig): void {
  console.log(`[Market Maker] ${new Date().toISOString()}`);
  console.log(`  Market: ${marketId}`);
  console.log(`  Bid: ${quotes.bid.toFixed(2)} | Ask: ${quotes.ask.toFixed(2)}`);
  console.log(`  Size: $${quotes.size.toLocaleString()} per side`);
  console.log(`  Spread: ${(config.targetSpread * 100).toFixed(2)}%`);
}

async function marketMakerLoop(): Promise<void> {
  console.log("🤖 Market Maker starting — predictio.live");

  while (true) {
    try {
      console.log(`\n[${new Date().toISOString()}] Running Market Maker cycle...`);

      // Fetch latest configuration from database
      const config = await fetchConfig();
      console.log(`⚙️  Config: spread=${config.targetSpread}, max=${config.maxExposurePerMarket}, enabledMarkets=${config.enabledMarkets.length || 'all'}`);

      const topMarkets = await getTopMarkets();
      console.log(`📊 Found ${topMarkets.length} top markets`);

      // Filter markets based on enabledMarkets configuration
      const marketsToProcess = config.enabledMarkets.length > 0
        ? topMarkets.filter(m => config.enabledMarkets.includes(m.id))
        : topMarkets;

      if (config.enabledMarkets.length > 0) {
        console.log(`🎯 Filtered to ${marketsToProcess.length} enabled markets`);
      }

      for (const market of marketsToProcess) {
        if (market.status !== "open") continue;

        const orderbook = await getOrderbook(market.id);
        const quotes = calculateQuotes(orderbook, config);
        
        await provideLiquidity(market.id, quotes);
        logMakerActivity(market.id, quotes, config);

        // Small delay between markets
        await sleep(2000);
      }

      console.log(`✅ Cycle completed. Next run in ${config.rebalanceInterval / 60000} minutes`);
      await sleep(config.rebalanceInterval);
    } catch (error) {
      console.error("[Market Maker] Error in main loop:", error);
      console.log("⏳ Retrying in 5 minutes...");
      await sleep(300000);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Start the bot
marketMakerLoop().catch((error) => {
  console.error("[Market Maker] Fatal error:", error);
  process.exit(1);
});
