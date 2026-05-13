import { TRPCClientError } from "@trpc/client";

import { ExpressPaperApiError } from "~/lib/expressCriticalWalletApi";

/**
 * Errors that often clear on retry (Vercel cold start, DB pool, transient 5xx).
 * Used by WalletSync so we do not toast immediately on first flaky response.
 */
export function isTransientSyncError(error: unknown): boolean {
  if (error instanceof TRPCClientError) {
    const data = error.data as
      | { code?: string; httpStatus?: number }
      | undefined;
    const code = data?.code;
    if (
      code === "INTERNAL_SERVER_ERROR" ||
      code === "TIMEOUT" ||
      code === "SERVICE_UNAVAILABLE" ||
      code === "CLIENT_CLOSED_REQUEST"
    ) {
      return true;
    }
    const http = data?.httpStatus;
    if (typeof http === "number" && http >= 500) return true;
  }
  const msg = (
    error instanceof Error ? error.message : String(error)
  ).toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("fetch failed") ||
    msg.includes("network") ||
    msg.includes("load failed") ||
    msg.includes("non-json") ||
    msg.includes("can't reach database") ||
    msg.includes("reach database") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("socket") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("504") ||
    msg.includes("timeout") ||
    /** Vercel / edge when the isolate crashes or platform fails the invocation */
    msg.includes("function_invocation_failed") ||
    msg.includes("invocation failed") ||
    msg.includes("bad gateway") ||
    msg.includes("service unavailable") ||
    /** Prisma / Postgres transient */
    msg.includes("p1001") ||
    msg.includes("p1017") ||
    msg.includes("server has closed the connection") ||
    msg.includes("too many connections") ||
    msg.includes("maxclientsinsessionmode")
  );
}

/**
 * Short text for toasts — avoid dumping raw Vercel diagnostic IDs on users.
 */
export function userFacingSyncFailureDetail(error: unknown): string {
  let raw = "";
  if (error instanceof TRPCClientError) {
    raw = error.message?.trim() ?? "";
  } else if (error instanceof Error) {
    raw = error.message.trim();
  }
  if (!raw) return "";

  const lower = raw.toLowerCase();
  if (lower.includes("function_invocation_failed")) {
    return " A temporary server error occurred (hosting). Retrying usually works.";
  }
  if (lower.includes("database_url is not configured")) {
    return " Server database URL is missing — contact support.";
  }
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return " Network error while contacting the server.";
  }
  if (
    lower.includes("p1001") ||
    lower.includes("p1017") ||
    lower.includes("can't reach database")
  ) {
    return " Database temporarily unreachable.";
  }

  if (error instanceof ExpressPaperApiError && error.status === 404) {
    return " The paper API is not deployed on this host (HTTP 404). Redeploy api.predictio.live with the latest backend, or retry in a moment.";
  }

  const max = 180;
  return raw.length > max ? ` ${raw.slice(0, max)}…` : ` ${raw}`;
}
