import type { AzuroMarket } from "~/services/azuro";
import { isVerifiedItalianFootballCopy } from "~/lib/premiumCatalogStrictClient";

export type HomepageNarrativeKey =
  | "championsLeagueNight"
  | "italianSpotlight"
  | "grandSlamSpotlight"
  | "formula1Weekend"
  | "thisWeekend"
  | "nextWeek"
  | "curatedOutlook";

const SECTION_FLOW: HomepageNarrativeKey[] = [
  "championsLeagueNight",
  "italianSpotlight",
  "grandSlamSpotlight",
  "formula1Weekend",
  "thisWeekend",
  "nextWeek",
  "curatedOutlook",
];

export const HOMEPAGE_NARRATIVE_COPY: Record<
  HomepageNarrativeKey,
  { title: string; subtitle: string }
> = {
  championsLeagueNight: {
    title: "Champions League night",
    subtitle: "Midweek European cups — high-signal knockouts.",
  },
  italianSpotlight: {
    title: "Italian spotlight",
    subtitle: "Serie A, Coppa, and Italy-first editorial picks.",
  },
  grandSlamSpotlight: {
    title: "Court & slam window",
    subtitle: "Premium tennis — majors and high-importance draws.",
  },
  formula1Weekend: {
    title: "Formula 1 weekend",
    subtitle: "Race round narrative — pace and grid intelligence.",
  },
  thisWeekend: {
    title: "This weekend",
    subtitle: "Events clustering the near horizon — curated density.",
  },
  nextWeek: {
    title: "Next week",
    subtitle: "Forward window — positioning before liquidity concentrates.",
  },
  curatedOutlook: {
    title: "Editorial outlook",
    subtitle: "Further horizon — same catalogue discipline, extended context.",
  },
};

function kickoffMs(m: AzuroMarket): number {
  const t = Date.parse(m.event?.startsAt ?? "");
  return Number.isFinite(t) ? t : NaN;
}

function isChampionsLeagueLeague(name: string): boolean {
  const l = name.toLowerCase();
  return l.includes("champions league") && !l.includes("afc") && !l.includes("caf");
}

function isItalianLane(m: AzuroMarket): boolean {
  return isVerifiedItalianFootballCopy(m);
}

function isGrandSlamOrPremiumTennis(m: AzuroMarket): boolean {
  if (m.sport !== "tennis") return false;
  const c = m.competition.toLowerCase();
  const teams = (m.event?.teams ?? []).join(" ").toLowerCase();
  const star = /\b(sinner|alcaraz|djokovic|nadal)\b/.test(teams);
  const compPrem =
    c.includes("grand slam") ||
    c.includes("wimbledon") ||
    c.includes("roland") ||
    c.includes("french open") ||
    c.includes("australian open") ||
    c.includes("us open") ||
    /\batp|masters/.test(c);
  return compPrem && star;
}

function isFormulaLane(m: AzuroMarket): boolean {
  const c = m.competition.toLowerCase();
  const s = m.sport.toLowerCase();
  return s === "f1" || s === "motorsport" || c.includes("formula 1") || c.includes("grand prix");
}

function isThisWeekend(k: number, now: number): boolean {
  if (!Number.isFinite(k) || k < now) return false;
  const d = new Date(k);
  const dow = d.getUTCDay();
  const daysAhead = (k - now) / (86400 * 1000);
  return daysAhead <= 10 && (dow === 5 || dow === 6 || dow === 0);
}

function isNextWeekBand(k: number, now: number): boolean {
  if (!Number.isFinite(k) || k < now) return false;
  const daysAhead = (k - now) / (86400 * 1000);
  return daysAhead > 3 && daysAhead <= 15;
}

function classifyMarket(m: AzuroMarket, nowMs: number): HomepageNarrativeKey {
  if (isChampionsLeagueLeague(m.competition)) return "championsLeagueNight";
  if (isItalianLane(m)) return "italianSpotlight";
  if (isGrandSlamOrPremiumTennis(m)) return "grandSlamSpotlight";
  if (isFormulaLane(m)) return "formula1Weekend";
  const k = kickoffMs(m);
  if (isThisWeekend(k, nowMs)) return "thisWeekend";
  if (isNextWeekBand(k, nowMs)) return "nextWeek";
  return "curatedOutlook";
}

/** Editorial band title for a single row (e.g. featured kicker). */
export function narrativeBandTitleForMarket(m: AzuroMarket, nowMs = Date.now()): string {
  return HOMEPAGE_NARRATIVE_COPY[classifyMarket(m, nowMs)].title;
}

export function formatKickoffPreview(m: AzuroMarket): string | null {
  const t = Date.parse(m.event?.startsAt ?? "");
  if (!Number.isFinite(t)) return null;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(t));
}

/** One section per market (priority order); preserves input order within each bucket. */
export function groupCuratedForHomepageNarrative(
  markets: AzuroMarket[],
  nowMs = Date.now(),
): Array<{
  key: HomepageNarrativeKey;
  title: string;
  subtitle: string;
  markets: AzuroMarket[];
}> {
  const buckets = new Map<HomepageNarrativeKey, AzuroMarket[]>();
  for (const key of SECTION_FLOW) buckets.set(key, []);

  for (const m of markets) {
    buckets.get(classifyMarket(m, nowMs))!.push(m);
  }

  return SECTION_FLOW.map((key) => ({
    key,
    ...HOMEPAGE_NARRATIVE_COPY[key],
    markets: buckets.get(key) ?? [],
  })).filter((s) => s.markets.length > 0);
}
