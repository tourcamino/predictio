import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { classifyAzuroGameForSettlement } from "~/lib/settlement/settlementDiagnostics";
import { fetchAzuroGameForSettlement, getAzuroGraphqlEndpoint } from "~/services/azuro";
import { deriveSettlementConfidence } from "~/lib/settlement/settlementConfidenceScore";

/**
 * Read-only settlement queue snapshot for UI + ops (PR6).
 */
export const getSettlementProtocolHealth = baseProcedure
  .input(
    z
      .object({
        sampleLimit: z.number().min(1).max(40).default(20),
      })
      .optional(),
  )
  .query(async ({ input }) => {
    const sampleLimit = input?.sampleLimit ?? 20;
    const checkedAt = new Date().toISOString();

    const [cronHeartbeat] = await Promise.all([
      db.botHeartbeat.findUnique({ where: { id: "settlement-cron" } }),
    ]);

    const openOrders = await db.order.findMany({
      where: { status: "open" },
      select: { marketId: true },
    });
    const marketIds = [...new Set(openOrders.map((o) => o.marketId))];
    const sampleIds = marketIds.slice(0, sampleLimit);

    const reasonCounts: Record<string, number> = {};
    const samples: Array<{
      marketId: string;
      reasonCode: string;
      azuroGameState: string | null;
      conditionIndex: number | null;
      conditionCount: number;
      confidence: string;
    }> = [];

    for (const marketId of sampleIds) {
      const dbMarket = await db.market.findUnique({
        where: { id: marketId },
        select: { status: true, closesAt: true },
      });
      const game = marketId.startsWith("azuro-")
        ? await fetchAzuroGameForSettlement(marketId)
        : null;
      const d = classifyAzuroGameForSettlement(marketId, game, {
        closesAt: dbMarket?.closesAt,
        dbStatus: dbMarket?.status,
      });
      reasonCounts[d.reasonCode] = (reasonCounts[d.reasonCode] ?? 0) + 1;
      samples.push({
        marketId,
        reasonCode: d.reasonCode,
        azuroGameState: d.azuroGameState,
        conditionIndex: d.conditionIndex,
        conditionCount: d.conditionCount,
        confidence: deriveSettlementConfidence(d).level,
      });
    }

    const eligible = reasonCounts.SETTLEMENT_ELIGIBLE ?? 0;
    const prematch = reasonCounts.ORACLE_PREMATCH ?? 0;
    const missing = reasonCounts.GAME_NOT_IN_SUBGRAPH ?? 0;

    const unresolved =
      marketIds.length -
      (reasonCounts.SETTLEMENT_ELIGIBLE ?? 0) -
      (reasonCounts.MARKET_ALREADY_SETTLED ?? 0);

    return {
      checkedAt,
      lastSettlementTickAt: cronHeartbeat?.lastRun?.toISOString() ?? null,
      azuroGraphqlEndpoint: getAzuroGraphqlEndpoint(),
      cronCadence: "Settlement cron on VPS ~every 5 minutes",
      unresolvedMarkets: Math.max(0, unresolved),
      openOrders: openOrders.length,
      openMarkets: marketIds.length,
      sampledMarkets: sampleIds.length,
      reasonCounts,
      samples,
      summary: {
        settlementEligible: eligible,
        oraclePrematch: prematch,
        subgraphMissing: missing,
        payoutConfidence:
          eligible > 0 && prematch === 0
            ? "high"
            : eligible > 0
              ? "partial"
              : "blocked",
      },
    };
  });
