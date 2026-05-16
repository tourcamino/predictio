import type { PrismaClient } from "@prisma/client";

export async function runGetFollowedAnalystsWeb(
  prisma: PrismaClient,
  userWallet: string,
) {
  const w = userWallet.trim().toLowerCase();
  const follows = await prisma.analystFollow.findMany({
    where: { userWallet: w },
    include: { analyst: true },
    orderBy: { createdAt: "desc" },
  });

  const analysts = follows.map((follow) => ({
    ...follow.analyst,
    followedAt: follow.createdAt.getTime(),
  }));

  return {
    analysts,
    totalCount: analysts.length,
    runtime: "express-vps",
  };
}
