/**
 * Server-side paper settlement driver (run on VPS cron every 5 minutes).
 *
 *   node --env-file=.env --import tsx src/server/scripts/runGlobalPaperSettlementTick.ts
 *
 * Polls Azuro for all markets with open orders, then applies binary settle / refund / dispute.
 */
import { db } from "~/server/db";
import { checkResolvedMarkets, getAzuroGraphqlEndpoint } from "~/services/azuro";
import type { MoneylineOddsHint } from "~/lib/settlement/azuroConditionSelection";
import { runPaperBatchSettlement } from "~/lib/settlement/paperSettlementEngine";
import { runPaperRefundSettlement } from "~/lib/settlement/paperRefundEngine";
import { loadMarketUiById } from "~/server/utils/loadMarketUi";
import { logSettlementMetric } from "~/lib/settlement/settlementObservability";
import type { PaperRefundReason } from "~/lib/settlement/disputeRefundContract";

async function main() {
  const tickStarted = Date.now();
  const openOrders = await db.order.findMany({
    where: { status: "open" },
    select: { marketId: true },
  });
  const marketIds = [...new Set(openOrders.map((o) => o.marketId))];
  if (marketIds.length === 0) {
    console.log("[settlement-tick] no open orders");
    return;
  }

  logSettlementMetric("settlement_tick_start", {
    polledMarkets: marketIds.length,
    openOrders: openOrders.length,
    azuroEndpoint: getAzuroGraphqlEndpoint(),
    settlementSource: process.env.AZURO_USE_REST_ORACLE !== "false" ? "azuro_rest" : "azuro_subgraph_legacy",
  });

  const azuroMarketIds = marketIds.filter((id) => id.startsWith("azuro-"));
  const gameIds = azuroMarketIds.map((id) => id.replace("azuro-", ""));
  const curatedRows =
    gameIds.length > 0
      ? await db.curatedEvent.findMany({
          where: { gameId: { in: gameIds } },
          select: { gameId: true, homeOdds: true, drawOdds: true, awayOdds: true },
        })
      : [];
  const oddsHintsByMarketId = new Map<string, MoneylineOddsHint>();
  for (const row of curatedRows) {
    oddsHintsByMarketId.set(`azuro-${row.gameId}`, {
      homeDecimal: row.homeOdds ?? null,
      drawDecimal: row.drawOdds ?? null,
      awayDecimal: row.awayOdds ?? null,
    });
  }

  const resolved = await checkResolvedMarkets(marketIds, oddsHintsByMarketId);
  console.log(
    JSON.stringify({
      type: "settlement_tick_oracle_result",
      terminalItems: resolved.length,
      kinds: resolved.reduce(
        (acc, r) => {
          acc[r.kind] = (acc[r.kind] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    }),
  );
  if (resolved.length === 0 && marketIds.length > 0) {
    console.log(
      JSON.stringify({
        type: "settlement_tick_summary",
        polledMarkets: marketIds.length,
        openOrders: openOrders.length,
        hint: "See settlement_diagnostic lines above for per-market blockers (e.g. ORACLE_PREMATCH)",
      }),
    );
  }

  let terminalSettlements = 0;

  for (const item of resolved) {
    try {
      logSettlementMetric("settlement_attempt", {
        marketId: item.marketId,
        kind: item.kind,
        conditionId: item.conditionId,
      });
      if (item.kind === "REFUND") {
        const marketUi = await loadMarketUiById(item.marketId);
        const marketLabel =
          marketUi?.event ??
          (marketUi ? `${marketUi.teamA} vs ${marketUi.teamB}` : item.marketId);
        await runPaperRefundSettlement({
          marketId: item.marketId,
          reason: item.refundReason as PaperRefundReason,
          authority: "azuro_graphql",
          conditionId: item.conditionId,
          observedAt: new Date(),
          rawOracle: item.rawState ?? item.refundReason,
          marketLabel,
        });
        terminalSettlements += 1;
        logSettlementMetric("payout_execution_time", {
          marketId: item.marketId,
          kind: "REFUND",
          ms: Date.now() - tickStarted,
          ledgerWriteSuccess: true,
        });
        console.log(`[settlement-tick] refunded ${item.marketId}`);
        continue;
      }

      if (item.kind === "DISPUTE") {
        const existing = await db.market.findUnique({ where: { id: item.marketId } });
        if (existing) {
          await db.market.update({
            where: { id: item.marketId },
            data: { status: "under_review" },
          });
        }
        console.log(`[settlement-tick] disputed ${item.marketId}: ${item.disputeReason}`);
        continue;
      }

      const winningOutcome = item.result === "home" ? "YES" : "NO";
      const marketUi = await loadMarketUiById(item.marketId);
      const marketLabel =
        marketUi?.event ??
        (marketUi ? `${marketUi.teamA} vs ${marketUi.teamB}` : item.marketId);

      const result = await runPaperBatchSettlement({
        marketId: item.marketId,
        winningOutcome,
        oracle: {
          source: "azuro_graphql",
          conditionId: item.conditionId,
          observedAt: new Date(),
          rawOutcome: item.result,
        },
        marketLabel,
      });
      terminalSettlements += result.settledThisRun;
      logSettlementMetric("payout_execution_time", {
        marketId: item.marketId,
        kind: "BINARY",
        ms: Date.now() - tickStarted,
        ledgerWriteSuccess: result.settledThisRun > 0,
        settledOrders: result.settledThisRun,
        duplicatePrevented: result.idempotent,
      });
      console.log(
        `[settlement-tick] settled ${item.marketId} winner=${winningOutcome} count=${result.settledThisRun}`,
      );
    } catch (e) {
      logSettlementMetric("settlement_attempt_failed", {
        marketId: item.marketId,
        error: e instanceof Error ? e.message : String(e),
      });
      console.error(`[settlement-tick] failed ${item.marketId}:`, e);
    }
  }

  await db.botHeartbeat.upsert({
    where: { id: "settlement-cron" },
    create: {
      id: "settlement-cron",
      status: "ONLINE",
      lastRun: new Date(),
      marketsProcessed: marketIds.length,
      ordersPlaced: openOrders.length,
      rebalancesDone: terminalSettlements,
    },
    update: {
      status: "ONLINE",
      lastRun: new Date(),
      marketsProcessed: marketIds.length,
      ordersPlaced: openOrders.length,
      rebalancesDone: terminalSettlements,
      errorMessage: null,
    },
  });

  logSettlementMetric("settlement_tick_complete", {
    polledMarkets: marketIds.length,
    openOrders: openOrders.length,
    terminalSettlements,
    durationMs: Date.now() - tickStarted,
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
