import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import {
  buildVaultAllocationRows,
  resolveVaultCanonicalExposure,
} from "~/server/services/vaultCuratedExposureBridge";

function getSportEmoji(sport: string): string {
  const emojiMap: Record<string, string> = {
    football: "⚽",
    basketball: "🏀",
    baseball: "⚾",
    tennis: "🎾",
    mma: "🥊",
    f1: "🏎️",
    cricket: "🏏",
  };
  return emojiMap[sport.toLowerCase()] || "🏆";
}

export const getProtocolVaultStats = baseProcedure
  .input(z.object({}).optional())
  .query(async () => {
    const activePositions = await db.liquidityPosition.findMany({
      where: {
        status: "active",
      },
    });

    const externalLPs = new Set(activePositions.map((p) => p.userWallet)).size;
    const externalLPTotal = activePositions.reduce((sum, p) => sum + p.depositedAmount, 0);

    const seedCapital = 500;
    const totalLiquidity = seedCapital + externalLPTotal;

    const exposure = await resolveVaultCanonicalExposure();
    const marketAllocations = buildVaultAllocationRows(
      exposure.slots,
      exposure.allocationSource,
      totalLiquidity,
      getSportEmoji,
    );

    const marketsActive = exposure.marketsActive;

    let vaultAPY: number | null = null;

    if (totalLiquidity > 0) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const fees30d = await db.lPFeeEarning.aggregate({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
        _sum: {
          amount: true,
        },
      });

      const totalFees30d = fees30d._sum.amount || 0;

      if (totalFees30d > 0) {
        const monthlyReturn = totalFees30d / totalLiquidity;
        vaultAPY = parseFloat((monthlyReturn * 12 * 100).toFixed(2));
      }
    }

    if (process.env.NODE_ENV === "development") {
      console.debug(
        `[getProtocolVaultStats] allocation source: ${exposure.diagnostics.allocationSource}`,
      );
    }

    return {
      totalLiquidity,
      seedCapital,
      externalLPs,
      externalLPTotal,
      marketsActive,
      vaultAPY,
      marketAllocations,
      vaultExposureDiagnostics: exposure.diagnostics,
    };
  });
