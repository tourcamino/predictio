import {
  expressStartCopyTrading,
  expressStopCopyTrading,
  shouldUseExpressForWalletCritical,
} from "~/lib/expressCriticalWalletApi";

export async function executeStartCopyTradingWithExpress<R = unknown>(
  trpcMutate: (input: {
    copierWallet: string;
    analystWallet: string;
    maxPerTradeUsd: number;
    copyMode: "all" | "selective";
    selectedMarkets: string[];
  }) => Promise<R>,
  input: Parameters<typeof trpcMutate>[0],
): Promise<R> {
  if (shouldUseExpressForWalletCritical()) {
    return (await expressStartCopyTrading(input)) as R;
  }
  return trpcMutate(input);
}

export async function executeStopCopyTradingWithExpress<R = unknown>(
  trpcMutate: (input: { copierWallet: string; analystWallet: string }) => Promise<R>,
  input: Parameters<typeof trpcMutate>[0],
): Promise<R> {
  if (shouldUseExpressForWalletCritical()) {
    return (await expressStopCopyTrading(input)) as R;
  }
  return trpcMutate(input);
}
