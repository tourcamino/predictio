import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import {
  creditWalletPoints,
  POINT_ACTION_VALUES,
} from "~/server/utils/pointsLedger";

export const syncUserAccount = baseProcedure
  .input(
    z.object({
      walletAddress: z.string().min(1, "Wallet address is required"),
      referralCode: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { walletAddress } = input;
    
    // Normalize wallet address to lowercase for consistency
    const normalizedAddress = walletAddress.toLowerCase();
    
    // Check if user already exists
    let user = await db.user.findUnique({
      where: { wallet: normalizedAddress },
    });
    
    // Track if this is a new user for referral attribution
    const isNewUser = !user;
    
    // If user doesn't exist, create with initial $1,000 balance
    if (!user) {
      user = await db.user.create({
        data: {
          wallet: normalizedAddress,
          virtualBalance: 1000.00,
          totalPnl: 0,
          tradesCount: 0,
          firstSeen: new Date(),
          lastActive: new Date(),
          totalVolume: 0,
          predictions: 0,
          wins: 0,
          losses: 0,
        },
      });
      
      console.log(`[Paper Trading] New account created for ${normalizedAddress} with $1,000 virtual balance`);
    } else {
      // Update last active timestamp
      user = await db.user.update({
        where: { wallet: normalizedAddress },
        data: { lastActive: new Date() },
      });
    }
    
    // Handle referral attribution
    if (input.referralCode && isNewUser) {
      // Only attribute referral for new users
      try {
        // Check for analyst referral first
        const analyst = await db.analyst.findUnique({
          where: { referralCode: input.referralCode },
        });
        
        if (analyst) {
          // Create follow relationship and increment follower count
          const existingFollow = await db.analystFollow.findUnique({
            where: {
              userWallet_analystId: {
                userWallet: normalizedAddress,
                analystId: analyst.id,
              },
            },
          });
          
          if (!existingFollow) {
            await db.$transaction([
              db.analystFollow.create({
                data: {
                  userWallet: normalizedAddress,
                  analystId: analyst.id,
                },
              }),
              db.analyst.update({
                where: { id: analyst.id },
                data: {
                  followersCount: { increment: 1 },
                },
              }),
            ]);
            
            console.log(`[REFERRAL] User ${normalizedAddress} attributed to analyst ${analyst.displayName} (${analyst.wallet}) via referral code ${input.referralCode}`);
          }
        }
        
        // Check for affiliate referral (could be analyst or general affiliate)
        const affiliate = await db.affiliate.findUnique({
          where: { refCode: input.referralCode },
        });
        
        if (affiliate) {
          // Check if tracking record already exists
          const existingTracking = await db.referralTracking.findUnique({
            where: { referredWallet: normalizedAddress },
          });
          
          if (!existingTracking) {
            // Calculate cookie expiration (120 days)
            const cookieExpires = new Date();
            cookieExpires.setDate(cookieExpires.getDate() + parseInt(process.env.REFERRAL_COOKIE_DAYS || '120'));
            
            // Create referral tracking record
            await db.$transaction([
              db.referralTracking.create({
                data: {
                  refCode: input.referralCode,
                  referredWallet: normalizedAddress,
                  attributedAt: new Date(),
                  cookieExpires,
                  isActive: true,
                },
              }),
              db.affiliate.update({
                where: { walletAddress: affiliate.walletAddress },
                data: {
                  totalReferrals: { increment: 1 },
                },
              }),
            ]);
            
            console.log(`[REFERRAL] Created referral tracking: ${normalizedAddress} referred by ${affiliate.walletAddress} (code: ${input.referralCode})`);
          }
        } else if (!analyst) {
          console.warn(`[REFERRAL] Invalid referral code: ${input.referralCode}`);
        }
      } catch (error) {
        console.error('[REFERRAL] Failed to attribute referral:', error);
        // Don't throw error - referral attribution failure shouldn't block user creation
      }
    }
    
    // Credit WALLET_CONNECTED points (one time only)
    const walletConnectedEntry = await db.pointsLedger.findFirst({
      where: {
        walletAddress: normalizedAddress,
        actionType: 'WALLET_CONNECTED',
      },
    });
    
    if (!walletConnectedEntry) {
      try {
        await creditWalletPoints(
          normalizedAddress,
          "WALLET_CONNECTED",
          POINT_ACTION_VALUES.WALLET_CONNECTED,
          {},
        );
        console.log(`[Points] Credited ${POINT_ACTION_VALUES.WALLET_CONNECTED} pts to ${normalizedAddress} for WALLET_CONNECTED`);
      } catch (error) {
        console.error('[Points] Failed to credit WALLET_CONNECTED:', error);
      }
    }
    
    // Credit DAILY_LOGIN points (once per day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayLoginEntry = await db.pointsLedger.findFirst({
      where: {
        walletAddress: normalizedAddress,
        actionType: 'DAILY_LOGIN',
        createdAt: {
          gte: today,
        },
      },
    });
    
    if (!todayLoginEntry) {
      try {
        await creditWalletPoints(
          normalizedAddress,
          "DAILY_LOGIN",
          POINT_ACTION_VALUES.DAILY_LOGIN,
          {},
        );
        console.log(`[Points] Credited ${POINT_ACTION_VALUES.DAILY_LOGIN} pts to ${normalizedAddress} for DAILY_LOGIN`);
      } catch (error) {
        console.error('[Points] Failed to credit DAILY_LOGIN:', error);
      }
    }
    
    return {
      isNewUser,
      virtualBalance: user.virtualBalance,
      totalPnl: user.totalPnl,
      tradesCount: user.tradesCount,
      onboardingCompleted: user.onboardingCompleted,
      user,
    };
  });
