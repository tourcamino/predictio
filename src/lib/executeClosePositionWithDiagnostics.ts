import {
  expressClosePosition,
  shouldUseExpressForWalletCritical,
} from "~/lib/expressCriticalWalletApi";

export type ClosePositionInput = {
  orderId: string;
  walletAddress: string;
  sharesToSell: number;
  currentPrice: number;
};

export async function executeClosePositionWithDiagnostics<R = unknown>(
  trpcMutate: (input: ClosePositionInput) => Promise<R>,
  input: ClosePositionInput,
): Promise<R> {
  if (shouldUseExpressForWalletCritical()) {
    return (await expressClosePosition(input)) as R;
  }
  return trpcMutate(input);
}
