import { TRPCClientError } from "@trpc/client";
import type { AppRouter } from "~/server/trpc/root";

export type MarketDetailLoadIssue = "network" | "not_found" | "server";

/**
 * Maps React Query / tRPC failures to user-facing categories (Italian copy lives in the route).
 */
export function getMarketDetailLoadIssue(error: unknown): MarketDetailLoadIssue {
  if (error instanceof TypeError) {
    const m = error.message || "";
    if (/failed to fetch|network|load failed|aborted|fetch/i.test(m)) {
      return "network";
    }
  }

  const msg =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const lower = msg.toLowerCase();
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("load failed") ||
    lower.includes("aborted") ||
    lower.includes("timeout") ||
    lower.includes("econnrefused")
  ) {
    return "network";
  }

  if (error instanceof TRPCClientError) {
    const trpcErr = error as TRPCClientError<AppRouter>;
    const code = trpcErr.data?.code;
    if (code === "NOT_FOUND") return "not_found";
    const httpStatus = (trpcErr.data as { httpStatus?: number } | undefined)?.httpStatus;
    if (httpStatus === 404) return "not_found";
  }

  if (/not found|non trovat/i.test(msg)) {
    return "not_found";
  }

  return "server";
}
