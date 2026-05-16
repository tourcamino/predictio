/**
 * Canonical deterministic market lifecycle (single authority for trading / settlement / LP guards).
 * DB `Market.status` remains string-backed; this module **derives** `MarketLifecycleState` from row + time.
 *
 * Target Azuro/Polymarket-style flow (persisted phases may be added later):
 * OPEN → LOCKED (kickoff, row still `open`) → RESOLVING (`closed`, oracle wait) → RESOLVED (immutable)
 * Branches: CANCELLED / REFUNDED / DISPUTED / PAUSED
 */

import type { Market as PrismaMarketRow } from "@prisma/client";

export const MarketLifecycleState = {
  OPEN: "OPEN",
  LOCKED: "LOCKED",
  RESOLVING: "RESOLVING",
  RESOLVED: "RESOLVED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
  DISPUTED: "DISPUTED",
  PAUSED: "PAUSED",
} as const;

export type MarketLifecycleState =
  (typeof MarketLifecycleState)[keyof typeof MarketLifecycleState];

/** Minimal UI market shape — avoids importing `~/data/mockMarkets` (keeps graph clean). */
export type UiMarketLifecycleInput = {
  status: string;
  closesAt: Date;
  start_time: Date;
  result?: "yes" | "no" | "draw" | undefined;
};

const TERMINAL: ReadonlySet<MarketLifecycleState> = new Set([
  MarketLifecycleState.RESOLVED,
  MarketLifecycleState.CANCELLED,
  MarketLifecycleState.REFUNDED,
]);

function normDbStatus(s: string): string {
  return s.trim().toLowerCase();
}

function isLifecycleDebugEnabled(): boolean {
  return (
    typeof process !== "undefined" &&
    (process.env.MARKET_LIFECYCLE_DEBUG === "1" ||
      process.env.MARKET_LIFECYCLE_DEBUG === "true")
  );
}

export function logMarketLifecycleDev(
  source: string,
  phase: string,
  payload: Record<string, unknown>,
): void {
  if (!isLifecycleDebugEnabled()) return;
  // eslint-disable-next-line no-console
  console.log(`[market-lifecycle] ${source} · ${phase}`, payload);
}

export function warnInvalidMarketTransitionDev(
  source: string,
  from: MarketLifecycleState,
  to: MarketLifecycleState,
  reason: string,
): void {
  if (!isLifecycleDebugEnabled()) return;
  // eslint-disable-next-line no-console
  console.warn(`[market-lifecycle] INVALID_TRANSITION ${source}: ${from} → ${to} (${reason})`);
}

/**
 * Valid **target** states from a given origin (documentation + future admin/oracle enforcement).
 * RESOLVED / CANCELLED / REFUNDED are absorbing for product flows.
 */
export const VALID_MARKET_TRANSITIONS: Readonly<
  Record<MarketLifecycleState, readonly MarketLifecycleState[]>
> = {
  [MarketLifecycleState.OPEN]: [
    MarketLifecycleState.LOCKED,
    MarketLifecycleState.PAUSED,
    MarketLifecycleState.CANCELLED,
  ],
  [MarketLifecycleState.LOCKED]: [
    MarketLifecycleState.RESOLVING,
    MarketLifecycleState.REFUNDED,
    MarketLifecycleState.PAUSED,
    MarketLifecycleState.CANCELLED,
    MarketLifecycleState.DISPUTED,
  ],
  [MarketLifecycleState.RESOLVING]: [
    MarketLifecycleState.RESOLVED,
    MarketLifecycleState.CANCELLED,
    MarketLifecycleState.REFUNDED,
    MarketLifecycleState.DISPUTED,
    MarketLifecycleState.PAUSED,
  ],
  [MarketLifecycleState.DISPUTED]: [
    MarketLifecycleState.RESOLVED,
    MarketLifecycleState.CANCELLED,
    MarketLifecycleState.REFUNDED,
    MarketLifecycleState.RESOLVING,
  ],
  [MarketLifecycleState.PAUSED]: [
    MarketLifecycleState.OPEN,
    MarketLifecycleState.LOCKED,
    MarketLifecycleState.RESOLVING,
    MarketLifecycleState.CANCELLED,
  ],
  [MarketLifecycleState.RESOLVED]: [],
  [MarketLifecycleState.CANCELLED]: [MarketLifecycleState.REFUNDED],
  [MarketLifecycleState.REFUNDED]: [],
};

export function isValidMarketTransition(
  from: MarketLifecycleState,
  to: MarketLifecycleState,
): boolean {
  if (from === to) return true;
  const allowed = VALID_MARKET_TRANSITIONS[from];
  return allowed?.includes(to) ?? false;
}

export function deriveMarketLifecycleFromDbRow(
  row: Pick<
    PrismaMarketRow,
    | "status"
    | "closesAt"
    | "resolvedAt"
    | "winner"
    | "voidedAt"
    | "refundAmount"
    | "disputeReason"
  >,
  now: Date = new Date(),
): MarketLifecycleState {
  const st = normDbStatus(row.status);

  if (st === "resolved" || (row.resolvedAt && row.winner)) {
    return MarketLifecycleState.RESOLVED;
  }
  if (st === "refunded") {
    return MarketLifecycleState.REFUNDED;
  }
  if (st === "voided" || row.voidedAt) {
    return MarketLifecycleState.CANCELLED;
  }
  if (st === "under_review" || (row.disputeReason && row.disputeReason.trim().length > 0)) {
    return MarketLifecycleState.DISPUTED;
  }
  if (st === "paused") {
    return MarketLifecycleState.PAUSED;
  }

  if (st === "closed") {
    return MarketLifecycleState.RESOLVING;
  }

  if (st === "open") {
    if (now.getTime() >= row.closesAt.getTime()) {
      return MarketLifecycleState.LOCKED;
    }
    return MarketLifecycleState.OPEN;
  }

  if (now.getTime() >= row.closesAt.getTime()) {
    return MarketLifecycleState.LOCKED;
  }
  return MarketLifecycleState.OPEN;
}

/**
 * Derive lifecycle from UI `Market` (Azuro-backed, curated, or Prisma-mapped).
 * UI `status` uses `closing-soon`, `closed`, etc.; `start_time` is kickoff authority when present.
 */
export function deriveMarketLifecycleFromUiMarket(
  m: UiMarketLifecycleInput,
  now: Date = new Date(),
): MarketLifecycleState {
  const ui = String(m.status ?? "open")
    .trim()
    .toLowerCase();
  const kickoffMs = Math.min(m.start_time.getTime(), m.closesAt.getTime());
  const pastKickoff = now.getTime() >= kickoffMs;

  if (m.result === "draw") {
    return MarketLifecycleState.DISPUTED;
  }
  if (m.result === "yes" || m.result === "no") {
    return MarketLifecycleState.RESOLVED;
  }
  if (ui === "resolved") {
    return MarketLifecycleState.RESOLVED;
  }
  if (ui === "voided") {
    return MarketLifecycleState.CANCELLED;
  }
  if (ui === "under_review") {
    return MarketLifecycleState.DISPUTED;
  }
  if (ui === "paused") {
    return MarketLifecycleState.PAUSED;
  }
  if (ui === "refunded") {
    return MarketLifecycleState.REFUNDED;
  }

  // UI `closed` is used for post-kickoff / oracle-pending (Azuro + curated), not DB `closed` alone.
  if (ui === "closed") {
    return MarketLifecycleState.RESOLVING;
  }

  if (pastKickoff && (ui === "open" || ui === "closing-soon")) {
    return MarketLifecycleState.LOCKED;
  }

  return MarketLifecycleState.OPEN;
}

export function isMarketTerminalState(s: MarketLifecycleState): boolean {
  return TERMINAL.has(s);
}

/** New predictions / LP deposits (paper) — only while truly pre-kickoff. */
export function canOpenNewPaperPosition(s: MarketLifecycleState): boolean {
  return s === MarketLifecycleState.OPEN;
}

export function canProvideLiquidityToMarket(s: MarketLifecycleState): boolean {
  return s === MarketLifecycleState.OPEN;
}

/** Exit to pool before final settlement (paper) — allowed until terminal / dispute / pause. */
export function canClosePaperPositionAgainstMarket(s: MarketLifecycleState): boolean {
  return (
    s === MarketLifecycleState.OPEN ||
    s === MarketLifecycleState.LOCKED ||
    s === MarketLifecycleState.RESOLVING
  );
}

/** Server-side settlement / oracle finalize (paper batch). */
export function canResolvePaperMarket(s: MarketLifecycleState): boolean {
  return (
    s === MarketLifecycleState.LOCKED ||
    s === MarketLifecycleState.RESOLVING ||
    s === MarketLifecycleState.DISPUTED
  );
}

/** Full stake refund (void / draw / cancel) — not from bare OPEN unless admin (handled at procedure). */
export function canRefundPaperMarket(s: MarketLifecycleState): boolean {
  return (
    s === MarketLifecycleState.LOCKED ||
    s === MarketLifecycleState.RESOLVING ||
    s === MarketLifecycleState.DISPUTED ||
    s === MarketLifecycleState.PAUSED ||
    s === MarketLifecycleState.CANCELLED
  );
}

export function reasonCannotRefundPaperMarket(s: MarketLifecycleState): string | null {
  if (canRefundPaperMarket(s)) return null;
  if (s === MarketLifecycleState.OPEN) {
    return "Refund is only available after kickoff or for void/cancel flows (admin).";
  }
  if (s === MarketLifecycleState.RESOLVED) {
    return "This market was already binary-settled; refund is not allowed.";
  }
  if (s === MarketLifecycleState.REFUNDED) {
    return "This market was already refunded.";
  }
  return "Refund is not available for this market state.";
}

/** On-chain claim window (future) — not used in paper DB yet. */
export function canClaimSettlement(s: MarketLifecycleState): boolean {
  return s === MarketLifecycleState.RESOLVED;
}

export function canAccrueTradingRewards(s: MarketLifecycleState): boolean {
  return (
    s === MarketLifecycleState.OPEN ||
    s === MarketLifecycleState.LOCKED ||
    s === MarketLifecycleState.RESOLVING
  );
}

export function shouldSendPreResolutionNotifications(s: MarketLifecycleState): boolean {
  return s === MarketLifecycleState.OPEN || s === MarketLifecycleState.LOCKED;
}

export function reasonCannotProvideLiquidity(s: MarketLifecycleState): string | null {
  if (canProvideLiquidityToMarket(s)) return null;
  switch (s) {
    case MarketLifecycleState.LOCKED:
      return "Cannot add liquidity — kickoff has passed.";
    case MarketLifecycleState.RESOLVING:
      return "Cannot add liquidity — market is awaiting oracle resolution.";
    case MarketLifecycleState.RESOLVED:
      return "Cannot add liquidity — market is resolved.";
    case MarketLifecycleState.CANCELLED:
      return "Cannot add liquidity — market was cancelled.";
    case MarketLifecycleState.REFUNDED:
      return "Cannot add liquidity — market was refunded.";
    case MarketLifecycleState.DISPUTED:
      return "Cannot add liquidity — market is under dispute review.";
    case MarketLifecycleState.PAUSED:
      return "Liquidity deposits are paused for this market.";
    default:
      return "Liquidity deposits are not available for this market.";
  }
}

export function reasonCannotOpenPaperPosition(s: MarketLifecycleState): string | null {
  if (canOpenNewPaperPosition(s)) return null;
  switch (s) {
    case MarketLifecycleState.LOCKED:
      return "Trading is closed — kickoff has passed.";
    case MarketLifecycleState.RESOLVING:
      return "This market is awaiting oracle resolution.";
    case MarketLifecycleState.RESOLVED:
      return "This market is resolved.";
    case MarketLifecycleState.CANCELLED:
      return "This market was cancelled.";
    case MarketLifecycleState.REFUNDED:
      return "This market was refunded.";
    case MarketLifecycleState.DISPUTED:
      return "This market is under dispute review.";
    case MarketLifecycleState.PAUSED:
      return "Trading is temporarily paused for this market.";
    default:
      return "Trading is not available for this market.";
  }
}

export function reasonCannotClosePaperPosition(s: MarketLifecycleState): string | null {
  if (canClosePaperPositionAgainstMarket(s)) return null;
  return reasonCannotOpenPaperPosition(s) ?? "Position exit is not allowed for this market.";
}

export function reasonCannotResolvePaperMarket(s: MarketLifecycleState): string | null {
  if (canResolvePaperMarket(s)) return null;
  if (s === MarketLifecycleState.OPEN) {
    return "Cannot settle — market has not reached post-kickoff / resolving phase.";
  }
  if (isMarketTerminalState(s)) {
    return "Market is already in a terminal state.";
  }
  return "Settlement is not allowed from the current lifecycle state.";
}

/** Binary YES/NO settlement blocked when oracle outcome is draw / void (use refund / dispute flows). */
export function isBinaryPaperSettlementBlockedByOracleUi(m: UiMarketLifecycleInput): boolean {
  if (m.result === "draw") return true;
  return false;
}
