/**
 * Pure 1X2 math for Azuro-style decimal odds (no server env / no GraphQL).
 * outcomes[0]=home, [1]=draw, [2]=away — implied probs sum to 1.
 */
export function transformAzuroThreeWayOdds(
  homeOdds: string,
  drawOdds: string,
  awayOdds: string,
): { home: number; draw: number; away: number } {
  const oh = parseFloat(homeOdds);
  const od = parseFloat(drawOdds);
  const oa = parseFloat(awayOdds);
  if (![oh, od, oa].every((x) => Number.isFinite(x) && x > 0)) {
    return { home: 1 / 3, draw: 1 / 3, away: 1 / 3 };
  }
  let h = 1 / oh;
  let d = 1 / od;
  let a = 1 / oa;
  const t = h + d + a;
  if (!(t > 0)) return { home: 1 / 3, draw: 1 / 3, away: 1 / 3 };
  h /= t;
  d /= t;
  a /= t;
  return {
    home: Math.max(0.01, Math.min(0.98, h)),
    draw: Math.max(0.01, Math.min(0.98, d)),
    away: Math.max(0.01, Math.min(0.98, a)),
  };
}
