import type { RawAzuroGame } from "./azuroCuratorGraphql";
import { canonicalSportFromRaw } from "./canonicalSportTaxonomy";
import {
  classifyLeagueTier,
  isItalianSerieBFixture,
  normCountry,
} from "./editorialLeagueTiers";
import {
  isStrictPremiumWhitelistEffective,
  passesProtocolContinuityTierD,
} from "./editorialPremiumFirewall";
import { isEmergencyRelaxMode } from "./emergencyRelaxMode";

export type ScoredItalianLike = { raw: RawAzuroGame; importanceScore: number };

function sortParticipants(g: RawAzuroGame): Array<{ name?: string; sortOrder?: number }> {
  const parts = g.participants;
  const arr = Array.isArray(parts) ? [...parts] : [];
  arr.sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
  return arr;
}

function hasValidParticipants(g: RawAzuroGame): boolean {
  const arr = sortParticipants(g);
  const a = String(arr[0]?.name || "").trim();
  const b = String(arr[1]?.name || "").trim();
  return a.length > 0 && b.length > 0;
}

/**
 * Last-resort gate when strict + Tier D cannot reach CATALOG_TARGET_SIZE.
 * Not "garbage any": blocks obvious junk, Brazil top flight, Serie B, missing rosters.
 */
export function passesSurvivalInventoryScoredItalian(it: ScoredItalianLike): boolean {
  if (isStrictPremiumWhitelistEffective() && passesProtocolContinuityTierD(it)) return true;

  const g = it.raw;
  if (!hasValidParticipants(g)) return false;

  const imp = it.importanceScore;
  const minImp = isEmergencyRelaxMode() ? 38 : 48;
  if (imp < minImp) return false;

  const leagueName = String(g.league?.name || "");
  const country = String(g.league?.country?.name || "");
  const slug = g.league?.slug;
  const cnt = normCountry(country);

  if (cnt === "brazil") return false;
  if (isItalianSerieBFixture(leagueName, country, slug)) return false;

  const sport = canonicalSportFromRaw(g);
  const verdict = classifyLeagueTier(leagueName, country, slug);

  if (sport === "football") {
    if (verdict.passesLeagueGate) return true;
    const ln = leagueName.toLowerCase();
    const looksMajor =
      ln.includes("premier league") ||
      ln.includes("champions league") ||
      ln.includes("europa league") ||
      ln.includes("conference league") ||
      ln.includes("serie a") ||
      ln.includes("bundesliga") ||
      ln.includes("ligue 1") ||
      ln.includes("la liga") ||
      ln.includes("laliga") ||
      ln.includes("coppa italia") ||
      ln.includes("copa del rey") ||
      ln.includes("dfb-pokal") ||
      ln.includes("fa cup");
    if (looksMajor && imp >= minImp) return true;
    if (isEmergencyRelaxMode() && ln.length > 4 && imp >= 42) return true;
    return false;
  }

  return sport != null && imp >= (isEmergencyRelaxMode() ? 52 : 62);
}
