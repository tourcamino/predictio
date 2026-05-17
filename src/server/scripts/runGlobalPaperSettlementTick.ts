/**
 * Server-side paper settlement driver (run on VPS cron every 5 minutes).
 *
 *   node --env-file=.env --import tsx src/server/scripts/runGlobalPaperSettlementTick.ts
 *
 * Polls Azuro for all markets with open orders, then applies binary settle / refund / dispute.
 */
import { db } from "~/server/db";
import { checkResolvedMarkets } from "~/services/azuro";
import { runPaperBatchSettlement } from "~/lib/settlement/paperSettlementEngine";
import { runPaperRefundSettlement } from "~/lib/settlement/paperRefundEngine";
import { loadMarketUiById } from "~/server/utils/loadMarketUi";
import type { PaperRefundReason } from "~/lib/settlement/disputeRefundContract";

async function main() {
  const openOrders = await db.order.findMany({
    where: { status: "open" },
    select: { marketId: true },
  });
  const marketIds = [...new Set(openOrders.map((o) => o.marketId))];
  if (marketIds.length === 0) {
    console.log("[settlement-tick] no open orders");
    return;
  }

  console.log(
    JSON.stringify({
      type: "settlement_tick_start",
      polledMarkets: marketIds.length,
      openOrders: openOrders.length,
      at: new Date().toISOString(),
    }),
  );
  const resolved = await checkResolvedMarkets(marketIds);
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

  for (const item of resolved) {
    try {
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
      console.log(
        `[settlement-tick] settled ${item.marketId} winner=${winningOutcome} count=${result.settledThisRun}`,
      );
    } catch (e) {
      console.error(`[settlement-tick] failed ${item.marketId}:`, e);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
