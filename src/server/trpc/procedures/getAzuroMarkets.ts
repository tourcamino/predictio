import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { prismaMarketRowToAzuroMarket } from "~/server/utils/dbMarketToAzuroMarket";
import { MAX_FOOTBALL_MARKETS } from "~/constants/azuro";
import { type AzuroMarket, fetchAzuroGames } from "~/services/azuro";
import { prioritizeFeaturedAzuroMarkets } from "~/lib/markets/curateFeaturedEvents";

// Server-side football focus check
// In production, this could be an environment variable
const FOOTBALL_FOCUS_ENABLED = true;
const PRIORITY_COMPETITIONS = ["UEFA Champions League", "Serie A"];
/** When founder curation is active, match Express `GET /api/markets` (max 12, importance ↓ then kickoff ↑). */
const CURATED_MARKETS_CAP = 12;

function sortByCuratedMeta(
  markets: AzuroMarket[],
  curatedByGameId: Map<string, { importanceScore: number; startsAtMs: number }>,
): AzuroMarket[] {
  return [...markets].sort((a, b) => {
    const ga = a.azuroGameId;
    const gb = b.azuroGameId;
    if (!ga || !gb) return 0;
    const ca = curatedByGameId.get(ga);
    const cb = curatedByGameId.get(gb);
    if (ca && cb) {
      const scoreDiff = cb.importanceScore - ca.importanceScore;
      if (scoreDiff !== 0) return scoreDiff;
      return ca.startsAtMs - cb.startsAtMs;
    }
    if (ca && !cb) return -1;
    if (!ca && cb) return 1;
    return b.volume24h - a.volume24h;
  });
}

export const getAzuroMarkets = baseProcedure
  .input(
    z.object({
      sport: z.string().optional(),
      competition: z.string().optional(),
      status: z.string().optional(),
    }).optional()
  )
  .query(async ({ input }) => {
    let curatedByGameId: Map<string, { importanceScore: number; startsAtMs: number }> | null =
      null;
    let useCuratedIntersection = false;

    try {
      const activeCurated = await db.curatedEvent.findMany({
        where: { isActive: true },
      });
      if (activeCurated.length > 0) {
        useCuratedIntersection = true;
        curatedByGameId = new Map(
          activeCurated.map((c) => {
            const imp = (c as { importanceScore?: number }).importanceScore ?? 0;
            return [
              c.gameId,
              {
                importanceScore: imp,
                startsAtMs: c.startsAt.getTime(),
              },
            ];
          }),
        );
      }
    } catch (err) {
      console.warn("[getAzuroMarkets] Curated lookup skipped:", err);
    }

    // Founder-curated mode needs the full indexer list — tiering caps at 9 games and breaks intersection.
    let markets = await fetchAzuroGames({
      skipTiering: useCuratedIntersection,
    });
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

    if (curatedByGameId && curatedByGameId.size > 0) {
      const allow = new Set(curatedByGameId.keys());
      markets = markets.filter(
        (m) => m.azuroGameId != null && allow.has(m.azuroGameId),
      );
    }

    // Enforce football-only filtering when football focus is enabled
    if (FOOTBALL_FOCUS_ENABLED) {
      markets = markets.filter((m) => m.sport === "football");

      if (curatedByGameId && curatedByGameId.size > 0) {
        markets = sortByCuratedMeta(markets, curatedByGameId);
      } else {
        // Sort to prioritize Serie A and Champions League
        markets.sort((a, b) => {
          const aIsPriority = PRIORITY_COMPETITIONS.some((comp) =>
            a.competition.toLowerCase().includes(comp.toLowerCase()),
          );
          const bIsPriority = PRIORITY_COMPETITIONS.some((comp) =>
            b.competition.toLowerCase().includes(comp.toLowerCase()),
          );

          if (aIsPriority && !bIsPriority) return -1;
          if (!aIsPriority && bIsPriority) return 1;

          return b.volume24h - a.volume24h;
        });
      }
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

    /** Runtime featured tier (max 9): premium leagues + odds balance — off when founder CuratedEvent list is active. */
    if (
      FOOTBALL_FOCUS_ENABLED &&
      (!curatedByGameId || curatedByGameId.size === 0)
    ) {
      filteredMarkets = prioritizeFeaturedAzuroMarkets(filteredMarkets, {
        featuredLimit: 9,
      });
    }

    if (
      curatedByGameId &&
      curatedByGameId.size > 0 &&
      FOOTBALL_FOCUS_ENABLED
    ) {
      filteredMarkets = sortByCuratedMeta(filteredMarkets, curatedByGameId);
    }

    if (filteredMarkets.length === 0) {
      console.warn("[getAzuroMarkets] No markets after filters (Azuro + DB only).");
    }

    const listCap =
      curatedByGameId && curatedByGameId.size > 0
        ? CURATED_MARKETS_CAP
        : MAX_FOOTBALL_MARKETS;
    const cappedMarkets = filteredMarkets.slice(0, listCap);

    const source =
      cappedMarkets.length === 0
        ? "empty"
        : mergedDbCount > 0 && cappedMarkets.some((m) => m.azuroGameId)
          ? "mixed"
          : cappedMarkets.some((m) => m.azuroGameId)
            ? "azuro"
            : "db";

    return {
      markets: cappedMarkets,
      total: cappedMarkets.length,
      source,
      footballFocusEnabled: FOOTBALL_FOCUS_ENABLED,
    };
  });
