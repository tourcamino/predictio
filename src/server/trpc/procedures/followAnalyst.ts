import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

// Follower milestones that trigger special notifications
const FOLLOWER_MILESTONES = [10, 50, 100, 500, 1000, 5000, 10000];

export const followAnalyst = baseProcedure
  .input(
    z.object({
      analystId: z.string(),
      userWallet: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    // Check if analyst exists
    const analyst = await db.analyst.findUnique({
      where: { id: input.analystId },
    });
    
    if (!analyst) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Analyst not found",
      });
    }

    // Check if already following
    const existingFollow = await db.analystFollow.findUnique({
      where: {
        userWallet_analystId: {
          userWallet: input.userWallet,
          analystId: input.analystId,
        },
      },
    });

    if (existingFollow) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You are already following this analyst",
      });
    }

    // Create follow relationship and increment follower count in a transaction
    const [_, updatedAnalyst] = await db.$transaction([
      db.analystFollow.create({
        data: {
          userWallet: input.userWallet,
          analystId: input.analystId,
        },
      }),
      db.analyst.update({
        where: { id: input.analystId },
        data: {
          followersCount: { increment: 1 },
        },
      }),
    ]);

    // Create notification for the analyst about their new follower
    const followerShortAddress = `${input.userWallet.slice(0, 6)}...${input.userWallet.slice(-4)}`;
    
    await db.notification.create({
      data: {
        walletAddress: analyst.wallet.toLowerCase(),
        type: 'NEW_FOLLOWER',
        title: 'New Follower! 🎉',
        message: `${followerShortAddress} started following your predictions!`,
      },
    }).catch(err => {
      console.error('[Notifications] Failed to create NEW_FOLLOWER notification:', err);
    });

    // Check if this is a milestone
    const newFollowerCount = updatedAnalyst.followersCount;
    if (FOLLOWER_MILESTONES.includes(newFollowerCount)) {
      await db.notification.create({
        data: {
          walletAddress: analyst.wallet.toLowerCase(),
          type: 'FOLLOWER_MILESTONE',
          title: `${newFollowerCount} Followers Milestone! 🎊`,
          message: `Congratulations! You've reached ${newFollowerCount} followers. Keep up the great predictions!`,
        },
      }).catch(err => {
        console.error('[Notifications] Failed to create FOLLOWER_MILESTONE notification:', err);
      });
    }

    console.log(`[Analyst] ${input.userWallet} followed ${analyst.displayName} (${newFollowerCount} followers)`);

    return {
      success: true,
      message: "Successfully followed analyst",
      newFollowerCount,
    };
  });
