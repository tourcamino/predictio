import type { PrismaClient } from "@prisma/client";

const SPORT_EMOJI: Record<string, string> = {
  football: "⚽",
  soccer: "⚽",
  basketball: "🏀",
  baseball: "⚾",
  tennis: "🎾",
  mma: "🥊",
  f1: "🏎️",
  cricket: "🏏",
};

function calculatePositionAPY(position: {
  createdAt: Date;
  feesEarned: number;
  depositedAmount: number;
}): number {
  const daysHeld = Math.max(
    1,
    (Date.now() - position.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );
  const dailyReturn = position.feesEarned / position.depositedAmount / daysHeld;
  return dailyReturn * 365 * 100;
}

export async function runGetUserLPPositionsWeb(
  prisma: PrismaClient,
  input: {
    walletAddress: string;
    status?: "all" | "active" | "withdrawn";
  },
) {
  const walletAddress = input.walletAddress.trim().toLowerCase();
  const status = input.status ?? "active";

  const whereClause: {
    userWallet: string;
    status?: string;
  } = { userWallet: walletAddress };
  if (status !== "all") {
    whereClause.status = status;
  }

  const positions = await prisma.liquidityPosition.findMany({
    where: whereClause,
    include: {
      feeEarnings: {
        orderBy: { createdAt: "desc" },
        take: 30,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const marketsData = await prisma.market.findMany({
    where: { id: { in: positions.map((p) => p.marketId) } },
    select: { id: true, event: true, sport: true, league: true },
  });
  const marketsMap = new Map(marketsData.map((m) => [m.id, m]));

  const formattedPositions = positions.map((position) => {
    const market = marketsMap.get(position.marketId);
    const sportKey = (market?.sport ?? "unknown").toLowerCase();
    const sportEmoji = SPORT_EMOJI[sportKey] ?? "🏆";

    const feeHistory = position.feeEarnings
      .slice(0, 7)
      .map((earning, index) => {
        const cumulative = position.feeEarnings
          .slice(0, index + 1)
          .reduce((sum, e) => sum + e.amount, 0);
        return {
          date: earning.createdAt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          amount: earning.amount,
          cumulative,
        };
      })
      .reverse();

    return {
      id: position.id,
      marketId: position.marketId,
      marketName: market?.event || "Unknown Market",
      sport: market?.sport || "unknown",
      sportEmoji,
      league: market?.league || "Unknown League",
      deposited: position.depositedAmount,
      currentValue: position.currentValue,
      poolShare: position.poolShare,
      feesEarned: position.feesEarned,
      feesPending: position.feesPending,
      apy: calculatePositionAPY(position),
      openSince: position.createdAt,
      status: position.status,
      feeHistory,
    };
  });

  const totalValue = formattedPositions.reduce((sum, p) => sum + p.currentValue, 0);
  const totalDeposited = formattedPositions.reduce((sum, p) => sum + p.deposited, 0);
  const totalFeesEarned = formattedPositions.reduce((sum, p) => sum + p.feesEarned, 0);
  const totalFeesPending = formattedPositions.reduce(
    (sum, p) => sum + p.feesPending,
    0,
  );
  const avgAPY =
    formattedPositions.length > 0
      ? formattedPositions.reduce((sum, p) => sum + p.apy, 0) /
        formattedPositions.length
      : 0;

  return {
    positions: formattedPositions,
    summary: {
      totalValue,
      totalDeposited,
      totalPnL: totalValue - totalDeposited,
      totalPnLPct:
        totalDeposited > 0
          ? ((totalValue - totalDeposited) / totalDeposited) * 100
          : 0,
      totalFeesEarned,
      totalFeesPending,
      avgAPY,
      activePositions: formattedPositions.filter((p) => p.status === "active")
        .length,
    },
    runtime: "express-vps",
  };
}
