import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { resolveCanonicalLiquidityState } from "~/server/services/canonicalLiquidityState";
import { getProtocolLiquidityConfigFromEnv } from "~/lib/protocolLiquidityMode";

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
    const liquidityConfig = getProtocolLiquidityConfigFromEnv();
    const isPreTestnet = liquidityConfig.mode === "PRE_TESTNET";
    const canonical = await resolveCanonicalLiquidityState();

    const activePositions = await db.liquidityPosition.findMany({
      where: { status: "active" },
    });
    const externalLPs = new Set(activePositions.map((p) => p.userWallet)).size;

    const marketAllocations = canonical.liquidityPerMarket.map((r) => ({
      marketId: r.marketId,
      marketName: r.marketName,
      league: r.league,
      sport: r.sport,
      sportEmoji: getSportEmoji(r.sport),
      allocation: r.allocation,
      percentage: r.percentage,
      volume: r.volume,
      appealScore: r.appealScore,
    }));

    let vaultAPY: number | null = null;
    if (liquidityConfig.showSimulatedApyProjections && canonical.totalLiquidity > 0) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const fees30d = await db.lPFeeEarning.aggregate({
        where: { createdAt: { gte: thirtyDaysAgo } },
        _sum: { amount: true },
      });
      const totalFees30d = fees30d._sum.amount || 0;
      if (totalFees30d > 0) {
        const monthlyReturn = totalFees30d / canonical.totalLiquidity;
        vaultAPY = parseFloat((monthlyReturn * 12 * 100).toFixed(2));
      }
    }

    return {
      protocolMode: canonical.protocolMode,
      allocationMode: canonical.allocationMode,
      totalSimulatedLiquidity: canonical.totalSimulatedLiquidity,
      totalLiquidity: canonical.totalLiquidity,
      seedCapital: isPreTestnet ? 0 : canonical.totalSimulatedLiquidity,
      externalLPs,
      externalLPTotal: canonical.externalLpTotal,
      marketsActive: canonical.canonicalOpenSlots,
      vaultAPY,
      marketAllocations,
      allocationSum: canonical.allocationSum,
      allocationCoherent: canonical.allocationCoherent,
      allocationByMarketId: canonical.allocationByMarketId,
      showDollarLiquidity: liquidityConfig.showDollarLiquidity,
      showSimulatedApyProjections: liquidityConfig.showSimulatedApyProjections,
      showExternalLpAsReal: liquidityConfig.showExternalLpAsReal,
      vaultExposureDiagnostics: canonical.diagnostics,
      canonicalLiquidityAt: canonical.at,
      allocationVersion: canonical.allocationVersion,
      rebalanceTriggeredAt: canonical.rebalanceTriggeredAt,
      vaultAlignment: canonical.vaultAlignment,
      vaultSnapshots: canonical.vaultSnapshots,
    };
  });
