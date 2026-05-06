import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const cancelAmmOrder = baseProcedure
  .input(
    z.object({
      orderId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    // Get the order
    const order = await db.ammOrder.findUnique({
      where: { id: input.orderId },
    });

    if (!order) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Order not found',
      });
    }

    if (order.status !== 'ACTIVE') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Order is not active',
      });
    }

    // Update order status
    await db.ammOrder.update({
      where: { id: input.orderId },
      data: {
        status: 'CANCELLED',
      },
    });

    // Release exposed liquidity back to available
    await db.vaultAllocation.update({
      where: { marketId: order.marketId },
      data: {
        currentExposure: { decrement: order.size },
      },
    });

    await db.vaultState.update({
      where: { id: 'singleton' },
      data: {
        exposedLiquidity: { decrement: order.size },
        availableLiquidity: { increment: order.size },
      },
    });

    console.log(`[AMM] Order cancelled: ${order.id} - ${order.size} USDC released`);

    return {
      success: true,
      message: 'Order cancelled and liquidity released',
    };
  });
