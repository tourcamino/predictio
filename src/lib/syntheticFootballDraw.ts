import { transformAzuroThreeWayOdds } from "~/utils/azuroThreeWayOdds";

/** When Azuro/registry omits draw odds, football 1X2 UI still exposes DRAW (matches catalog list). */
export const SYNTHETIC_FOOTBALL_DRAW_DECIMAL = 3.35;

export function isFootballSportKey(sportSlug?: string | null, sport?: string | null): boolean {
  const s = (sportSlug ?? sport ?? "").trim().toLowerCase();
  return s === "football" || s === "soccer";
}

export function impliedPricesFromThreeWayDecimals(
  homeOdds: number,
  drawOdds: number,
  awayOdds: number,
): { yesPrice: number; noPrice: number; percentA: number; percentDraw: number; percentB: number } {
  const t = transformAzuroThreeWayOdds(
    String(homeOdds),
    String(drawOdds),
    String(awayOdds),
  );
  const percentA = Math.round(t.home * 100);
  const percentDraw = Math.round(t.draw * 100);
  const percentB = Math.max(0, 100 - percentA - percentDraw);
  return {
    yesPrice: t.home,
    noPrice: t.away,
    percentA,
    percentDraw,
    percentB,
  };
}
