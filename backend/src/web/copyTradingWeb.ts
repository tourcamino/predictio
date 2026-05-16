import type { PrismaClient } from "@prisma/client";
import { ApiError } from "../middleware/errors";

export async function runGetCopyRelationshipWeb(
  prisma: PrismaClient,
  copierWallet: string,
  analystWallet: string,
) {
  const copier = copierWallet.trim().toLowerCase();
  const analyst = analystWallet.trim().toLowerCase();
  const relationship = await prisma.copyRelationship.findUnique({
    where: { copierWallet_analystWallet: { copierWallet: copier, analystWallet: analyst } },
  });
  return {
    relationship: relationship && relationship.isActive ? relationship : null,
    runtime: "express-vps" as const,
  };
}

export async function runStartCopyTradingWeb(
  prisma: PrismaClient,
  input: {
    copierWallet: string;
    analystWallet: string;
    maxPerTradeUsd: number;
    copyMode: "all" | "selective";
    selectedMarkets: string[];
  },
) {
  const copierWallet = input.copierWallet.trim().toLowerCase();
  const analystWallet = input.analystWallet.trim().toLowerCase();

  const analyst = await prisma.analyst.findUnique({ where: { wallet: analystWallet } });
  if (!analyst) {
    throw new ApiError("Analyst not found", { status: 404, code: "NOT_FOUND" });
  }

  const copier = await prisma.user.findUnique({ where: { wallet: copierWallet } });
  if (!copier) {
    throw new ApiError("User not found", { status: 404, code: "NOT_FOUND" });
  }
  if (copier.virtualBalance < input.maxPerTradeUsd) {
    throw new ApiError("Insufficient balance for copy trading", {
      status: 400,
      code: "BAD_REQUEST",
    });
  }

  const existing = await prisma.copyRelationship.findUnique({
    where: { copierWallet_analystWallet: { copierWallet, analystWallet } },
  });

  if (existing) {
    const updated = await prisma.copyRelationship.update({
      where: { id: existing.id },
      data: {
        maxPerTradeUsd: input.maxPerTradeUsd,
        copyMode: input.copyMode,
        selectedMarkets: input.selectedMarkets,
        isActive: true,
        endedAt: null,
      },
    });
    return { success: true, message: "Copy trading settings updated", relationship: updated };
  }

  const relationship = await prisma.copyRelationship.create({
    data: {
      copierWallet,
      analystWallet,
      maxPerTradeUsd: input.maxPerTradeUsd,
      copyMode: input.copyMode,
      selectedMarkets: input.selectedMarkets,
      isActive: true,
      totalVolumeCopied: 0,
    },
  });

  await prisma.notification
    .create({
      data: {
        walletAddress: analystWallet,
        type: "NEW_COPIER",
        title: "New Copier",
        message: `Someone started copying your trades with $${input.maxPerTradeUsd} per trade`,
      },
    })
    .catch(() => null);

  return { success: true, message: "Copy trading started successfully", relationship };
}

export async function runStopCopyTradingWeb(
  prisma: PrismaClient,
  copierWallet: string,
  analystWallet: string,
) {
  const copier = copierWallet.trim().toLowerCase();
  const analyst = analystWallet.trim().toLowerCase();
  const relationship = await prisma.copyRelationship.findUnique({
    where: { copierWallet_analystWallet: { copierWallet: copier, analystWallet: analyst } },
  });
  if (!relationship) {
    throw new ApiError("Copy trading relationship not found", {
      status: 404,
      code: "NOT_FOUND",
    });
  }
  const updated = await prisma.copyRelationship.update({
    where: { id: relationship.id },
    data: { isActive: false, endedAt: new Date() },
  });
  return { success: true, message: "Copy trading stopped successfully", relationship: updated };
}
