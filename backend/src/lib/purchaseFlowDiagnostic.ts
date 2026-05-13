import { randomUUID } from "crypto";

const DEBUG_SESSION = "2b3037";
const INGEST =
  "http://127.0.0.1:7720/ingest/e1b72358-3d3c-4f35-83e8-fdbd7cfc4db4";

export type PurchaseFlowDiagnosticPayload = {
  timestamp: number;
  requestId: string;
  userId: string | null;
  location: string;
  phase: string;
  payloadReceived?: unknown;
  apiResponse?: unknown;
  errorMessage?: string;
  errorStack?: string;
  /** DB layer — no secrets */
  dbWrite?: { model: string; summary: unknown };
};

function errStack(e: unknown): { message?: string; stack?: string } {
  if (e instanceof Error) {
    return { message: e.message, stack: e.stack };
  }
  return { message: String(e) };
}

/** Fire-and-forget NDJSON diagnostic (Express / Node). */
export function logPurchaseFlowExpress(entry: Omit<PurchaseFlowDiagnosticPayload, "timestamp"> & { timestamp?: number }): void {
  const line: PurchaseFlowDiagnosticPayload = {
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
  const body = JSON.stringify({ sessionId: DEBUG_SESSION, ...line });
  fetch(INGEST, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": DEBUG_SESSION,
    },
    body,
  }).catch(() => {});
}

export function newPurchaseRequestId(): string {
  return randomUUID();
}
