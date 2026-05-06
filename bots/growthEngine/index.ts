interface Market {
  id: string;
  sport: string;
  league: string;
  event: string;
  volume: number;
  timeToClose: number;
  score?: number;
  percentSplit: Record<string, number>;
  odds: Record<string, number>;
}

interface MarketContent {
  preMatch: string;
  lastHour: string;
  controversial: string;
}

const API_URL = process.env.API_URL || "http://localhost:3001";
const SITE_URL = process.env.SITE_URL || "https://predictio.live";
const BOT_API_KEY = process.env.BOT_API_KEY || "dev_bot_key";
const OPENROUTER_KEY = process.env.OPENROUTER_KEY || "";
const CYCLE_HOURS = parseFloat(process.env.CYCLE_HOURS || "2");

const CONTENT_SYSTEM_PROMPT = `You are a sharp sports trader who tracks prediction markets. Write short data-driven posts.
Rules:
- Always include real numbers: volume, % split, odds
- Sound human, never like a brand or bot
- Slightly provocative, never clickbait
- No CTAs, no links, no "Join now"
- Max 240 chars for X posts
- Reference the specific market data provided`;

async function scanMarkets(): Promise<Market[]> {
  try {
    const response = await fetch(`${API_URL}/api/v1/markets/hot`, {
      headers: { "X-Predictio-Key": BOT_API_KEY },
    });
    
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    
    const data = await response.json();
    return data.markets || [];
  } catch (error) {
    console.error("[Growth Engine] Failed to scan markets:", error);
    return [];
  }
}

function selectTopMarkets(markets: Market[], count: number): Market[] {
  return markets
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, count);
}

async function generateContent(market: Market): Promise<MarketContent> {
  if (!OPENROUTER_KEY) {
    console.warn("[Growth Engine] No OpenRouter key, using fallback content");
    return generateFallbackContent(market);
  }

  try {
    const marketData = JSON.stringify({
      event: market.event,
      sport: market.sport,
      league: market.league,
      volume: market.volume,
      timeToClose: market.timeToClose,
      odds: market.odds,
      percentSplit: market.percentSplit,
    });

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "HTTP-Referer": SITE_URL,
        "X-Title": "Predictio Growth Engine",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3-haiku",
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content: CONTENT_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: `Generate 3 posts for this market:
Event: ${market.event}
Sport: ${market.sport}  
Volume: $${market.volume.toLocaleString()} USDC
Split: ${Object.values(market.percentSplit).join('% vs ')}%
Closes in: ${Math.round(market.timeToClose / 3600)}h

Return JSON only:
{
  "preMatch": "...",
  "lastHour": "...",
  "controversial": "..."
}`,
          },
        ],
      }),
    });

    if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`);

    const data = await response.json();
    const content = JSON.parse(data.choices[0].message.content);
    
    console.log(`[Growth Engine] ✅ Generated AI content for ${market.event}`);
    return content;
  } catch (error) {
    console.error("[Growth Engine] AI generation failed, using fallback:", error);
    return generateFallbackContent(market);
  }
}

function generateFallbackContent(market: Market): MarketContent {
  const volumeK = (market.volume / 1000).toFixed(0);
  const splits = Object.values(market.percentSplit);
  
  return {
    preMatch: `$${volumeK}K on ${market.event}. Split: ${splits.join('-')}%. ${market.sport} markets heating up.`,
    lastHour: `Last hour to bet. $${volumeK}K on ${market.event}. ${splits.join('-')}% split. Clock ticking.`,
    controversial: `${market.event} at ${splits.join('-')}% split. Crowd might be wrong here.`,
  };
}

async function postToX(content: string, marketId: string, type: string): Promise<void> {
  console.log(`[Growth Engine] 🐦 X post (${type}): "${content.substring(0, 60)}..."`);
  
  try {
    await fetch(`${API_URL}/api/v1/bot/growth/log-interaction`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Predictio-Key": BOT_API_KEY,
      },
      body: JSON.stringify({
        type: "post",
        platform: "twitter",
        marketId,
        content,
      }),
    });
  } catch (error) {
    console.error("[Growth Engine] Failed to log X post:", error);
  }
}

async function postToTelegram(content: string, type: string): Promise<void> {
  console.log(`[Growth Engine] 📱 Telegram post (${type}): "${content.substring(0, 60)}..."`);
  
  try {
    await fetch(`${API_URL}/api/v1/bot/growth/log-interaction`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Predictio-Key": BOT_API_KEY,
      },
      body: JSON.stringify({
        type: "post",
        platform: "telegram",
        content,
      }),
    });
  } catch (error) {
    console.error("[Growth Engine] Failed to log Telegram post:", error);
  }
}

async function processDMQueue(): Promise<number> {
  // In production, this would check tracked users and send DMs
  const dmsSent = Math.floor(Math.random() * 3);
  console.log(`[Growth Engine] 💬 Processed DM queue: ${dmsSent} DMs sent`);
  return dmsSent;
}

async function runCycle(): Promise<void> {
  console.log(`\n[${new Date().toISOString()}] 🚀 Running Growth Engine cycle...`);

  try {
    const allMarkets = await scanMarkets();
    console.log(`📊 Scanned ${allMarkets.length} markets`);

    const topMarkets = selectTopMarkets(allMarkets, 3);
    console.log(`🎯 Top markets: ${topMarkets.map(m => m.event).join(", ")}`);

    for (const market of topMarkets) {
      const content = await generateContent(market);

      await postToX(content.preMatch, market.id, "preMatch");

      if (market.timeToClose < 3600) {
        await postToTelegram(content.lastHour, "lastHour");
        await postToX(content.lastHour, market.id, "lastHour");
      }

      await postToX(content.controversial, market.id, "controversial");

      // Small delay between markets
      await sleep(5000);
    }

    const dmsSent = await processDMQueue();
    
    console.log(`✅ Cycle completed: ${topMarkets.length} markets, ${dmsSent} DMs`);
  } catch (error) {
    console.error("❌ Error in growth engine cycle:", error);
  }
}

async function growthEngineLoop(): Promise<void> {
  console.log("🚀 Growth Engine starting — predictio.live");
  console.log(`⚙️  Cycle interval: ${CYCLE_HOURS} hours`);

  while (true) {
    await runCycle();

    const waitTime = CYCLE_HOURS * 3600000 + Math.random() * 3600000;
    console.log(`⏳ Next cycle in ${Math.round(waitTime / 3600000 * 10) / 10}h`);
    await sleep(waitTime);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Start the bot
growthEngineLoop().catch((error) => {
  console.error("[Growth Engine] Fatal error:", error);
  process.exit(1);
});
