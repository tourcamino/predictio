import { getApiBaseUrl } from "~/lib/predictioApi";

/**
 * When the SPA origin differs from `VITE_API_URL` / API base (e.g. predictio.live vs api.predictio.live),
 * wallet sync, points, and paper buys are routed to Express `/api/web/*` instead of same-origin Vercel `/trpc`.
 * Express uses a long-lived Node process + Postgres — avoids Vercel `FUNCTION_INVOCATION_FAILED` for these paths.
 */
export function shouldUseExpressForWalletCritical(): boolean {
  if (typeof window === "undefined") return false;
  const api = getApiBaseUrl().replace(/\/$/, "");
  const origin = window.location.origin.replace(/\/$/, "");
  return api !== origin;
}

export function expressPointsQueryKey(walletAddress: string) {
  return ["expressPointsSummary", walletAddress.toLowerCase()] as const;
}

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
  const res = await fetch(`${base}/api/web/sync-user`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
    credentials: "omit",
  });
  const data = await readJson(res);
  if (!res.ok) {
    throw new Error(errMessage(data, res.statusText || "Wallet sync failed"));
  }
  return data as any;
}

export async function expressGetPointsSummary(walletAddress: string) {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const u = new URL(`${base}/api/web/points-summary`);
  u.searchParams.set("walletAddress", walletAddress);
  const res = await fetch(u.toString(), { credentials: "omit" });
  const data = await readJson(res);
  if (!res.ok) {
    throw new Error(errMessage(data, res.statusText || "Failed to load points"));
  }
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
  const res = await fetch(`${base}/api/web/place-prediction`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
    credentials: "omit",
  });
  const data = await readJson(res);
  if (!res.ok) {
    throw new Error(errMessage(data, res.statusText || "Trade failed"));
  }
  return data as any;
}
