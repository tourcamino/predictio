const DEBUG_SESSION = "2b3037";
const INGEST =
  "http://127.0.0.1:7720/ingest/e1b72358-3d3c-4f35-83e8-fdbd7cfc4db4";

export type PurchaseFlowClientPayload = {
  timestamp: number;
  requestId: string;
  userId: string | null;
  location: string;
  phase: string;
  /** Same UI session from first click through modal confirm (TradingBox buy). */
  flowCorrelationId?: string | null;
  payloadReceived?: unknown;
  apiResponse?: unknown;
  errorMessage?: string;
  errorStack?: string;
};

function stackOf(e: unknown): { message?: string; stack?: string } {
  if (e instanceof Error) {
    return { message: e.message, stack: e.stack };
  }
  return { message: String(e) };
}

export function newClientPurchaseRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `rid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Browser-side purchase / paper-trade diagnostics (no tokens). */
export function logPurchaseFlowClient(
  entry: Omit<PurchaseFlowClientPayload, "timestamp"> & { timestamp?: number },
): void {
  if (typeof fetch === "undefined") return;
  const line: PurchaseFlowClientPayload = {
    timestamp: entry.timestamp ?? Date.now(),
    requestId: entry.requestId,
    userId: entry.userId,
    location: entry.location,
    phase: entry.phase,
    flowCorrelationId: entry.flowCorrelationId,
    payloadReceived: entry.payloadReceived,
    apiResponse: entry.apiResponse,
    errorMessage: entry.errorMessage,
    errorStack: entry.errorStack,
  };
  void fetch(INGEST, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": DEBUG_SESSION,
    },
    body: JSON.stringify({ sessionId: DEBUG_SESSION, ...line }),
  }).catch(() => {});
}

export function logPurchaseFlowClientError(
  base: Pick<PurchaseFlowClientPayload, "requestId" | "userId" | "location"> & {
    flowCorrelationId?: string | null;
  },
  phase: string,
  err: unknown,
  extras?: { payloadReceived?: unknown; apiResponse?: unknown },
): void {
  const { message, stack } = stackOf(err);
  logPurchaseFlowClient({
    ...base,
    phase,
    payloadReceived: extras?.payloadReceived,
    apiResponse: extras?.apiResponse,
    errorMessage: message,
    errorStack: stack,
  });
}
