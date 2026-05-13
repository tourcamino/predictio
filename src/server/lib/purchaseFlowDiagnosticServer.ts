import { randomUUID } from "crypto";

const DEBUG_SESSION = "2b3037";
const INGEST =
  "http://127.0.0.1:7720/ingest/e1b72358-3d3c-4f35-83e8-fdbd7cfc4db4";

export type PurchaseFlowServerPayload = {
  timestamp: number;
  requestId: string;
  userId: string | null;
  location: string;
  phase: string;
  payloadReceived?: unknown;
  apiResponse?: unknown;
  errorMessage?: string;
  errorStack?: string;
  dbWrite?: { model: string; summary: unknown };
};

function stackOf(e: unknown): { message?: string; stack?: string } {
  if (e instanceof Error) {
    return { message: e.message, stack: e.stack };
  }
  return { message: String(e) };
}

export function newTrpcPurchaseRequestId(): string {
  return randomUUID();
}

export function logPurchaseFlowServer(
  entry: Omit<PurchaseFlowServerPayload, "timestamp"> & { timestamp?: number },
): void {
  const line: PurchaseFlowServerPayload = {
    timestamp: entry.timestamp ?? Date.now(),
    requestId: entry.requestId,
    userId: entry.userId,
    location: entry.location,
    phase: entry.phase,
    payloadReceived: entry.payloadReceived,
    apiResponse: entry.apiResponse,
    errorMessage: entry.errorMessage,
    errorStack: entry.errorStack,
    dbWrite: entry.dbWrite,
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

export function logPurchaseFlowServerError(
  base: Pick<PurchaseFlowServerPayload, "requestId" | "userId" | "location">,
  phase: string,
  err: unknown,
  extras?: { payloadReceived?: unknown },
): void {
  const { message, stack } = stackOf(err);
  logPurchaseFlowServer({
    ...base,
    phase,
    payloadReceived: extras?.payloadReceived,
    errorMessage: message,
    errorStack: stack,
  });
}
