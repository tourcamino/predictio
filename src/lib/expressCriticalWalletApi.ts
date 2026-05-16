import { getApiBaseUrl } from "~/lib/predictioApi";
import {
  logPurchaseFlowClient,
  logPurchaseFlowClientError,
  newClientPurchaseRequestId,
} from "~/lib/purchaseFlowDiagnosticClient";

/**
 * When the SPA origin differs from `VITE_API_URL` / API base (e.g. predictio.live vs api.predictio.live),
 * wallet sync, points, and paper buys hit **only** Express on `api.predictio.live` — never same-origin
 * Vercel `/trpc` for these calls (serverless + Prisma there hits `FUNCTION_INVOCATION_FAILED` too often).
 *
 * Tries `/api/v1/web/*` first, then `/api/web/*` so older API builds still work after one extra round-trip.
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

/**
 * POST JSON: try paths in order; on 404 only, try the next path. Any other status throws immediately.
 */
async function paperPostJson<T>(
  paths: readonly string[],
  body: object,
  opts?: {
    headers?: Record<string, string>;
    /** When set, logs each HTTP attempt (status, path) for diagnosis only. */
    diagnostic?: { requestId: string; userId: string | null; location: string };
  },
): Promise<T> {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const bodyStr = JSON.stringify(body);
  let last404: ExpressPaperApiError | null = null;

  for (const path of paths) {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { ...JSON_HEADERS, ...opts?.headers },
      body: bodyStr,
      credentials: "omit",
    });
    const data = await readJson(res);
    if (opts?.diagnostic) {
      const { requestId, userId, location } = opts.diagnostic;
      logPurchaseFlowClient({
        requestId,
        userId,
        location,
        phase: "client.express_paper.http_attempt",
        payloadReceived: { path, httpStatus: res.status, ok: res.ok },
        apiResponse: res.ok ? data : { errorBody: data },
      });
    }
    if (res.ok) return data as T;

    const msg = errMessage(data, res.statusText || "Request failed");
    const err = new ExpressPaperApiError(msg, res.status);
    if (res.status === 404) {
      last404 = err;
      continue;
    }
    throw err;
  }

  throw new ExpressPaperApiError(
    last404
      ? `${last404.message} Tried /api/v1/web and /api/web — redeploy api.predictio.live with the latest backend.`
      : "Paper API not found (404). Redeploy api.predictio.live.",
    404,
  );
}

/** GET: try paths in order; 404 tries next. */
async function paperGetJson<T>(paths: readonly string[]): Promise<T> {
  const base = getApiBaseUrl().replace(/\/$/, "");
  let last404: ExpressPaperApiError | null = null;

  for (const path of paths) {
    const res = await fetch(`${base}${path}`, { credentials: "omit" });
    const data = await readJson(res);
    if (res.ok) return data as T;

    const msg = errMessage(data, res.statusText || "Request failed");
    const err = new ExpressPaperApiError(msg, res.status);
    if (res.status === 404) {
      last404 = err;
      continue;
    }
    throw err;
  }

  throw new ExpressPaperApiError(
    last404
      ? `${last404.message} Tried /api/v1/web and /api/web — redeploy api.predictio.live with the latest backend.`
      : "Paper API not found (404). Redeploy api.predictio.live.",
    404,
  );
}

const SYNC_PATHS = ["/api/v1/web/sync-user", "/api/web/sync-user"] as const;

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
  return paperPostJson<{
    isNewUser: boolean;
    virtualBalance: number;
    totalPnl: number;
    tradesCount: number;
    onboardingCompleted: boolean;
  }>(SYNC_PATHS, input);
}

export type ExpressPointsSummary = {
  totalPoints: number;
  tier?: string;
};

export type ExpressPointsSummaryFull = ExpressPointsSummary & {
  wallet?: string;
  points?: number;
  rank?: number | null;
  globalRank?: number | null;
  streak?: number;
  lastUpdatedAt?: string | null;
  nextTier?: string | null;
  pointsToNextTier?: number;
  recentActivity?: Array<{
    actionType: string;
    points: number;
    metadata: unknown;
    createdAt: Date | string;
  }>;
  earnGuide?: Array<{
    actionType: string;
    label: string;
    pointsLabel: string;
    repeatable: boolean;
    timesEarned: number;
    completed: boolean;
  }>;
};

export type ExpressUserPoints = {
  wallet: string;
  points: number;
  rank: number | null;
  streak: number;
  lastUpdatedAt: string | null;
  tier: string;
  totalPoints: number;
  globalRank: number | null;
};

export async function expressGetPointsSummaryFull(
  walletAddress: string,
): Promise<ExpressPointsSummaryFull> {
  const q = new URLSearchParams({ walletAddress }).toString();
  return paperGetJson<ExpressPointsSummaryFull>([
    `/api/v1/web/points-summary?${q}`,
    `/api/web/points-summary?${q}`,
  ]);
}

/** Header / compact widgets. */
export async function expressGetPointsSummary(
  walletAddress: string,
): Promise<ExpressPointsSummary> {
  const full = await expressGetPointsSummaryFull(walletAddress);
  return { totalPoints: full.totalPoints, tier: full.tier };
}

export async function expressGetUserPoints(
  walletAddress: string,
): Promise<ExpressUserPoints> {
  const q = new URLSearchParams({ walletAddress }).toString();
  return paperGetJson<ExpressUserPoints>([
    `/api/v1/web/user-points?${q}`,
    `/api/web/user-points?${q}`,
  ]);
}

export type ExpressPaperWalletBalance = {
  virtualBalance: number;
  openPositionsCostBasis: number;
};

export type ExpressCanonicalLiquidityState = {
  at: string;
  protocolMode: string;
  allocationMode: string;
  totalSimulatedLiquidity: number;
  totalLiquidity: number;
  canonicalOpenSlots: number;
  liquidityPerMarket: Array<{
    marketId: string;
    marketName: string;
    league: string;
    sport: string;
    appealScore: number;
    allocation: number;
    percentage: number;
  }>;
  diagnostics?: {
    lpGraph?: {
      REGISTRY_OPEN_COUNT?: number;
      LP_CONNECTED_MARKETS?: number;
    };
  };
};

export type ExpressCatalogLiquidityVersion = {
  allocationVersion: string;
  rebalanceTriggeredAt: string;
  source?: string;
};

export async function expressGetCatalogLiquidityVersion(): Promise<ExpressCatalogLiquidityVersion> {
  return paperGetJson<ExpressCatalogLiquidityVersion>([
    "/api/v1/web/catalog-liquidity-version",
    "/api/web/catalog-liquidity-version",
  ]);
}

export async function expressGetCanonicalLiquidityState(): Promise<ExpressCanonicalLiquidityState> {
  return paperGetJson<ExpressCanonicalLiquidityState>([
    "/api/v1/web/canonical-liquidity",
    "/api/web/canonical-liquidity",
  ]);
}

export async function expressGetPaperWalletBalance(
  walletAddress: string,
): Promise<ExpressPaperWalletBalance> {
  const q = new URLSearchParams({ walletAddress }).toString();
  return paperGetJson<ExpressPaperWalletBalance>([
    `/api/v1/web/paper-wallet-balance?${q}`,
    `/api/web/paper-wallet-balance?${q}`,
  ]);
}

const PLACE_PATHS = ["/api/v1/web/place-prediction", "/api/web/place-prediction"] as const;

export type ExpressPlacePredictionResult = {
  success?: boolean;
  predictionId?: string;
  message?: string;
  newBalance?: number;
  fee?: number;
  orderRole?: string;
};

export async function expressPlacePrediction(
  input: {
    marketId: string;
    outcome: string;
    amount: number;
    walletAddress: string;
    orderType?: "MARKET" | "LIMIT";
    limitPrice?: number;
  },
  /** Correlate browser ↔ Express logs via `x-purchase-request-id` */
  requestId?: string,
): Promise<ExpressPlacePredictionResult> {
  const rid = requestId ?? newClientPurchaseRequestId();
  const userId = input.walletAddress?.trim().toLowerCase() ?? null;
  const location = "expressCriticalWalletApi.ts:expressPlacePrediction";
  try {
    return await paperPostJson<ExpressPlacePredictionResult>(PLACE_PATHS, input, {
      headers: { "x-purchase-request-id": rid },
      diagnostic: { requestId: rid, userId, location },
    });
  } catch (e) {
    logPurchaseFlowClientError(
      { requestId: rid, userId, location },
      "client.express_place_prediction.throw",
      e,
      { payloadReceived: input },
    );
    throw e;
  }
}
