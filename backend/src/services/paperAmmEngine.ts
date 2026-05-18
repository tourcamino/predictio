/**
 * Oracle-anchored constant-product AMM for paper trading.
 * Prices move only from real fills + soft oracle re-anchor (no RNG).
 * SC-aligned: virtual reserves map to future on-chain pool shares.
 */

export type PaperAmmSide = "YES" | "NO" | "DRAW";

export type PaperAmmState = {
  yesReserve: number;
  noReserve: number;
  drawReserve: number | null;
  poolLiquidityUsd: number;
  oracleYes: number;
  oracleNo: number;
  oracleDraw: number | null;
  flowYesUsd: number;
  flowNoUsd: number;
  flowDrawUsd: number;
  lastTradeAt: number | null;
  lastOracleSyncAt: number | null;
};

export type PaperAmmSpot = {
  yesPrice: number;
  noPrice: number;
  drawPrice: number | null;
  spreadPct: number;
  imbalancePct: number;
  utilizationPct: number;
};

export type PaperAmmFill = {
  shares: number;
  avgPrice: number;
  priceImpact: number;
  newState: PaperAmmState;
  postSpot: PaperAmmSpot;
};

export const PAPER_AMM_OUTCOMES_VERSION = 1;
export const DEFAULT_PAPER_POOL_USDC = 12_000;

const MIN_RESERVE = 50;
const MIN_PRICE = 0.01;
const MAX_PRICE = 0.99;
const ORACLE_REANCHOR_ALPHA = 0.03;
const ORACLE_REANCHOR_MIN_MS = 45_000;
const TRADE_COOLDOWN_MS = 30_000;

export function clampPrice(p: number): number {
  if (!Number.isFinite(p)) return 0.5;
  return Math.max(MIN_PRICE, Math.min(MAX_PRICE, p));
}

export function normalizeBinaryOracle(yesRaw: number, noRaw?: number): {
  yes: number;
  no: number;
} {
  let yes = Number(yesRaw);
  let no = noRaw != null ? Number(noRaw) : NaN;
  if (!Number.isFinite(yes)) yes = 0.5;
  if (!Number.isFinite(no)) no = Math.max(MIN_PRICE, 1 - yes);
  const sum = yes + no;
  if (sum > 0 && Math.abs(sum - 1) > 0.02) {
    yes /= sum;
    no /= sum;
  }
  return { yes: clampPrice(yes), no: clampPrice(no) };
}

export function initReservesFromOracle(
  oracleYes: number,
  oracleNo: number,
  poolLiquidityUsd: number,
  oracleDraw?: number | null,
): Pick<PaperAmmState, "yesReserve" | "noReserve" | "drawReserve"> {
  const { yes, no } = normalizeBinaryOracle(oracleYes, oracleNo);
  const L = Math.max(MIN_RESERVE * 2, poolLiquidityUsd);
  const yesReserve = L * no;
  const noReserve = L * yes;
  let drawReserve: number | null = null;
  if (oracleDraw != null && oracleDraw > 0) {
    const d = clampPrice(oracleDraw);
    drawReserve = Math.max(MIN_RESERVE, L * d);
  }
  return { yesReserve, noReserve, drawReserve };
}

export function initAmmState(
  oracleYes: number,
  oracleNo: number,
  poolLiquidityUsd: number,
  oracleDraw?: number | null,
): PaperAmmState {
  const reserves = initReservesFromOracle(oracleYes, oracleNo, poolLiquidityUsd, oracleDraw);
  const now = Date.now();
  return {
    ...reserves,
    poolLiquidityUsd: Math.max(MIN_RESERVE * 2, poolLiquidityUsd),
    oracleYes: clampPrice(oracleYes),
    oracleNo: clampPrice(oracleNo),
    oracleDraw: oracleDraw != null ? clampPrice(oracleDraw) : null,
    flowYesUsd: 0,
    flowNoUsd: 0,
    flowDrawUsd: 0,
    lastTradeAt: null,
    lastOracleSyncAt: now,
  };
}

/** Spot YES probability from virtual reserves (CPMM mid). */
export function spotFromReserves(
  yesReserve: number,
  noReserve: number,
): { yesPrice: number; noPrice: number } {
  const y = Math.max(MIN_RESERVE, yesReserve);
  const n = Math.max(MIN_RESERVE, noReserve);
  const total = y + n;
  const yesPrice = clampPrice(n / total);
  const noPrice = clampPrice(y / total);
  return { yesPrice, noPrice };
}

export function computeSpreadPct(
  imbalancePct: number,
  utilizationPct: number,
  hoursToKickoff?: number,
): number {
  const base = 0.8;
  const imb = Math.min(8, Math.abs(imbalancePct) * 0.04);
  const util = Math.min(6, utilizationPct * 0.08);
  const time =
    hoursToKickoff != null && hoursToKickoff >= 0 && hoursToKickoff <= 2 ? 1.2 : 0;
  return Math.round((base + imb + util + time) * 100) / 100;
}

export function computeSpot(state: PaperAmmState, openInterestUsd = 0): PaperAmmSpot {
  const { yesPrice, noPrice } = spotFromReserves(state.yesReserve, state.noReserve);
  const totalFlow = state.flowYesUsd + state.flowNoUsd + state.flowDrawUsd;
  const imbalancePct =
    totalFlow > 0
      ? Math.round(((state.flowYesUsd - state.flowNoUsd) / totalFlow) * 10000) / 100
      : 0;
  const utilizationPct =
    state.poolLiquidityUsd > 0
      ? Math.round((openInterestUsd / state.poolLiquidityUsd) * 10000) / 100
      : 0;
  let drawPrice: number | null = null;
  if (state.drawReserve != null && state.oracleDraw != null) {
    const drawFlowBias = state.flowDrawUsd - totalFlow / 3;
    const pressure = (0.18 * drawFlowBias) / Math.max(state.poolLiquidityUsd, 1);
    drawPrice = clampPrice(state.oracleDraw + pressure);
  }
  return {
    yesPrice,
    noPrice,
    drawPrice,
    spreadPct: computeSpreadPct(imbalancePct, utilizationPct),
    imbalancePct,
    utilizationPct,
  };
}

function buyBinarySide(
  state: PaperAmmState,
  side: "YES" | "NO",
  amountUsd: number,
): { shares: number; avgPrice: number; newYesR: number; newNoR: number } {
  const amount = Math.max(0.01, amountUsd);
  let yesR = Math.max(MIN_RESERVE, state.yesReserve);
  let noR = Math.max(MIN_RESERVE, state.noReserve);
  const k = yesR * noR;
  const preSpot = spotFromReserves(yesR, noR);
  const preMid = side === "YES" ? preSpot.yesPrice : preSpot.noPrice;

  if (side === "YES") {
    const newNoR = noR + amount;
    const newYesR = k / newNoR;
    const shares = yesR - newYesR;
    if (!Number.isFinite(shares) || shares <= 1e-9) {
      throw new Error("Insufficient pool liquidity for YES fill");
    }
    const avgPrice = amount / shares;
    return { shares, avgPrice, newYesR, newNoR };
  }

  const newYesR = yesR + amount;
  const newNoR = k / newYesR;
  const shares = noR - newNoR;
  if (!Number.isFinite(shares) || shares <= 1e-9) {
    throw new Error("Insufficient pool liquidity for NO fill");
  }
  const avgPrice = amount / shares;
  return { shares, avgPrice, newYesR, newNoR };
}

export function previewBuyFill(
  state: PaperAmmState,
  side: PaperAmmSide,
  amountUsd: number,
  openInterestUsd = 0,
): PaperAmmFill {
  const preSpot = computeSpot(state, openInterestUsd);
  const preMid =
    side === "YES"
      ? preSpot.yesPrice
      : side === "NO"
        ? preSpot.noPrice
        : preSpot.drawPrice ?? 0.33;

  if (side === "DRAW") {
    if (preSpot.drawPrice == null) throw new Error("Draw not available");
    const impact = amountUsd / (state.poolLiquidityUsd + amountUsd);
    const avgPrice = clampPrice(preMid * (1 + impact * 0.85));
    const shares = amountUsd / avgPrice;
    const newState: PaperAmmState = {
      ...state,
      flowDrawUsd: state.flowDrawUsd + amountUsd,
      lastTradeAt: Date.now(),
      drawReserve: Math.max(
        MIN_RESERVE,
        (state.drawReserve ?? state.poolLiquidityUsd * 0.25) - shares * 0.15,
      ),
    };
    return {
      shares,
      avgPrice,
      priceImpact: (avgPrice - preMid) / Math.max(preMid, 0.01),
      newState,
      postSpot: computeSpot(newState, openInterestUsd + amountUsd),
    };
  }

  const { shares, avgPrice, newYesR, newNoR } = buyBinarySide(state, side, amountUsd);
  const newState: PaperAmmState = {
    ...state,
    yesReserve: newYesR,
    noReserve: newNoR,
    flowYesUsd: state.flowYesUsd + (side === "YES" ? amountUsd : 0),
    flowNoUsd: state.flowNoUsd + (side === "NO" ? amountUsd : 0),
    lastTradeAt: Date.now(),
  };
  const priceImpact = (avgPrice - preMid) / Math.max(preMid, 0.01);

  return {
    shares,
    avgPrice: clampPrice(avgPrice),
    priceImpact,
    newState,
    postSpot: computeSpot(newState, openInterestUsd + amountUsd),
  };
}

export function softReanchorToOracle(
  state: PaperAmmState,
  oracleYes: number,
  oracleNo: number,
  oracleDraw?: number | null,
  nowMs = Date.now(),
): PaperAmmState {
  const sinceTrade = state.lastTradeAt != null ? nowMs - state.lastTradeAt : Infinity;
  const sinceSync =
    state.lastOracleSyncAt != null ? nowMs - state.lastOracleSyncAt : Infinity;
  if (sinceTrade < TRADE_COOLDOWN_MS || sinceSync < ORACLE_REANCHOR_MIN_MS) {
    return {
      ...state,
      oracleYes: clampPrice(oracleYes),
      oracleNo: clampPrice(oracleNo),
      oracleDraw: oracleDraw != null ? clampPrice(oracleDraw) : null,
    };
  }

  const target = initReservesFromOracle(
    oracleYes,
    oracleNo,
    state.poolLiquidityUsd,
    oracleDraw,
  );
  const alpha = ORACLE_REANCHOR_ALPHA;
  return {
    ...state,
    yesReserve: state.yesReserve + alpha * (target.yesReserve - state.yesReserve),
    noReserve: state.noReserve + alpha * (target.noReserve - state.noReserve),
    drawReserve:
      target.drawReserve != null && state.drawReserve != null
        ? state.drawReserve + alpha * (target.drawReserve - state.drawReserve)
        : target.drawReserve,
    oracleYes: clampPrice(oracleYes),
    oracleNo: clampPrice(oracleNo),
    oracleDraw: oracleDraw != null ? clampPrice(oracleDraw) : null,
    lastOracleSyncAt: nowMs,
  };
}

/** v1 JSON stored in Market.outcomes */
export type PaperAmmOutcomesJson = {
  v: typeof PAPER_AMM_OUTCOMES_VERSION;
  yes: { price: number; reserve: number };
  no: { price: number; reserve: number };
  draw?: { price: number; reserve: number };
  amm: {
    poolLiquidityUsd: number;
    oracleYes: number;
    oracleNo: number;
    oracleDraw?: number;
    flowYesUsd: number;
    flowNoUsd: number;
    flowDrawUsd: number;
    lastTradeAt?: string;
    lastOracleSyncAt?: string;
  };
};

export function isPaperAmmOutcomes(outcomes: unknown): outcomes is PaperAmmOutcomesJson {
  return (
    outcomes != null &&
    typeof outcomes === "object" &&
    !Array.isArray(outcomes) &&
    (outcomes as PaperAmmOutcomesJson).v === PAPER_AMM_OUTCOMES_VERSION &&
    (outcomes as PaperAmmOutcomesJson).amm != null
  );
}

export function parseAmmStateFromOutcomes(
  outcomes: unknown,
  fallbackOracle: { yes: number; no: number; draw?: number | null },
  poolLiquidityUsd: number,
): PaperAmmState | null {
  if (!isPaperAmmOutcomes(outcomes)) return null;
  const a = outcomes.amm;
  return {
    yesReserve: outcomes.yes.reserve,
    noReserve: outcomes.no.reserve,
    drawReserve: outcomes.draw?.reserve ?? null,
    poolLiquidityUsd: a.poolLiquidityUsd || poolLiquidityUsd,
    oracleYes: a.oracleYes,
    oracleNo: a.oracleNo,
    oracleDraw: a.oracleDraw ?? null,
    flowYesUsd: a.flowYesUsd ?? 0,
    flowNoUsd: a.flowNoUsd ?? 0,
    flowDrawUsd: a.flowDrawUsd ?? 0,
    lastTradeAt: a.lastTradeAt ? Date.parse(a.lastTradeAt) : null,
    lastOracleSyncAt: a.lastOracleSyncAt ? Date.parse(a.lastOracleSyncAt) : null,
  };
}

export function serializeAmmOutcomes(
  state: PaperAmmState,
  spot: PaperAmmSpot,
): PaperAmmOutcomesJson {
  const payload: PaperAmmOutcomesJson = {
    v: PAPER_AMM_OUTCOMES_VERSION,
    yes: { price: spot.yesPrice, reserve: state.yesReserve },
    no: { price: spot.noPrice, reserve: state.noReserve },
    amm: {
      poolLiquidityUsd: state.poolLiquidityUsd,
      oracleYes: state.oracleYes,
      oracleNo: state.oracleNo,
      flowYesUsd: state.flowYesUsd,
      flowNoUsd: state.flowNoUsd,
      flowDrawUsd: state.flowDrawUsd,
      lastTradeAt: state.lastTradeAt ? new Date(state.lastTradeAt).toISOString() : undefined,
      lastOracleSyncAt: state.lastOracleSyncAt
        ? new Date(state.lastOracleSyncAt).toISOString()
        : undefined,
    },
  };
  if (spot.drawPrice != null && state.drawReserve != null) {
    payload.draw = { price: spot.drawPrice, reserve: state.drawReserve };
    payload.amm.oracleDraw = state.oracleDraw ?? spot.drawPrice;
  }
  return payload;
}

export function mergeOracleIntoExistingOutcomes(
  existing: unknown,
  oracleYes: number,
  oracleNo: number,
  poolLiquidityUsd: number,
  oracleDraw?: number | null,
): PaperAmmOutcomesJson {
  const fallback = {
    yes: oracleYes,
    no: oracleNo,
    draw: oracleDraw,
  };
  let state =
    parseAmmStateFromOutcomes(existing, fallback, poolLiquidityUsd) ??
    initAmmState(oracleYes, oracleNo, poolLiquidityUsd, oracleDraw);
  state = softReanchorToOracle(state, oracleYes, oracleNo, oracleDraw);
  const spot = computeSpot(state);
  return serializeAmmOutcomes(state, spot);
}

export function pricesFromOutcomes(
  outcomes: unknown,
  fallbackOracle: { yes: number; no: number; draw?: number | null },
  poolLiquidityUsd = DEFAULT_PAPER_POOL_USDC,
): { yesPrice: number; noPrice: number; drawPrice: number | null; ammState: PaperAmmState | null } {
  const parsed = parseAmmStateFromOutcomes(outcomes, fallbackOracle, poolLiquidityUsd);
  if (parsed) {
    const spot = computeSpot(parsed);
    return {
      yesPrice: spot.yesPrice,
      noPrice: spot.noPrice,
      drawPrice: spot.drawPrice,
      ammState: parsed,
    };
  }
  if (isPaperAmmOutcomes(outcomes)) {
    return {
      yesPrice: outcomes.yes.price,
      noPrice: outcomes.no.price,
      drawPrice: outcomes.draw?.price ?? null,
      ammState: null,
    };
  }
  const { yes, no } = normalizeBinaryOracle(fallbackOracle.yes, fallbackOracle.no);
  return {
    yesPrice: yes,
    noPrice: no,
    drawPrice: fallbackOracle.draw ?? null,
    ammState: null,
  };
}
