import { getApiBaseUrl } from "~/lib/predictioApi";

/**
 * When the SPA origin differs from `VITE_API_URL` / API base (e.g. predictio.live vs api.predictio.live),
 * wallet sync, points, and paper buys hit Express under `/api/v1/web/*` (and legacy `/api/web/*`)
 * instead of same-origin Vercel `/trpc` — avoids `FUNCTION_INVOCATION_FAILED` on cold serverless + DB.
 */
export function shouldUseExpressForWalletCritical(): boolean {
  if (typeof window === "undefined") return false;
  const api = getApiBaseUrl().replace(/\/$/, "");
  const origin = window.location.origin.replace(/\/$/, "");
  return api !== origin;
}

/** Thrown when the Express paper API responds with a non-2xx status (includes HTTP status). */
export class ExpressPaperApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ExpressPaperApiError";
    this.status = status;
  }
}

/**
 * If the VPS is still on an older build without `/api/v1/web`, Express returns 404 "Not found".
 * Fall back to same-origin tRPC so the app still works (may be flaky on Vercel until the API is redeployed).
 */
export async function walletCriticalExpressOr404Fallback<T>(
  expressCall: () => Promise<T>,
  trpcCall: () => Promise<T>,
): Promise<T> {
  try {
    return await expressCall();
  } catch (e) {
    if (e instanceof ExpressPaperApiError && e.status === 404) {
      return trpcCall();
    }
    throw e;
  }
}

export function expressPointsQueryKey(walletAddress: string) {
  return ["expressPointsSummary", walletAddress.toLowerCase()] as const;
}

const PAPER_WEB_PREFIX = "/api/v1/web";

const JSON_HEADERS = { "Content-Type": "application/json" };

async function readJson(res: Response) {
  const t = await res.text();
  if (!t) return null;
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return { raw: t };
  }
}

function errMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const e = data as { error?: { message?: string }; message?: string };
    if (e.error?.message) return e.error.message;
    if (e.message) return String(e.message);
  }
  return fallback;
}

function assertOk(res: Response, data: unknown, fallback: string) {
  if (res.ok) return;
  const msg = errMessage(data, res.statusText || fallback);
  throw new ExpressPaperApiError(msg, res.status);
}

export async function expressSyncUserAccount(input: {
  walletAddress: string;
  referralCode?: string;
}): Promise<{
  isNewUser: boolean;
  virtualBalance: number;
  totalPnl: number;
  tradesCount: number;
  onboardingCompleted: boolean;
}> {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const res = await fetch(`${base}${PAPER_WEB_PREFIX}/sync-user`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
    credentials: "omit",
  });
  const data = await readJson(res);
  assertOk(res, data, "Wallet sync failed");
  return data as any;
}

export async function expressGetPointsSummary(walletAddress: string) {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const u = new URL(`${base}${PAPER_WEB_PREFIX}/points-summary`);
  u.searchParams.set("walletAddress", walletAddress);
  const res = await fetch(u.toString(), { credentials: "omit" });
  const data = await readJson(res);
  assertOk(res, data, "Failed to load points");
  return data as any;
}

export async function expressPlacePrediction(input: {
  marketId: string;
  outcome: string;
  amount: number;
  walletAddress: string;
  orderType?: "MARKET" | "LIMIT";
  limitPrice?: number;
}) {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const res = await fetch(`${base}${PAPER_WEB_PREFIX}/place-prediction`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
    credentials: "omit",
  });
  const data = await readJson(res);
  assertOk(res, data, "Trade failed");
  return data as any;
}
