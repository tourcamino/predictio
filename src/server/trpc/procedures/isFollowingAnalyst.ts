import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const isFollowingAnalyst = baseProcedure
  .input(
    z.object({
      analystId: z.string(),
      userWallet: z.string(),
    })
  )
  .query(async ({ input }) => {
    const follow = await db.analystFollow.findUnique({
      where: {
        userWallet_analystId: {
          userWallet: input.userWallet,
          analystId: input.analystId,
        },
      },
    });

    return {
      isFollowing: !!follow,
    };
  });
