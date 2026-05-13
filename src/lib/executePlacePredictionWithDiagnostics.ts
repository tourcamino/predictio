import {
  expressPlacePrediction,
  shouldUseExpressForWalletCritical,
} from "~/lib/expressCriticalWalletApi";
import {
  logPurchaseFlowClient,
  logPurchaseFlowClientError,
  newClientPurchaseRequestId,
} from "~/lib/purchaseFlowDiagnosticClient";

export type PlacePredictionInput = {
  marketId: string;
  outcome: string;
  amount: number;
  walletAddress: string;
  orderType?: "MARKET" | "LIMIT";
  limitPrice?: number;
};

/** Single client entry for paper buy — logs request/response/errors (no business logic). */
export async function executePlacePredictionWithDiagnostics<R = unknown>(
  trpcMutate: (input: PlacePredictionInput) => Promise<R>,
  input: PlacePredictionInput,
  options?: { flowCorrelationId?: string | null },
): Promise<R> {
  const requestId = newClientPurchaseRequestId();
  const flowCorrelationId = options?.flowCorrelationId ?? null;
  const userId = input.walletAddress?.trim().toLowerCase() ?? null;
  const location = "executePlacePredictionWithDiagnostics.ts";
  const payloadReceived = {
    marketId: input.marketId,
    outcome: input.outcome,
    amount: input.amount,
    orderType: input.orderType,
    limitPrice: input.limitPrice,
  };

  logPurchaseFlowClient({
    requestId,
    userId,
    location,
    phase: "client.place_prediction.request",
    flowCorrelationId,
    payloadReceived,
  });

  try {
    const useExpress = shouldUseExpressForWalletCritical();
    const apiResponse = useExpress
      ? await expressPlacePrediction(input, requestId)
      : await trpcMutate(input);

    logPurchaseFlowClient({
      requestId,
      userId,
      location,
      phase: "client.place_prediction.response",
      flowCorrelationId,
      payloadReceived,
      apiResponse,
    });
    return apiResponse as R;
  } catch (err) {
    logPurchaseFlowClientError(
      { requestId, userId, location, flowCorrelationId },
      "client.place_prediction.error",
      err,
      { payloadReceived },
    );
    throw err;
  }
}
