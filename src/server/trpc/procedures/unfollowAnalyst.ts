import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const unfollowAnalyst = baseProcedure
  .input(
    z.object({
      analystId: z.string(),
      userWallet: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    // Check if follow relationship exists
    const follow = await db.analystFollow.findUnique({
      where: {
        userWallet_analystId: {
          userWallet: input.userWallet,
          analystId: input.analystId,
        },
      },
    });
    
    if (!follow) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "You are not following this analyst",
      });
    }

    // Delete follow relationship and decrement follower count in a transaction
    await db.$transaction([
      db.analystFollow.delete({
        where: {
          userWallet_analystId: {
            userWallet: input.userWallet,
            analystId: input.analystId,
          },
        },
      }),
      db.analyst.update({
        where: { id: input.analystId },
        data: {
          followersCount: { decrement: 1 },
        },
      }),
    ]);

    return {
      success: true,
      message: "Successfully unfollowed analyst",
    };
  });
