import { priceMovementLabel } from "~/lib/market/marketProtocolStatus";
import type { MarketPrice } from "~/store/tradingStore";
import type { TraderDeskRow, TraderMatchPhase } from "./traderPositionDesk";

export type ConvictionState =
  | "strong_favor"
  | "favor"
  | "neutral"
  | "against"
  | "strong_against";

export type RiskState = "tradeable" | "ending" | "locked" | "settling" | "terminal";

export type TraderDeskPsychology = {
  probDriftPct: number;
  marketDriftLabel: string;
  convictionState: ConvictionState;
  convictionLabel: string;
  timingLabel: string;
  timingUrgent: boolean;
  positionAgeLabel: string;
  quoteAgeLabel: string | null;
  riskState: RiskState;
  oracleStateLabel: string;
  favorableForSide: boolean | null;
  exitValue: number;
  pnlIfSoldNow: number;
  pnlPctIfSoldNow: number;
  payoutIfHeldCorrect: number;
};

function formatAge(openedAt: Date): string {
  const ms = Date.now() - openedAt.getTime();
  if (ms < 0) return "Just opened";
  const h = Math.floor(ms / 3_600_000);
  const d = Math.floor(h / 24);
  if (d > 0) return `Held ${d}d`;
  if (h > 0) return `Held ${h}h`;
  const m = Math.floor(ms / 60_000);
  return m > 0 ? `Held ${m}m` : "Just opened";
}

function formatQuoteAge(timestamp?: number): string | null {
  if (!timestamp || timestamp <= 0) return null;
  const sec = Math.floor((Date.now() - timestamp) / 1000);
  if (sec < 5) return "Quote just now";
  if (sec < 60) return `Quote ${sec}s ago`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `Quote ${m}m ago`;
  return `Quote ${Math.floor(m / 60)}h ago`;
}

function isProbFavorableForSide(
  side: "YES" | "NO" | "DRAW",
  entryProbPct: number,
  currentProbPct: number,
): boolean | null {
  const delta = currentProbPct - entryProbPct;
  if (Math.abs(delta) <= 1) return null;
  if (side === "YES" || side === "DRAW") return delta > 0;
  return delta < 0;
}

function deriveConviction(
  favorable: boolean | null,
  driftPct: number,
): { state: ConvictionState; label: string } {
  const abs = Math.abs(driftPct);
  if (favorable === null || abs < 0.5) {
    return { state: "neutral", label: "Market flat vs entry" };
  }
  if (favorable) {
    if (abs >= 12) {
      return { state: "strong_favor", label: "Strong conviction · market with you" };
    }
    if (abs >= 3) {
      return { state: "favor", label: "Market favors your side" };
    }
    return { state: "favor", label: "Slight edge vs entry" };
  }
  if (abs >= 12) {
    return { state: "strong_against", label: "Market moved hard against you" };
  }
  if (abs >= 3) {
    return { state: "against", label: "Market moved against your side" };
  }
  return { state: "against", label: "Slight drift against you" };
}

function deriveTimingLabel(
  phase: TraderMatchPhase,
  countdownLabel: string | null,
  sortSection: TraderDeskRow["sortSection"],
): { label: string; urgent: boolean } {
  switch (phase) {
    case "live":
      return {
        label: countdownLabel ? `Live · ${countdownLabel} left` : "Live now",
        urgent: true,
      };
    case "scheduled":
      return {
        label: countdownLabel ? `Starts in ${countdownLabel}` : "Scheduled",
        urgent: false,
      };
    case "closed":
      return { label: "FT · match ended", urgent: true };
    case "awaiting_oracle":
      return { label: "FT · awaiting oracle", urgent: true };
    case "settled":
      return { label: "Resolved · paid", urgent: false };
    case "cancelled":
      return { label: "Cancelled", urgent: false };
    case "refunded":
      return { label: "Refunded", urgent: false };
    default:
      return {
        label: countdownLabel ?? "Open",
        urgent: sortSection === "ending_soon",
      };
  }
}

function deriveRiskState(
  phase: TraderMatchPhase,
  sortSection: TraderDeskRow["sortSection"],
  canSell: boolean,
): RiskState {
  if (phase === "settled" || phase === "cancelled" || phase === "refunded") {
    return "terminal";
  }
  if (phase === "awaiting_oracle" || phase === "closed") {
    return "settling";
  }
  if (!canSell) return "locked";
  if (sortSection === "ending_soon" || phase === "live") return "ending";
  return "tradeable";
}

function deriveOracleState(phase: TraderMatchPhase, oracleMinimal: string | null): string {
  if (phase === "awaiting_oracle") return "Oracle queue · settlement next";
  if (phase === "closed") return oracleMinimal ?? "FT · oracle sync";
  if (phase === "live") return "Live quotes · mark-to-market";
  if (phase === "scheduled") return "Prematch · quotes active";
  if (phase === "settled") return "Settled on-chain";
  return "Open";
}

export type TraderDeskRowCore = Omit<TraderDeskRow, "psychology">;

export function deriveTraderDeskPsychology(
  row: TraderDeskRowCore,
  marketPrice?: MarketPrice,
): TraderDeskPsychology {
  const entry = row.position.entryPrice;
  const current = row.currentProbPct / 100;
  const movement = priceMovementLabel(entry, current);
  const favorableForSide = isProbFavorableForSide(
    row.position.side,
    row.entryProbPct,
    row.currentProbPct,
  );
  const { state, label } = deriveConviction(favorableForSide, movement.pct);
  const timing = deriveTimingLabel(row.matchPhase, row.countdownLabel, row.sortSection);

  let marketDriftLabel = movement.label;
  if (!movement.unchanged && favorableForSide === true) {
    marketDriftLabel = `Probability +${Math.abs(row.probDeltaPct)}¢ · ${movement.label}`;
  } else if (!movement.unchanged && favorableForSide === false) {
    marketDriftLabel = `Probability ${row.probDeltaPct}¢ · ${movement.label}`;
  } else if (movement.unchanged) {
    marketDriftLabel = "Probability unchanged vs entry";
  }

  return {
    probDriftPct: movement.pct,
    marketDriftLabel,
    convictionState: state,
    convictionLabel: label,
    timingLabel: timing.label,
    timingUrgent: timing.urgent,
    positionAgeLabel: formatAge(row.position.openedAt),
    quoteAgeLabel: formatQuoteAge(marketPrice?.timestamp),
    riskState: deriveRiskState(row.matchPhase, row.sortSection, row.canSell),
    oracleStateLabel: deriveOracleState(row.matchPhase, row.oracleMinimal),
    favorableForSide,
    exitValue: row.displayValue,
    pnlIfSoldNow: row.displayPnl,
    pnlPctIfSoldNow: row.displayPnlPct,
    payoutIfHeldCorrect: row.maxPayout,
  };
}

export type DeskPulseSnapshot = {
  favored: number;
  against: number;
  flat: number;
  liveNow: number;
  urgent: number;
  avgProbDriftPct: number;
};

export function aggregateDeskPulse(rows: TraderDeskRow[]): DeskPulseSnapshot {
  let favored = 0;
  let against = 0;
  let flat = 0;
  let driftSum = 0;
  let driftN = 0;
  for (const row of rows) {
    const psych = row.psychology;
    if (psych.favorableForSide === true) favored++;
    else if (psych.favorableForSide === false) against++;
    else flat++;
    if (!psych.marketDriftLabel.includes("unchanged")) {
      driftSum += psych.probDriftPct;
      driftN++;
    }
  }
  return {
    favored,
    against,
    flat,
    liveNow: rows.filter((r) => r.matchPhase === "live").length,
    urgent: rows.filter(
      (r) => r.sortSection === "ending_soon" || r.matchPhase === "live",
    ).length,
    avgProbDriftPct: driftN > 0 ? driftSum / driftN : 0,
  };
}
