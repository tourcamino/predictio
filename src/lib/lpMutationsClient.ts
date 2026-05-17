import {
  expressProvideLiquidity,
  expressWithdrawLiquidity,
  shouldUseExpressForWalletCritical,
} from "~/lib/expressCriticalWalletApi";
import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "~/server/trpc/root";

/** Production: LP writes on Express VPS (same DB as reads). Dev same-origin: tRPC. */
export async function provideLiquidityClient(
  trpcClient: TRPCClient<AppRouter>,
  input: {
    marketId: string;
    amount: number;
    walletAddress: string;
    currentBalance: number;
  },
) {
  if (shouldUseExpressForWalletCritical()) {
    return expressProvideLiquidity({
      marketId: input.marketId,
      amount: input.amount,
      walletAddress: input.walletAddress,
    });
  }
  return trpcClient.provideLiquidity.mutate(input);
}

export async function withdrawLiquidityClient(
  trpcClient: TRPCClient<AppRouter>,
  input: {
    positionId: string;
    amount: number;
    claimFees: boolean;
    walletAddress: string;
  },
) {
  if (shouldUseExpressForWalletCritical()) {
    return expressWithdrawLiquidity(input);
  }
  return trpcClient.withdrawLiquidity.mutate(input);
}
