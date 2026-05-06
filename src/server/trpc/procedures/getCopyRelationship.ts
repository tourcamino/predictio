import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getCopyRelationship = baseProcedure
  .input(
    z.object({
      copierWallet: z.string(),
      analystWallet: z.string(),
    })
  )
  .query(async ({ input }) => {
    if (!input.copierWallet || !input.analystWallet) {
      return { relationship: null };
    }

    const copierWallet = input.copierWallet.toLowerCase();
    const analystWallet = input.analystWallet.toLowerCase();
    
    const relationship = await db.copyRelationship.findUnique({
      where: {
        copierWallet_analystWallet: {
          copierWallet,
          analystWallet,
        },
      },
    });
    
    return {
      relationship: relationship && relationship.isActive ? relationship : null,
    };
  });
