import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { classifyAzuroGameForSettlement } from "~/lib/settlement/settlementDiagnostics";
import { fetchAzuroGameForSettlement } from "~/services/azuro";

export const getMarketSettlementDiagnostic = baseProcedure
  .input(z.object({ marketId: z.string() }))
  .query(async ({ input }) => {
    const { marketId } = input;
    const checkedAt = new Date().toISOString();

    const dbMarket = await db.market.findUnique({
      where: { id: marketId },
      select: { status: true, closesAt: true, resolvedAt: true },
    });

    const game = marketId.startsWith("azuro-")
      ? await fetchAzuroGameForSettlement(marketId)
      : null;

    return {
      diagnostic: classifyAzuroGameForSettlement(marketId, game, {
        closesAt: dbMarket?.closesAt,
        dbStatus: dbMarket?.status,
      }),
      checkedAt,
    };
  });
