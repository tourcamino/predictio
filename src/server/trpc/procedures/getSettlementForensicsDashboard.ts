import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { classifyAzuroGameForSettlement } from "~/lib/settlement/settlementDiagnostics";
import { deriveSettlementConfidence } from "~/lib/settlement/settlementConfidenceScore";
import { fetchAzuroGameForSettlement, getAzuroGraphqlEndpoint } from "~/services/azuro";
import { pickMoneylineCondition } from "~/lib/settlement/azuroConditionSelection";

const CRON_CADENCE = "VPS cron ~every 5 minutes";

/**
 * Internal ops dashboard — real DB + live Azuro poll (PR7).
 */
export const getSettlementForensicsDashboard = baseProcedure
  .input(
    z
      .object({
        marketLimit: z.number().min(1).max(60).default(40),
      })
      .optional(),
  )
  .query(async ({ input }) => {
    const marketLimit = input?.marketLimit ?? 40;
    const checkedAt = new Date().toISOString();

    const openOrders = await db.order.findMany({
      where: { status: "open" },
      select: { marketId: true, id: true },
    });
    const marketIds = [...new Set(openOrders.map((o) => o.marketId))];
    const pollIds = marketIds.slice(0, marketLimit);

    const [lastResolvedOrder, lastSettlementTx, cronHeartbeat, marketsMeta, curatedRows] =
      await Promise.all([
        db.order.findFirst({
          where: { status: "resolved", resolvedAt: { not: null } },
          orderBy: { resolvedAt: "desc" },
          select: { resolvedAt: true, marketId: true },
        }),
        db.transaction.findFirst({
          where: {
            type: { in: ["position_settlement_win", "position_settlement_loss"] },
          },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true, marketId: true },
        }),
        db.botHeartbeat.findUnique({ where: { id: "settlement-cron" } }),
        db.market.findMany({
          where: { id: { in: pollIds } },
          select: {
            id: true,
            status: true,
            sport: true,
            closesAt: true,
            resolvedAt: true,
          },
        }),
        db.curatedEvent.findMany({
          where: {
            OR: [
              { id: { in: pollIds } },
              {
                gameId: {
                  in: pollIds
                    .filter((id) => id.startsWith("azuro-"))
                    .map((id) => id.replace(/^azuro-/, "")),
                },
              },
            ],
          },
          select: {
            id: true,
            gameId: true,
            sport: true,
            sportSlug: true,
            homeOdds: true,
            drawOdds: true,
            awayOdds: true,
          },
        }),
      ]);

    const metaById = new Map(marketsMeta.map((m) => [m.id, m]));
    const curatedByGame = new Map<string, (typeof curatedRows)[number]>();
    for (const c of curatedRows) {
      curatedByGame.set(`azuro-${c.gameId}`, c);
      if (c.id) curatedByGame.set(c.id, c);
    }

    const reasonCounts: Record<string, number> = {};
    const failingMarkets: Array<{
      marketId: string;
      reasonCode: string;
      azuroGameState: string | null;
      conditionIndex: number | null;
      conditionCount: number;
      confidence: string;
      sport: string;
      nonFootball: boolean;
      index0WouldMismatch: boolean;
    }> = [];

    let footballOnly = 0;
    let nonFootballOpen = 0;
    let index0MismatchCount = 0;

    for (const marketId of pollIds) {
      const meta = metaById.get(marketId);
      const curated = curatedByGame.get(marketId);
      const sport = (meta?.sport ?? curated?.sport ?? "unknown").toLowerCase();
      const nonFootball = sport !== "football" && sport !== "soccer";
      if (nonFootball) nonFootballOpen += 1;
      else footballOnly += 1;

      const game = marketId.startsWith("azuro-")
        ? await fetchAzuroGameForSettlement(marketId)
        : null;

      const oddsHint = curated
        ? {
            homeDecimal: curated.homeOdds,
            drawDecimal: curated.drawOdds,
            awayDecimal: curated.awayOdds,
          }
        : undefined;

      const diagnostic = classifyAzuroGameForSettlement(marketId, game, {
        closesAt: meta?.closesAt,
        dbStatus: meta?.status,
        oddsHint,
      });

      reasonCounts[diagnostic.reasonCode] = (reasonCounts[diagnostic.reasonCode] ?? 0) + 1;

      const confidence = deriveSettlementConfidence(diagnostic).level;

      const index0Pick = game?.conditions?.length
        ? pickMoneylineCondition(game.conditions, oddsHint)
        : null;
      const index0WouldMismatch =
        index0Pick != null && index0Pick.index !== 0 && (game?.conditions?.length ?? 0) > 1;
      if (index0WouldMismatch) index0MismatchCount += 1;

      if (diagnostic.skipped && diagnostic.reasonCode !== "MARKET_ALREADY_SETTLED") {
        failingMarkets.push({
          marketId,
          reasonCode: diagnostic.reasonCode,
          azuroGameState: diagnostic.azuroGameState,
          conditionIndex: diagnostic.conditionIndex,
          conditionCount: diagnostic.conditionCount,
          confidence,
          sport,
          nonFootball,
          index0WouldMismatch,
        });
      }
    }

    const unresolved =
      (reasonCounts.ORACLE_PREMATCH ?? 0) +
      (reasonCounts.ORACLE_NOT_RESOLVED ?? 0) +
      (reasonCounts.GAME_NOT_IN_SUBGRAPH ?? 0) +
      (reasonCounts.GRAPHQL_ERROR ?? 0) +
      (reasonCounts.CONDITION_MISSING ?? 0) +
      (reasonCounts.WINNER_UNKNOWN ?? 0);

    const payouts24h = await db.transaction.count({
      where: {
        type: { in: ["position_settlement_win", "position_settlement_loss"] },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    return {
      checkedAt,
      cronCadence: CRON_CADENCE,
      azuroGraphqlEndpoint: getAzuroGraphqlEndpoint(),
      lastSettlementTickAt: cronHeartbeat?.lastRun?.toISOString() ?? null,
      lastSettlementTickMeta: cronHeartbeat
        ? {
            openOrders: cronHeartbeat.ordersPlaced,
            openMarkets: cronHeartbeat.marketsProcessed,
            terminalSettlements: cronHeartbeat.rebalancesDone,
            errorMessage: cronHeartbeat.errorMessage,
          }
        : null,
      lastPayoutAt:
        lastSettlementTx?.createdAt?.toISOString() ??
        lastResolvedOrder?.resolvedAt?.toISOString() ??
        null,
      queue: {
        openOrders: openOrders.length,
        openMarkets: marketIds.length,
        polledMarkets: pollIds.length,
        unresolvedEstimate: unresolved,
      },
      reasonCounts,
      failingMarkets: failingMarkets.slice(0, 25),
      throughput: {
        payoutsLast24h: payouts24h,
      },
      footballAudit: {
        polledFootball: footballOnly,
        polledNonFootball: nonFootballOpen,
        index0WouldMismatch: index0MismatchCount,
        note:
          nonFootballOpen > 0
            ? "Non-football open markets detected — review catalog curation."
            : "Open settlement poll sample is football-only.",
      },
      subgraphGaps: failingMarkets.filter(
        (m) =>
          m.reasonCode === "GAME_NOT_IN_SUBGRAPH" || m.reasonCode === "GRAPHQL_ERROR",
      ).length,
    };
  });
