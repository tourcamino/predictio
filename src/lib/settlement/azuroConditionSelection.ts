/**
 * Select the Azuro condition used for paper settlement (PR6).
 * Football games expose dozens of conditions; conditions[0] is often NOT full-time 1X2.
 */

export type AzuroConditionLike = {
  conditionId?: string;
  state?: string;
  wonOutcomeIds?: string[];
  outcomes?: Array<{
    outcomeId?: string;
    title?: string | null;
    currentOdds?: string | null;
  }>;
};

export type MoneylineConditionPick = {
  condition: AzuroConditionLike;
  index: number;
  reason: string;
  outcomeCount: number;
};

export type MoneylineOddsHint = {
  homeDecimal?: number | null;
  drawDecimal?: number | null;
  awayDecimal?: number | null;
};

function parseOdd(s: string | null | undefined): number {
  const n = parseFloat(String(s ?? ""));
  return Number.isFinite(n) && n > 1 ? n : 0;
}

function isPlausibleThreeWay(odds: number[]): boolean {
  return odds.length === 3 && odds.every((x) => x >= 1.01 && x <= 80);
}

/**
 * Pick the condition that backs Predictio's YES/NO/DRAW moneyline for this game.
 */
export function pickMoneylineCondition(
  conditions: AzuroConditionLike[] | undefined,
  hint?: MoneylineOddsHint,
): MoneylineConditionPick | null {
  if (!conditions?.length) return null;

  const threeWay = conditions
    .map((c, index) => ({ c, index }))
    .filter(({ c }) => (c.outcomes?.length ?? 0) === 3);

  if (threeWay.length === 0) {
    const c0 = conditions[0];
    if (!c0?.conditionId) return null;
    return {
      condition: c0,
      index: 0,
      reason: "fallback_conditions_0_no_three_way",
      outcomeCount: c0.outcomes?.length ?? 0,
    };
  }

  const hHint = hint?.homeDecimal ?? 0;
  const dHint = hint?.drawDecimal ?? 0;
  const aHint = hint?.awayDecimal ?? 0;
  if (hHint > 1 && dHint > 1 && aHint > 1) {
    let best: (typeof threeWay)[number] | null = null;
    let bestScore = Infinity;
    for (const item of threeWay) {
      const o = item.c.outcomes!;
      const h = parseOdd(o[0]?.currentOdds);
      const d = parseOdd(o[1]?.currentOdds);
      const a = parseOdd(o[2]?.currentOdds);
      if (!h || !d || !a) continue;
      const score =
        Math.abs(h - hHint) + Math.abs(d - dHint) + Math.abs(a - aHint);
      if (score < bestScore) {
        bestScore = score;
        best = item;
      }
    }
    if (best && bestScore < 15) {
      return {
        condition: best.c,
        index: best.index,
        reason: "matched_catalog_decimal_odds",
        outcomeCount: 3,
      };
    }
  }

  for (const item of threeWay) {
    const odds = (item.c.outcomes ?? []).map((o) => parseOdd(o.currentOdds));
    if (isPlausibleThreeWay(odds)) {
      return {
        condition: item.c,
        index: item.index,
        reason: "first_plausible_three_way_moneyline",
        outcomeCount: 3,
      };
    }
  }

  const first = threeWay[0]!;
  return {
    condition: first.c,
    index: first.index,
    reason: "first_three_way_fallback",
    outcomeCount: 3,
  };
}

/** Map won outcome to home/away for binary settlement (middle outcome = draw refund). */
export function mapWonOutcomeToHomeAway(
  condition: AzuroConditionLike,
): "home" | "away" | "draw" | null {
  const wonId = condition.wonOutcomeIds?.[0];
  const outs = condition.outcomes ?? [];
  if (!wonId || outs.length < 2) return null;
  if (outs.length >= 3 && outs[1]?.outcomeId && wonId === outs[1].outcomeId) {
    return "draw";
  }
  if (outs[0]?.outcomeId && wonId === outs[0].outcomeId) return "home";
  if (outs.length >= 2 && outs[outs.length - 1]?.outcomeId === wonId) return "away";
  if (outs[1]?.outcomeId === wonId) return "away";
  return null;
}
