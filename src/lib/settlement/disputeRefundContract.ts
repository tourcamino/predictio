/**
 * Dispute / refund contract (paper runtime).
 *
 * **Refund path** (automatic from oracle when safe):
 * - Triggers: DRAW, VOID, CANCELLED, NO_CONTEST, INVALID oracle classification
 * - Authority: `azuro_graphql` | `paper_admin` | `client_poll` (same oracle envelope as settlement)
 * - Ledger: `position_refund` per order (stake = shares * avgPrice), idempotent per `orderId`
 * - Market DB: `status = refunded`, `resolutionReason`, optional `voidedAt`, `winner = null`
 * - Orders: `status = resolved`, `pnl = 0` (stake returned, not a win/loss)
 * - Points: no MARKET_RESOLVED_WIN; optional future: deduct mistaken win points (debt)
 *
 * **Dispute path** (manual / postponed):
 * - Triggers: POSTPONED, SUSPENDED, ABANDONED from classifier → `DISPUTE` kind
 * - DB: `status = under_review`, `disputeReason`
 * - Lifecycle: `DISPUTED` — no balance movement until admin refund or binary resolve
 *
 * **Transitions** (see `VALID_MARKET_TRANSITIONS` in market lifecycle):
 * - RESOLVING → REFUNDED | DISPUTED | RESOLVED
 * - DISPUTED → REFUNDED | RESOLVED
 * - Never: RESOLVED → REFUNDED (binary terminal); use admin repair job (out of scope)
 */

import type { PaperOracleNonBinaryKind } from "~/lib/settlement/oracleOutcome";

export const REFUND_ENGINE_VERSION = 1 as const;

export type PaperRefundReason = PaperOracleNonBinaryKind | "MANUAL_VOID" | "ORACLE_INCONSISTENT";

export type PaperRefundAuthority = "azuro_graphql" | "paper_admin" | "client_poll" | "unknown";

export type PaperRefundRunInput = {
  marketId: string;
  reason: PaperRefundReason;
  authority: PaperRefundAuthority;
  conditionId?: string | null;
  observedAt: Date;
  rawOracle?: string | null;
};
