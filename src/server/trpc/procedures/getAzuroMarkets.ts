import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { prismaMarketRowToAzuroMarket } from "~/server/utils/dbMarketToAzuroMarket";
import { MAX_FOOTBALL_MARKETS } from "~/constants/azuro";
import {
  type AzuroMarket,
  fetchAzuroGames,
  getSeedMarketsAsAzuro,
} from "~/services/azuro";

// Server-side football focus check
// In production, this could be an environment variable
const FOOTBALL_FOCUS_ENABLED = true;
const PRIORITY_COMPETITIONS = ['UEFA Champions League', 'Serie A'];

export const getAzuroMarkets = baseProcedure
  .input(
    z.object({
      sport: z.string().optional(),
      competition: z.string().optional(),
      status: z.string().optional(),
    }).optional()
  )
  .query(async ({ input }) => {
    // Fetch Azuro + merge PostgreSQL markets (VPS / local seeded rows appear in list)
    let markets = await fetchAzuroGames();
    let mergedDbCount = 0;
    let fromDb: AzuroMarket[] = [];

    try {
      const dbRows = await db.market.findMany({
        orderBy: { createdAt: "desc" },
        take: 150,
      });
      fromDb = dbRows.map(prismaMarketRowToAzuroMarket);
      mergedDbCount = fromDb.length;
      const dbIds = new Set(fromDb.map((m) => m.id));
      markets = [
        ...fromDb,
        ...markets.filter((m) => !dbIds.has(m.id)),
      ];
    } catch (err) {
      console.warn("[getAzuroMarkets] Skipping DB merge:", err);
    }

    try {
      const activeCurated = await db.curatedEvent.findMany({
        where: { isActive: true },
        select: { gameId: true },
      });
      if (activeCurated.length > 0) {
        const allow = new Set(activeCurated.map((c) => c.gameId));
        markets = markets.filter(
          (m) => m.azuroGameId != null && allow.has(m.azuroGameId),
        );
      }
    } catch (err) {
      console.warn("[getAzuroMarkets] Curated filter skipped:", err);
    }
    
    // Enforce football-only filtering when football focus is enabled
    if (FOOTBALL_FOCUS_ENABLED) {
      markets = markets.filter(m => m.sport === 'football');
      
      // Sort to prioritize Serie A and Champions League
      markets.sort((a, b) => {
        const aIsPriority = PRIORITY_COMPETITIONS.some(comp => 
          a.competition.toLowerCase().includes(comp.toLowerCase())
        );
        const bIsPriority = PRIORITY_COMPETITIONS.some(comp => 
          b.competition.toLowerCase().includes(comp.toLowerCase())
        );
        
        if (aIsPriority && !bIsPriority) return -1;
        if (!aIsPriority && bIsPriority) return 1;
        
        // Secondary sort by volume
        return b.volume24h - a.volume24h;
      });
    }
    
    // Apply additional filters if provided
    let filteredMarkets = markets;
    
    if (input?.sport && input.sport !== 'all') {
      filteredMarkets = filteredMarkets.filter(m => m.sport === input.sport);
    }
    
    if (input?.competition && input.competition !== 'all') {
      filteredMarkets = filteredMarkets.filter(m => m.competitionSlug === input.competition);
    }
    
    if (input?.status && input.status !== 'all') {
      filteredMarkets = filteredMarkets.filter(m => m.status === input.status);
    }

    let usedEmptyFallback = false;
    if (filteredMarkets.length === 0) {
      console.warn(
        "[getAzuroMarkets] No markets after filters — merging DB + seed demos",
      );
      const seedDemo = getSeedMarketsAsAzuro();
      const dbIds = new Set(fromDb.map((m) => m.id));
      const merged = [...fromDb, ...seedDemo.filter((m) => !dbIds.has(m.id))];
      let emergency = merged;
      if (FOOTBALL_FOCUS_ENABLED) {
        emergency = merged.filter((m) => m.sport === "football");
      }
      if (input?.sport && input.sport !== "all") {
        emergency = emergency.filter((m) => m.sport === input.sport);
      }
      if (input?.competition && input.competition !== "all") {
        emergency = emergency.filter(
          (m) => m.competitionSlug === input.competition,
        );
      }
      if (input?.status && input.status !== "all") {
        emergency = emergency.filter((m) => m.status === input.status);
      }
      if (emergency.length > 0) {
        filteredMarkets = emergency;
        usedEmptyFallback = true;
      }
    }
    
    const cappedMarkets = filteredMarkets.slice(0, MAX_FOOTBALL_MARKETS);

    const source =
      mergedDbCount > 0
        ? "mixed"
        : cappedMarkets[0]?.azuroGameId
          ? "azuro"
          : usedEmptyFallback
            ? "fallback"
            : "mock";

    return {
      markets: cappedMarkets,
      total: cappedMarkets.length,
      source,
      footballFocusEnabled: FOOTBALL_FOCUS_ENABLED,
    };
  });
