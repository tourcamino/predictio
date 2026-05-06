import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const placeAmmOrder = baseProcedure
  .input(
    z.object({
      marketId: z.string(),
      side: z.enum(['YES', 'NO']),
      price: z.number().min(0.01).max(0.99),
      size: z.number().positive(),
      type: z.enum(['BID', 'ASK']),
      azuroFairValue: z.number().optional(),
      spreadApplied: z.number().default(0.02),
    })
  )
  .mutation(async ({ input }) => {
    // Verify market exists and is open
    const market = await db.market.findUnique({
      where: { id: input.marketId },
    });

    if (!market) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Market not found',
      });
    }

    if (market.status !== 'open') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Market is not open for trading',
      });
    }

    // Get vault allocation for this market
    const allocation = await db.vaultAllocation.findUnique({
      where: { marketId: input.marketId },
    });

    if (!allocation) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No vault allocation found for this market',
      });
    }

    // Check if order size would exceed available allocation
    const availableToAllocate = allocation.maxCap - allocation.currentExposure;
    
    if (input.size > availableToAllocate) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Order size $${input.size.toFixed(2)} exceeds available allocation $${availableToAllocate.toFixed(2)} (30% cap reached)`,
      });
    }

    // Create AMM order
    const order = await db.ammOrder.create({
      data: {
        marketId: input.marketId,
        side: input.side,
        price: input.price,
        size: input.size,
        type: input.type,
        status: 'ACTIVE',
        azuroFairValue: input.azuroFairValue,
        spreadApplied: input.spreadApplied,
      },
    });

    // Update vault allocation exposure
    await db.vaultAllocation.update({
      where: { marketId: input.marketId },
      data: {
        currentExposure: { increment: input.size },
      },
    });

    // Update vault state exposed liquidity
    await db.vaultState.update({
      where: { id: 'singleton' },
      data: {
        exposedLiquidity: { increment: input.size },
        availableLiquidity: { decrement: input.size },
      },
    });

    console.log(`[AMM] Order placed: ${input.side} ${input.type} ${input.size} USDC @ ${input.price} on ${market.event}`);

    return {
      success: true,
      orderId: order.id,
      message: 'AMM order placed successfully',
    };
  });
