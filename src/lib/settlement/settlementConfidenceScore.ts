import type { SettlementDiagnosticEntry, SettlementSkipReasonCode } from "~/lib/settlement/settlementDiagnostics";

export type SettlementConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export type SettlementConfidenceResult = {
  level: SettlementConfidenceLevel;
  headline: string;
  detail: string;
  factors: string[];
};

function lagMinutes(closesAt: string | null, now = Date.now()): number | null {
  if (!closesAt) return null;
  const t = Date.parse(closesAt);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.round((now - t) / 60_000));
}

/**
 * Deterministic payout confidence — oracle + condition facts only (no AI / no synthetic odds).
 */
export function deriveSettlementConfidence(
  diagnostic: SettlementDiagnosticEntry,
  opts?: { settlementLagMinutes?: number | null },
): SettlementConfidenceResult {
  const lag = opts?.settlementLagMinutes ?? lagMinutes(diagnostic.closesAt);
  const factors: string[] = [];
  const code = diagnostic.reasonCode;

  if (code === "SETTLEMENT_ELIGIBLE" && diagnostic.hasWinner) {
    factors.push("Oracle resolved with wonOutcomeIds");
    if (diagnostic.conditionIndex != null) {
      factors.push(`Moneyline condition idx ${diagnostic.conditionIndex}/${diagnostic.conditionCount}`);
    }
    return {
      level: "HIGH",
      headline: "Payout-ready",
      detail: "Azuro published a terminal result on the selected moneyline condition.",
      factors,
    };
  }

  if (code === "MARKET_ALREADY_SETTLED") {
    return {
      level: "HIGH",
      headline: "Settled in protocol",
      detail: "This market is already resolved in Predictio ledger.",
      factors: ["Database status resolved"],
    };
  }

  if (code === "ORACLE_PREMATCH") {
    if (lag != null && lag > 90) {
      factors.push(`Kickoff closed ~${lag}m ago`);
    }
    factors.push("Azuro oracle still Prematch");
    return {
      level: "MEDIUM",
      headline: "Finished match — oracle pending",
      detail:
        "The match has finished, but Azuro has not finalized the oracle result yet. Your position stays open until the oracle publishes a terminal state.",
      factors,
    };
  }

  if (code === "ORACLE_NOT_RESOLVED") {
    return {
      level: "MEDIUM",
      headline: "Awaiting oracle resolution",
      detail: "Azuro reports the game is no longer prematch but has not published a final winner yet.",
      factors: [`Oracle state: ${diagnostic.azuroGameState ?? "unknown"}`],
    };
  }

  const lowCodes: SettlementSkipReasonCode[] = [
    "GAME_NOT_IN_SUBGRAPH",
    "GRAPHQL_ERROR",
    "CONDITION_MISSING",
    "INVALID_MAPPING",
    "WINNER_UNKNOWN",
    "NON_AZURO_MARKET",
  ];

  if (lowCodes.includes(code)) {
    if (code === "GAME_NOT_IN_SUBGRAPH" || code === "GRAPHQL_ERROR") {
      factors.push("Indexer/subgraph gap or configuration issue");
    }
    if (code === "CONDITION_MISSING" || code === "INVALID_MAPPING") {
      factors.push("Moneyline condition could not be validated");
    }
    if (lag != null && lag > 180 && diagnostic.azuroGameState?.toLowerCase() === "prematch") {
      factors.push(`Long prematch lag (~${lag}m after close)`);
    }
    return {
      level: "LOW",
      headline: "Settlement blocked",
      detail: diagnostic.reasonDetail,
      factors,
    };
  }

  if (code === "DRAW_UNSUPPORTED" || code === "VOID_OR_REFUND") {
    return {
      level: "MEDIUM",
      headline: "Refund path",
      detail: "Outcome requires refund rather than binary payout.",
      factors: [diagnostic.reasonDetail],
    };
  }

  return {
    level: "MEDIUM",
    headline: "Settlement in progress",
    detail: diagnostic.reasonDetail,
    factors: [code],
  };
}
