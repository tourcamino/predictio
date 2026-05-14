import { createHash } from "node:crypto";

/** Canonical binary outcome for paper YES/NO markets. */
export type PaperBinaryOutcome = "YES" | "NO";

export type OracleAxisOutcome = "home" | "away" | "draw" | "yes" | "no";

/** Non-binary oracle buckets → refund vs manual dispute queue. */
export type PaperOracleNonBinaryKind =
  | "DRAW"
  | "CANCELLED"
  | "VOID"
  | "NO_CONTEST"
  | "POSTPONED"
  | "SUSPENDED"
  | "ABANDONED"
  | "INVALID";

export type PaperOracleResolution =
  | { kind: "BINARY"; side: PaperBinaryOutcome }
  | { kind: "REFUND"; reason: PaperOracleNonBinaryKind }
  | { kind: "DISPUTE"; reason: PaperOracleNonBinaryKind }
  | { kind: "UNKNOWN" };

const REFUND_REASONS = new Set<PaperOracleNonBinaryKind>([
  "DRAW",
  "CANCELLED",
  "VOID",
  "NO_CONTEST",
  "INVALID",
]);

const DISPUTE_REASONS = new Set<PaperOracleNonBinaryKind>(["POSTPONED", "SUSPENDED", "ABANDONED"]);

function norm(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase();
}

/**
 * Map external oracle strings → paper YES/NO.
 * Convention: home = YES (first team / home side), away = NO.
 */
export function normalizeOracleToPaperBinary(raw: string | null | undefined): PaperBinaryOutcome | null {
  const s = norm(raw);
  if (s === "yes" || s === "y" || s === "home" || s === "1" || s === "h") return "YES";
  if (s === "no" || s === "n" || s === "away" || s === "2" || s === "a") return "NO";
  return null;
}

/** Legacy helper — prefer {@link classifyPaperOracleResolution}. */
export function isNonBinaryOracleOutcome(raw: string | null | undefined): boolean {
  const c = classifyPaperOracleResolution(raw);
  return c.kind === "REFUND" || c.kind === "DISPUTE";
}

function mapStringToNonBinaryKind(s: string): PaperOracleNonBinaryKind | null {
  if (s === "draw" || s === "x") return "DRAW";
  if (s === "cancelled" || s === "canceled") return "CANCELLED";
  if (s === "void" || s === "voided") return "VOID";
  if (s === "no_contest" || s === "nocontest" || s === "no contest") return "NO_CONTEST";
  if (s === "postponed" || s === "delayed") return "POSTPONED";
  if (s === "suspended") return "SUSPENDED";
  if (s === "abandoned" || s === "walkover" || s === "walkover_win") return "ABANDONED";
  if (s === "invalid" || s === "refunded") return "INVALID";
  return null;
}

/**
 * Single entry point: classify indexer / admin string into binary settle, refund batch, or dispute queue.
 */
export function classifyPaperOracleResolution(raw: string | null | undefined): PaperOracleResolution {
  const s = norm(raw);
  if (!s) return { kind: "UNKNOWN" };

  const binary = normalizeOracleToPaperBinary(s);
  if (binary) return { kind: "BINARY", side: binary };

  const nb = mapStringToNonBinaryKind(s);
  if (nb) {
    if (REFUND_REASONS.has(nb)) return { kind: "REFUND", reason: nb };
    if (DISPUTE_REASONS.has(nb)) return { kind: "DISPUTE", reason: nb };
  }
  return { kind: "UNKNOWN" };
}

/** Deterministic id for binary settlement runs. */
export function buildPaperSettlementRunId(parts: {
  marketId: string;
  winningOutcome: PaperBinaryOutcome;
  conditionId?: string | null;
  settlementVersion: number;
}): string {
  const base = [
    parts.marketId,
    parts.winningOutcome,
    parts.conditionId ?? "",
    String(parts.settlementVersion),
  ].join("|");
  return `paper:${createHash("sha256").update(base).digest("hex").slice(0, 24)}`;
}

/** Deterministic id for refund / void settlement runs. */
export function buildPaperRefundRunId(parts: {
  marketId: string;
  refundReason: string;
  conditionId?: string | null;
  refundEngineVersion: number;
}): string {
  const base = ["refund", parts.marketId, parts.refundReason, parts.conditionId ?? "", String(parts.refundEngineVersion)].join("|");
  return `paper:${createHash("sha256").update(base).digest("hex").slice(0, 24)}`;
}
