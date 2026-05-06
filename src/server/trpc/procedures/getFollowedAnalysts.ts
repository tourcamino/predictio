import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getFollowedAnalysts = baseProcedure
  .input(z.object({ userWallet: z.string() }))
  .query(async ({ input }) => {
    // Query the database for followed analysts
    const follows = await db.analystFollow.findMany({
      where: { userWallet: input.userWallet },
      include: { analyst: true },
      orderBy: { createdAt: 'desc' },
    });
    
    // Transform the data to include followedAt timestamp
    const followedAnalysts = follows.map((follow) => ({
      ...follow.analyst,
      followedAt: follow.createdAt.getTime(),
    }));
    
    return {
      analysts: followedAnalysts,
      totalCount: followedAnalysts.length,
    };
  });
