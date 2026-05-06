import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const deletePriceAlert = baseProcedure
  .input(
    z.object({
      alertId: z.string(),
      walletAddress: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      // Verify ownership before deleting
      const alert = await db.priceAlert.findUnique({
        where: { id: input.alertId },
      });

      if (!alert) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Price alert not found",
        });
      }

      if (alert.walletAddress !== input.walletAddress.toLowerCase()) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete this alert",
        });
      }

      await db.priceAlert.delete({
        where: { id: input.alertId },
      });

      return {
        success: true,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete price alert",
      });
    }
  });
