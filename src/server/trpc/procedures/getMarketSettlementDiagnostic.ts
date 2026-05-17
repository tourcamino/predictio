import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { classifyAzuroGameForSettlement } from "~/lib/settlement/settlementDiagnostics";
import { deriveSettlementConfidence } from "~/lib/settlement/settlementConfidenceScore";
import { buildOracleTrustSnapshot } from "~/lib/settlement/oracleTrustLayer";
import { fetchAzuroGameForSettlement } from "~/services/azuro";
import { loadMarketUiById } from "~/server/utils/loadMarketUi";

export const getMarketSettlementDiagnostic = baseProcedure
  .input(z.object({ marketId: z.string() }))
  .query(async ({ input }) => {
    const { marketId } = input;
    const checkedAt = new Date().toISOString();

    const [dbMarket, uiMarket, curated] = await Promise.all([
      db.market.findUnique({
        where: { id: marketId },
        select: { status: true, closesAt: true, resolvedAt: true },
      }),
      loadMarketUiById(marketId),
      db.curatedEvent.findFirst({
        where: {
          OR: [
            { id: marketId },
            { gameId: marketId.replace(/^azuro-/, "") },
          ],
        },
        select: { homeOdds: true, drawOdds: true, awayOdds: true },
      }),
    ]);

    const game = marketId.startsWith("azuro-")
      ? await fetchAzuroGameForSettlement(marketId)
      : null;

    const homeDecimal = curated?.homeOdds ?? null;
    const drawDecimal = curated?.drawOdds ?? null;
    const awayDecimal = curated?.awayOdds ?? null;

    const diagnostic = classifyAzuroGameForSettlement(marketId, game, {
      closesAt: dbMarket?.closesAt ?? uiMarket?.closesAt,
      dbStatus: dbMarket?.status ?? uiMarket?.status,
      oddsHint: { homeDecimal, drawDecimal, awayDecimal },
    });

    const cronHeartbeat = await db.botHeartbeat.findUnique({
      where: { id: "settlement-cron" },
    });

    const openOnMarket = await db.order.count({
      where: { marketId, status: "open" },
    });

    const confidence = deriveSettlementConfidence(diagnostic);
    const oracleTrust = buildOracleTrustSnapshot({
      diagnostic,
      checkedAt,
      lastSettlementTickAt: cronHeartbeat?.lastRun?.toISOString() ?? null,
      queueOpenOrders: openOnMarket,
      queueOpenMarkets: openOnMarket > 0 ? 1 : 0,
      unresolvedMarkets: diagnostic.skipped ? 1 : 0,
    });

    return {
      diagnostic,
      checkedAt,
      confidence,
      oracleTrust,
    };
  });
