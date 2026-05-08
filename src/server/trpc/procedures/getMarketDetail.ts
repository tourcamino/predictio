import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { normalizeMarketIdParam } from "~/utils/marketId";
import { db } from "~/server/db";
import { azuroDetailToMarket } from "~/server/utils/azuroDetailToMarket";
import { prismaMarketToUi } from "~/server/utils/prismaMarket";
import { getMarketById, mockMarkets, type Market } from "~/data/mockMarkets";
import { SEED_MARKETS } from "~/data/seedMarkets";
import { fetchAzuroGameDetail } from "~/services/azuro";
import { curatedEventRowToUiMarket } from "~/server/utils/curatedEventToUiMarket";
import { seedMarketToUiMarket } from "~/server/utils/seedMarketToUi";

function safeDecodeMarketIdParam(raw: string): string {
  try {
    return decodeURIComponent(raw.trim());
  } catch {
    return raw.trim();
  }
}

export const getMarketDetail = baseProcedure
  .input(z.object({ marketId: z.string() }))
  .query(async ({ input }) => {
    const marketId = normalizeMarketIdParam(safeDecodeMarketIdParam(input.marketId));

    // Check if this is an Azuro market
    if (marketId.startsWith('azuro-')) {
      try {
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
      } catch (dbErr) {
        console.warn("[getMarketDetail] DB lookup skipped for Azuro market:", dbErr);
      }

      try {
        const azuroGameId = marketId.replace(/^azuro-/, "");
        const curated = await db.curatedEvent.findFirst({
          where: {
            OR: [{ gameId: azuroGameId }, { id: azuroGameId }],
            isActive: true,
          },
        });

        if (curated) {
          let market: Market;
          try {
            const azuroMarket = await fetchAzuroGameDetail(azuroGameId);
            if (azuroMarket) {
              market = {
                ...azuroDetailToMarket(azuroMarket),
                priceHistory: generatePriceHistory(azuroMarket),
              };
            } else {
              market = curatedEventRowToUiMarket(curated, marketId);
            }
          } catch {
            market = curatedEventRowToUiMarket(curated, marketId);
          }

          const predictionHistory = generateMockPredictionHistory(market);
          return {
            market,
            predictionHistory,
            azuroData: {
              gameId: azuroGameId,
              conditionId: undefined,
              status: undefined,
              result: undefined,
            },
          };
        }
      } catch (curatedErr) {
        console.warn("[getMarketDetail] CuratedEvent lookup skipped:", curatedErr);
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

    // Mock + seed data first — avoids hanging on Prisma when DATABASE_URL/Postgres is down.
    let market = getMarketById(marketId);
    if (!market) {
      const seedMarket = SEED_MARKETS.find((m) => m.id === marketId);
      if (seedMarket) {
        market = seedMarketToUiMarket(seedMarket);
      }
    }

    if (market) {
      const predictionHistory = generateMockPredictionHistory(market);
      return { market, predictionHistory };
    }

    try {
      const dbMarket = await db.market.findUnique({
        where: { id: marketId },
      });
      if (dbMarket) {
        const m = prismaMarketToUi(dbMarket);
        const predictionHistory = generateMockPredictionHistory(m);
        return { market: m, predictionHistory };
      }
    } catch (dbErr) {
      console.warn("[getMarketDetail] DB lookup skipped:", dbErr);
    }
    
    console.warn(`[Mock Fallback] Market ${marketId} not found, using random mock market`);
    const fallback = { ...mockMarkets[0]!, id: marketId } satisfies Market;
    return {
      market: fallback,
      predictionHistory: generateMockPredictionHistory(fallback),
    };
  });

// Helper to generate price history from Azuro market
function generatePriceHistory(azuroMarket: any) {
  const history = [];
  const now = Date.now();
  let currentYesPrice = Number(azuroMarket.outcomes?.[0]?.price ?? 0.5);
  if (!Number.isFinite(currentYesPrice)) currentYesPrice = 0.5;
  if (currentYesPrice > 1) currentYesPrice /= 100;
  currentYesPrice = Math.max(0.01, Math.min(0.99, currentYesPrice));
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
