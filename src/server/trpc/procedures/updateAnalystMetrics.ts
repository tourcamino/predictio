import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const updateAnalystMetrics = baseProcedure
  .input(
    z.object({
      analystWallet: z.string().optional(), // If provided, only update this analyst
    })
  )
  .mutation(async ({ input }) => {
    // Get analysts to update
    const analysts = input.analystWallet
      ? await db.analyst.findMany({
          where: { wallet: input.analystWallet.toLowerCase() },
        })
      : await db.analyst.findMany();

    if (analysts.length === 0) {
      return {
        success: true,
        updatedCount: 0,
        message: "No analysts to update",
      };
    }

    console.log(`[Analyst Metrics] Updating metrics for ${analysts.length} analysts`);

    let updatedCount = 0;

    for (const analyst of analysts) {
      try {
        // Get all followers
        const followers = await db.analystFollow.findMany({
          where: { analystId: analyst.id },
        });

        let totalVolume = 0;
        let validFollowerCount = 0;

        // Calculate metrics from each follower
        for (const follower of followers) {
          const user = await db.user.findUnique({
            where: { wallet: follower.userWallet },
          });

          if (!user) continue;

          // Add to total volume
          totalVolume += user.totalVolume;

          // Check if follower is valid (>= $50 volume and 3+ days active)
          const daysSinceFirstSeen = Math.floor(
            (Date.now() - user.firstSeen.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (user.totalVolume >= 50 && daysSinceFirstSeen >= 3) {
            validFollowerCount++;
          }
        }

        // Calculate analyst's own trading stats for ROI
        const analystOrders = await db.order.findMany({
          where: {
            wallet: analyst.wallet,
            status: "resolved",
          },
        });

        let totalInvested = 0;
        let totalPnL = 0;
        let wins = 0;

        for (const order of analystOrders) {
          const shares = order.shares || 0;
          const avgPrice = order.avgPrice || 0;
          const costBasis = shares * avgPrice;
          totalInvested += costBasis;
          totalPnL += order.pnl || 0;
          if ((order.pnl || 0) > 0) wins++;
        }

        const roi = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
        const winRate = analystOrders.length > 0 ? (wins / analystOrders.length) * 100 : 0;

        // Get pending rewards from affiliate system
        const affiliate = await db.affiliate.findUnique({
          where: { walletAddress: analyst.wallet },
        });

        // Update analyst record (no tier calculation)
        await db.analyst.update({
          where: { id: analyst.id },
          data: {
            followersCount: followers.length,
            validFollowers: validFollowerCount,
            volumeGenerated: totalVolume,
            pendingRewards: affiliate?.pendingRewardsUsd || 0,
            totalEarned: affiliate?.totalRewardsUsd || 0,
            roi,
            winRate,
            totalPredictions: analystOrders.length,
            updatedAt: new Date(),
          },
        });

        console.log(
          `[Analyst Metrics] Updated ${analyst.displayName}: ${validFollowerCount} valid followers, $${totalVolume.toFixed(2)} volume, ${roi.toFixed(1)}% ROI`
        );

        updatedCount++;
      } catch (error) {
        console.error(`[Analyst Metrics] Error updating analyst ${analyst.wallet}:`, error);
      }
    }

    console.log(`[Analyst Metrics] Successfully updated ${updatedCount} analysts`);

    return {
      success: true,
      updatedCount,
      message: `Updated ${updatedCount} analyst(s)`,
    };
  });
