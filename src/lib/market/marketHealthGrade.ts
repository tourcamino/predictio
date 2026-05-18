/**
 * Protocol market health grades — driven by real signals only.
 */

export type MarketHealthGrade = "A" | "B" | "C" | "D" | "F";

export type MarketHealthInput = {
  quoteFreshMs: number | null;
  openInterestUsd: number;
  poolLiquidityUsd: number;
  recentFillCount24h: number;
  traderCount: number;
  oracleState: "prematch" | "live" | "pending" | "terminal" | "unknown";
  isTradable: boolean;
  spreadPct: number;
};

export type MarketHealthResult = {
  grade: MarketHealthGrade;
  label: string;
  reasons: string[];
};

export function gradeMarketHealth(input: MarketHealthInput): MarketHealthResult {
  const reasons: string[] = [];
  let score = 100;

  if (!input.isTradable) {
    return { grade: "F", label: "Not tradable", reasons: ["Trading closed or oracle blocked"] };
  }

  if (input.oracleState === "pending" || input.oracleState === "unknown") {
    score -= 25;
    reasons.push("Oracle pending or unknown");
  }
  if (input.oracleState === "terminal") {
    score -= 40;
    reasons.push("Oracle terminal — settlement lane");
  }

  const staleMs = input.quoteFreshMs ?? Infinity;
  if (staleMs > 120_000) {
    score -= 30;
    reasons.push("Stale quotes (>2m)");
  } else if (staleMs > 60_000) {
    score -= 15;
    reasons.push("Aging quotes (>1m)");
  }

  const util =
    input.poolLiquidityUsd > 0 ? input.openInterestUsd / input.poolLiquidityUsd : 0;
  if (util > 0.85) {
    score -= 20;
    reasons.push("High utilization");
  } else if (util < 0.02 && input.recentFillCount24h === 0) {
    score -= 10;
    reasons.push("Thin liquidity");
  }

  if (input.spreadPct > 5) {
    score -= 15;
    reasons.push("Wide spread");
  }

  if (input.recentFillCount24h >= 3) score += 5;
  if (input.traderCount >= 5) score += 5;

  score = Math.max(0, Math.min(100, score));

  let grade: MarketHealthGrade;
  let label: string;
  if (score >= 85) {
    grade = "A";
    label = "Healthy active";
  } else if (score >= 70) {
    grade = "B";
    label = "Tradable";
  } else if (score >= 50) {
    grade = "C";
    label = "Thin";
  } else if (score >= 30) {
    grade = "D";
    label = "Stale";
  } else {
    grade = "F";
    label = "Oracle risk";
  }

  if (reasons.length === 0) {
    reasons.push(grade === "A" ? "Live quotes and flow" : "Within protocol norms");
  }

  return { grade, label, reasons };
}
