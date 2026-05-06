import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { normalizeMarketIdParam } from "~/utils/marketId";
import { db } from "~/server/db";
import { azuroDetailToMarket } from "~/server/utils/azuroDetailToMarket";
import { prismaMarketToUi } from "~/server/utils/prismaMarket";
import { getMarketById, mockMarkets, type Market } from "~/data/mockMarkets";
import { SEED_MARKETS } from "~/data/seedMarkets";
import { fetchAzuroGameDetail } from "~/services/azuro";
import type { SeedMarket } from "~/data/seedMarkets";

function seedStatusToUi(s: SeedMarket["status"], endsAt: Date): Market["status"] {
  switch (s) {
    case "resolved":
      return "resolved";
    case "locked":
      return "closed";
    case "ending-soon":
      return "closing-soon";
    case "live":
      return "closed";
    case "upcoming":
    default: {
      const ms = endsAt.getTime() - Date.now();
      if (ms > 0 && ms < 2 * 60 * 60 * 1000) return "closing-soon";
      return "open";
    }
  }
}

export const getMarketDetail = baseProcedure
  .input(z.object({ marketId: z.string() }))
  .query(async ({ input }) => {
    const marketId = normalizeMarketIdParam(input.marketId);

    // Check if this is an Azuro market
    if (marketId.startsWith('azuro-')) {
      const syncedAzuro = await db.market.findUnique({
        where: { id: marketId },
      });
      if (syncedAzuro) {
        const market = prismaMarketToUi(syncedAzuro);
        const predictionHistory = generateMockPredictionHistory(market);
        return {
          market,
          predictionHistory,
          azuroData: {
            gameId: marketId.replace(/^azuro-/, ''),
            conditionId: undefined,
            status: undefined,
            result: undefined,
          },
        };
      }

      try {
        const azuroGameId = marketId.replace('azuro-', '');
        const azuroMarket = await fetchAzuroGameDetail(azuroGameId);
        
        if (azuroMarket) {
          const market = {
            ...azuroDetailToMarket(azuroMarket),
            priceHistory: generatePriceHistory(azuroMarket),
          };
          
          const predictionHistory = generateMockPredictionHistory(market);
          
          return {
            market,
            predictionHistory,
            azuroData: {
              gameId: azuroMarket.azuroGameId,
              conditionId: azuroMarket.azuroConditionId,
              status: azuroMarket.azuroStatus,
              result: azuroMarket.azuroResult,
            },
          };
        }
      } catch (error) {
        console.warn(`[Azuro] Failed to fetch market ${marketId}, falling back to mock data:`, error);
      }
      
      // Azuro fetch failed - fall back to a similar mock market
      const fallbackMarket = mockMarkets[Math.floor(Math.random() * Math.min(5, mockMarkets.length))];
      console.log(`[Mock Fallback] Using mock market as fallback for ${marketId}`);
      
      return {
        market: { ...fallbackMarket, id: marketId },
        predictionHistory: generateMockPredictionHistory(fallbackMarket),
      };
    }

    const dbMarket = await db.market.findUnique({
      where: { id: marketId },
    });
    if (dbMarket) {
      const market = prismaMarketToUi(dbMarket);
      const predictionHistory = generateMockPredictionHistory(market);
      return { market, predictionHistory };
    }
    
    // Try to find in mock markets
    let market = getMarketById(marketId);
    
    // If not found in mock markets, try seed markets
    if (!market) {
      const seedMarket = SEED_MARKETS.find(m => m.id === marketId);
      if (seedMarket) {
        // Transform seed market to Market format
        const closesAt = new Date(seedMarket.endsAt);
        market = {
          id: seedMarket.id,
          sport: seedMarket.sport,
          sportEmoji: seedMarket.sportEmoji,
          league: seedMarket.competition,
          region: seedMarket.event.location || 'International',
          teamA: seedMarket.event.teams[0] || 'Team A',
          teamB: seedMarket.event.teams[1] || 'Team B',
          marketType: 'moneyline' as const,
          yesPrice: seedMarket.outcomes[0]?.price || 0.5,
          noPrice: seedMarket.outcomes[1]?.price || 0.5,
          volume: seedMarket.volume24h,
          closesAt,
          start_time: new Date(seedMarket.event.startsAt),
          event: seedMarket.event.name,
          traders: seedMarket.traders,
          isFeatured: seedMarket.isFeatured || false,
          location: seedMarket.event.location,
          status: seedStatusToUi(seedMarket.status, closesAt),
          percentA: Math.round((seedMarket.outcomes[0]?.price || 0.5) * 100),
          percentB: Math.round((seedMarket.outcomes[1]?.price || 0.5) * 100),
          predictions: seedMarket.traders,
        };
      }
    }
    
    // If still not found, return a random mock market as ultimate fallback
    if (!market) {
      console.warn(`[Mock Fallback] Market ${marketId} not found, using random mock market`);
      market = { ...mockMarkets[0]!, id: marketId } satisfies Market;
    }

    const predictionHistory = generateMockPredictionHistory(market);

    return {
      market,
      predictionHistory,
    };
  });

// Helper to generate price history from Azuro market
function generatePriceHistory(azuroMarket: any) {
  const history = [];
  const now = Date.now();
  const currentYesPrice = azuroMarket.outcomes[0]?.price || 0.5;
  const startPrice = Math.max(0.3, Math.min(0.7, currentYesPrice - (Math.random() * 0.2 - 0.1)));
  
  for (let i = 7 * 24; i >= 0; i--) {
    const timestamp = new Date(now - i * 60 * 60 * 1000);
    const progress = 1 - (i / (7 * 24));
    const yesPrice = startPrice + (currentYesPrice - startPrice) * progress + (Math.random() * 0.02 - 0.01);
    const normalizedYesPrice = Math.max(0.01, Math.min(0.99, yesPrice));
    
    history.push({
      timestamp,
      yesPrice: normalizedYesPrice,
      noPrice: 1 - normalizedYesPrice,
    });
  }
  
  return history;
}

// Helper function to generate mock prediction history with realistic movements
function generateMockPredictionHistory(market: any) {
  const history = [];
  const now = Date.now();
  const hoursToGenerate = 7 * 24; // 7 days of hourly data
  
  // Start with base percentages slightly different from current
  let percentA = market.percentA - 8; // Real Madrid started lower
  let percentB = market.percentB + 5; // Barcelona started higher
  let percentDraw = market.percentDraw ? market.percentDraw + 3 : undefined;
  
  for (let i = hoursToGenerate; i >= 0; i--) {
    const timestamp = new Date(now - i * 60 * 60 * 1000);
    
    // Add realistic movements
    const hoursSinceStart = hoursToGenerate - i;
    
    // Simulate "news" event at around 48 hours ago that boosted Real Madrid
    if (hoursSinceStart === 48) {
      percentA += 6;
      percentB -= 4;
      if (percentDraw !== undefined) percentDraw -= 2;
    }
    
    // General trend: Real Madrid gradually gaining confidence
    if (hoursSinceStart > 48) {
      percentA += Math.random() * 0.3;
      percentB -= Math.random() * 0.2;
      if (percentDraw !== undefined) percentDraw -= Math.random() * 0.1;
    }
    
    // Add some random noise
    const noiseA = (Math.random() - 0.5) * 2;
    const noiseB = (Math.random() - 0.5) * 2;
    const noiseDraw = percentDraw !== undefined ? (Math.random() - 0.5) * 1.5 : 0;
    
    // Ensure percentages stay within bounds and sum to ~100
    percentA = Math.max(20, Math.min(70, percentA + noiseA));
    percentB = Math.max(20, Math.min(70, percentB + noiseB));
    if (percentDraw !== undefined) {
      percentDraw = Math.max(10, Math.min(40, percentDraw + noiseDraw));
      
      // Normalize to sum to 100
      const total = percentA + percentB + percentDraw;
      percentA = (percentA / total) * 100;
      percentB = (percentB / total) * 100;
      percentDraw = (percentDraw / total) * 100;
    } else {
      // Normalize to sum to 100 for 2-outcome markets
      const total = percentA + percentB;
      percentA = (percentA / total) * 100;
      percentB = (percentB / total) * 100;
    }
    
    history.push({
      timestamp,
      percentA: Math.round(percentA * 10) / 10,
      percentB: Math.round(percentB * 10) / 10,
      percentDraw: percentDraw !== undefined ? Math.round(percentDraw * 10) / 10 : undefined,
      volume: market.volume * (0.7 + Math.random() * 0.6),
    });
  }
  
  return history;
}
