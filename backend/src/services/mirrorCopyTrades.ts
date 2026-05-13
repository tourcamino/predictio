import type { PrismaClient } from "@prisma/client";
import { calculateFeeSplit, persistFeeSplit, TAKER_FEE_RATE } from "./fees";
import { realtimeBus } from "./realtimeBus";

/** Mirror analyst trade to active copiers (parity with tRPC placePrediction / REST trades). */
export async function mirrorTradeToActiveCopiers(params: {
  prisma: PrismaClient;
  analystWallet: string;
  analystDisplayName: string;
  marketId: string;
  outcome: string;
  avgPrice: number;
}): Promise<string[]> {
  const { prisma, analystWallet, analystDisplayName, marketId, outcome, avgPrice } =
    params;
  const copiers = await prisma.copyRelationship.findMany({
    where: { analystWallet, isActive: true },
  });
  const createdIds: string[] = [];

  for (const rel of copiers) {
    try {
      const copierUser = await prisma.user.findUnique({
        where: { wallet: rel.copierWallet },
      });
      if (!copierUser) continue;

      const copyAmount = Math.min(
        rel.maxPerTradeUsd,
        copierUser.virtualBalance * 0.95,
      );
      if (copyAmount < 1) continue;

      if (
        rel.copyMode === "selective" &&
        !rel.selectedMarkets.includes(marketId)
      ) {
        continue;
      }

      const copyFee = copyAmount * TAKER_FEE_RATE;
      const copyTotalCost = copyAmount + copyFee;
      if (copyTotalCost > copierUser.virtualBalance) continue;

      const shares = copyAmount / avgPrice;

      const copyOrderId = await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { wallet: rel.copierWallet },
          data: {
            virtualBalance: { decrement: copyTotalCost },
            tradesCount: { increment: 1 },
            totalVolume: { increment: copyAmount },
            predictions: { increment: 1 },
            lastActive: new Date(),
          },
        });

        const copyOrder = await tx.order.create({
          data: {
            marketId,
            wallet: rel.copierWallet,
            outcome: outcome.toUpperCase(),
            amount: copyAmount,
            shares,
            avgPrice,
            orderType: "MARKET",
            status: "open",
          },
        });

        await tx.market.update({
          where: { id: marketId },
          data: {
            volume: { increment: copyAmount },
            predictions: { increment: 1 },
          },
        });

        const split = calculateFeeSplit({
          tradeId: copyOrder.id,
          traderWallet: rel.copierWallet,
          volumeUsd: copyAmount,
          analystWallet,
          referralWallet: null,
        });

        await tx.transaction.create({
          data: {
            wallet: rel.copierWallet,
            type: "trade",
            amount: copyAmount,
            marketId,
            orderId: copyOrder.id,
            status: "completed",
            feePaid: split.feeTotalUsd,
            metadata: {
              outcome: outcome.toUpperCase(),
              copiedFromWallet: analystWallet,
              copiedFromName: analystDisplayName,
              feeSplit: {
                vault: split.vaultUsd,
                analyst: split.analystUsd,
                referral: split.referralUsd,
                treasury: split.treasuryUsd,
              },
            },
          },
        });

        await persistFeeSplit({
          prisma: tx,
          input: {
            tradeId: copyOrder.id,
            traderWallet: rel.copierWallet,
            volumeUsd: copyAmount,
            analystWallet,
            referralWallet: null,
          },
          split,
        });

        await tx.copyRelationship.update({
          where: {
            copierWallet_analystWallet: {
              copierWallet: rel.copierWallet,
              analystWallet: rel.analystWallet,
            },
          },
          data: { totalVolumeCopied: { increment: copyAmount } },
        });

        return copyOrder.id;
      });

      createdIds.push(copyOrderId);

      realtimeBus.emitMessage({
        type: "trade",
        marketId,
        data: {
          id: copyOrderId,
          marketId,
          wallet: rel.copierWallet,
          outcome: outcome.toUpperCase(),
          amountUsd: copyAmount,
          copiedFrom: analystWallet,
        },
        timestamp: Date.now(),
      });

      await prisma.notification
        .create({
          data: {
            walletAddress: rel.copierWallet,
            type: "COPY_TRADE_EXECUTED",
            title: "Copy trade executed",
            message: `${analystDisplayName} traded ${outcome.toUpperCase()}. Your copy: $${copyAmount.toFixed(2)}`,
            marketId,
          },
        })
        .catch(() => null);
    } catch (err) {
      console.error(`[COPY TRADING] Failed for copier ${rel.copierWallet}`, err);
    }
  }

  return createdIds;
}
