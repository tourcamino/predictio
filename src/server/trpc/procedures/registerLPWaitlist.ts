import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import {
  creditWalletPoints,
  POINT_ACTION_VALUES,
} from "~/server/utils/pointsLedger";

export const registerLPWaitlist = baseProcedure
  .input(
    z.object({
      walletAddress: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { walletAddress } = input;
    const normalizedAddress = walletAddress.toLowerCase();

    // Check if already registered
    const existing = await db.lPWaitlist.findUnique({
      where: { walletAddress: normalizedAddress },
    });

    if (existing) {
      return {
        success: true,
        alreadyRegistered: true,
        message: "You're already on the waitlist",
      };
    }

    // Register to waitlist
    const waitlistEntry = await db.lPWaitlist.create({
      data: {
        walletAddress: normalizedAddress,
        pointsCredited: true, // Mark as credited immediately
      },
    });

    try {
      const { newTotal } = await creditWalletPoints(
        normalizedAddress,
        "LP_WAITLIST_JOINED",
        POINT_ACTION_VALUES.LP_WAITLIST_JOINED,
        {
          source: "lp_waitlist",
          registeredAt: waitlistEntry.registeredAt.toISOString(),
        },
      );

      console.log(
        `[LP Waitlist] ${normalizedAddress} registered. Credited ${POINT_ACTION_VALUES.LP_WAITLIST_JOINED} pts. New total: ${newTotal}`,
      );
    } catch (error) {
      console.error("[LP Waitlist] Failed to credit points:", error);
    }

    return {
      success: true,
      alreadyRegistered: false,
      message: "You're on the list. We'll notify you when external LPs can join.",
    };
  });
