import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { Market, MarketContent } from "./types";
import { mockContent, CONTENT_SYSTEM_PROMPT } from "./mockData";

const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_KEY || process.env.OPENROUTER_KEY;

function generateGenericMock(market: Market): MarketContent {
  const volumeK = (market.volume / 1000).toFixed(0);
  const splits = Object.values(market.percentSplit);
  const splitStr = splits.join("-");

  return {
    preMatch: `$${volumeK}K on ${market.event}. Market split: ${splitStr}. ${market.sport} markets moving fast.`,
    lastHour: `Last hour. $${volumeK}K on ${market.event}. Split: ${splitStr}. Closing soon.`,
    controversial: `${market.event} at ${splitStr} split. The crowd might be wrong on this one.`,
  };
}

export async function generateContent(market: Market): Promise<MarketContent> {
  // First, check if we have pre-written content for this market
  if (mockContent[market.id]) {
    console.log(`[Content Engine] Using pre-written content for ${market.id}`);
    return mockContent[market.id]!;
  }

  // Try to use OpenRouter API if key is available
  if (OPENROUTER_KEY) {
    console.log(`[Content Engine] Generating AI content for ${market.event}`);
    try {
      const openrouter = createOpenRouter({
        apiKey: OPENROUTER_KEY,
      });

      const model = openrouter("anthropic/claude-3-haiku");

      const marketData = JSON.stringify({
        event: market.event,
        sport: market.sport,
        league: market.league,
        volume: market.volume,
        timeToClose: market.timeToClose,
        odds: market.odds,
        percentSplit: market.percentSplit,
      });

      // Generate all three types of content
      const preMatchPrompt = `Generate a preMatch post (3-6 hours before the event) for this market. Include volume and split data. Be provocative but data-driven. Max 240 chars.\n\nMarket: ${marketData}`;
      const lastHourPrompt = `Generate a lastHour post (<1 hour before the event) for this market. Create FOMO with urgency and data. Max 240 chars.\n\nMarket: ${marketData}`;
      const controversialPrompt = `Generate a controversial post with a contrarian take for this market. Challenge the crowd's wisdom with data. Max 240 chars.\n\nMarket: ${marketData}`;

      const [preMatch, lastHour, controversial] = await Promise.all([
        generateText({ model, system: CONTENT_SYSTEM_PROMPT, prompt: preMatchPrompt }),
        generateText({ model, system: CONTENT_SYSTEM_PROMPT, prompt: lastHourPrompt }),
        generateText({ model, system: CONTENT_SYSTEM_PROMPT, prompt: controversialPrompt }),
      ]);

      console.log(`[Content Engine] ✅ AI content generated successfully`);
      return {
        preMatch: preMatch.text,
        lastHour: lastHour.text,
        controversial: controversial.text,
      };
    } catch (error) {
      console.error("[Content Engine] OpenRouter API error, falling back to mock content:", error);
    }
  } else {
    console.warn("[Content Engine] No OpenRouter key found, using fallback content");
  }

  // Fallback to generic mock content
  return generateGenericMock(market);
}
