import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { mockAnalysts } from "~/data/mockAffiliates";

export const getAnalystFollowers = baseProcedure
  .input(
    z.object({
      analystWallet: z.string(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    })
  )
  .query(async ({ input }) => {
    // Try to get analyst from database first
    const analyst = await db.analyst.findUnique({
      where: { wallet: input.analystWallet },
    });
    
    // If not in database, fall back to mock data
    if (!analyst) {
      const mockAnalyst = mockAnalysts.find((a) => a.wallet === input.analystWallet);
      
      if (!mockAnalyst) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Analyst not found",
        });
      }
      
      // Return mock data for analysts not in database
      const mockFollowers = Array.from({ length: Math.min(input.limit, mockAnalyst.followersCount) }, (_, i) => {
        const index = input.offset + i;
        return {
          id: `follower-${index}`,
          wallet: `0x${Math.random().toString(16).substr(2, 40)}`,
          displayName: `User${index + 1}`,
          avatar: ['🦁', '🐺', '🦅', '🐯', '🐻', '🦊'][index % 6],
          followedAt: Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000,
          totalVolume: Math.floor(Math.random() * 10000) + 500,
          predictions: Math.floor(Math.random() * 50) + 5,
          isValid: Math.random() > 0.3,
        };
      });

      return {
        followers: mockFollowers,
        totalCount: mockAnalyst.followersCount,
        validCount: mockAnalyst.validFollowers,
        hasMore: input.offset + input.limit < mockAnalyst.followersCount,
      };
    }

    // Query real followers from database
    const follows = await db.analystFollow.findMany({
      where: { analystId: analyst.id },
      orderBy: { createdAt: 'desc' },
      skip: input.offset,
      take: input.limit,
    });

    // Get total count
    const totalCount = await db.analystFollow.count({
      where: { analystId: analyst.id },
    });

    // Get user data for each follower
    const followerWallets = follows.map(f => f.userWallet);
    const users = await db.user.findMany({
      where: { wallet: { in: followerWallets } },
    });

    // Create a map for quick lookup
    const userMap = new Map(users.map(u => [u.wallet, u]));

    // Transform the data
    const followers = follows.map((follow) => {
      const user = userMap.get(follow.userWallet);
      
      // A valid follower has made at least 1 prediction and has some volume
      const isValid = user ? (user.predictions > 0 && user.totalVolume > 0) : false;
      
      return {
        id: follow.id,
        wallet: follow.userWallet,
        displayName: `User${follow.userWallet.slice(2, 6)}`, // Simple display name from wallet
        avatar: ['🦁', '🐺', '🦅', '🐯', '🐻', '🦊'][Math.floor(Math.random() * 6)],
        followedAt: follow.createdAt.getTime(),
        totalVolume: user?.totalVolume || 0,
        predictions: user?.predictions || 0,
        isValid,
      };
    });

    // Count valid followers
    const validCount = followers.filter(f => f.isValid).length;

    return {
      followers,
      totalCount,
      validCount,
      hasMore: input.offset + input.limit < totalCount,
    };
  });
