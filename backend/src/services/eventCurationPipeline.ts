import {
  extract1x2DecimalOddsFromRawGame,
  fetchAzuroGames,
  rawGameIsFootball,
  type NormalizedCuratorGame,
  type RawAzuroGame,
} from "./azuroCuratorGraphql";

export type CurationGamePayload = {
  id: string;
  gameId: string;
  title: string;
  sport: string;
  sportSlug: string;
  competition: string;
  leagueName: string;
  country: string;
  homeTeam: string;
  awayTeam: string;
  homeImage: string | null;
  awayImage: string | null;
  startsAt: string;
  startsAtUnix: number;
  status: string;
  isSelected: boolean;
  importanceScore: number;
  autoPublish: boolean;
  homeOdds: number | null;
  drawOdds: number | null;
  awayOdds: number | null;
  /** Fascia calendario (0–3g / 3–14g / 14–30g da now) */
  temporalBand?: "SOON" | "MID" | "LATER";
};

type RawForScore = {
  league?: { name?: string };
  title?: string;
  participants?: Array<{ name?: string; sortOrder?: number }>;
};

function sortParticipantsByOrder(parts: RawForScore["participants"]) {
  const arr = Array.isArray(parts) ? parts : [];
  return [...arr].sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
}

/** Club “prestigio” (top leghe + big Serie A / UEFA). Match su sottostringa nome squadra Azuro. */
export const PRESTIGE_CLUB_SNIPPETS = [
  "real madrid",
  "barcelona",
  "atletico",
  "atletico madrid",
  "sevilla",
  "villarreal",
  "betis",
  "sociedad",
  "manchester city",
  "manchester united",
  "liverpool",
  "arsenal",
  "chelsea",
  "tottenham",
  "newcastle",
  "west ham",
  "aston villa",
  "brighton",
  "fulham",
  "crystal palace",
  "everton",
  "bayern",
  "dortmund",
  "leverkusen",
  "leipzig",
  "frankfurt",
  "stuttgart",
  "wolfsburg",
  "psg",
  "marseille",
  "lyon",
  "monaco",
  "juventus",
  "inter",
  "milan",
  "napoli",
  "roma",
  "lazio",
  "atalanta",
  "fiorentina",
  "bologna",
  "torino",
  "porto",
  "benfica",
  "sporting",
  "ajax",
  "feyenoord",
  "celtic",
  "rangers",
  "galatasaray",
  "fenerbahce",
  "union berlin",
  "sporting braga",
  "braga",
];

/** Legacy gate helpers — kept for reversible rollback; pool no longer requires these. */
const UNPRED_MIN_FAVORITE_ODDS = 1.5;
const UNPRED_MAX_HOME_AWAY_GAP = 2.0;

function isEventUnpredictableWithParams(
  homeOdds: number | null,
  awayOdds: number | null,
  minFavorite: number,
  maxGap: number,
): boolean {
  if (homeOdds == null || awayOdds == null) return false;
  if (!(homeOdds > 1) || !(awayOdds > 1)) return false;
  const favorite = Math.min(homeOdds, awayOdds);
  const gap = Math.abs(homeOdds - awayOdds);
  if (favorite < minFavorite) return false;
  if (gap > maxGap) return false;
  return true;
}

/** Minimum appeal to enter curation pool without prestige fixture. */
const POOL_MIN_APPEAL_THRESHOLD = 110;
/** Auto-publish when appeal is high even without strict prestige gate. */
const AUTO_PUBLISH_APPEAL_THRESHOLD = 130;

const CLUB_PRESTIGE_POINTS = 35;
const MARQUEE_BOTH_PRESTIGE_EXTRA = 40;
const NARRATIVE_DERBY_BONUS = 45;
const NARRATIVE_RIVALRY_BONUS = 30;

/** Major derbies — substring match on normalized `home|away` blob. */
const DERBY_NARRATIVE_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["inter", "milan"],
  ["ac milan", "inter"],
  ["roma", "lazio"],
  ["arsenal", "tottenham"],
  ["spurs", "arsenal"],
  ["liverpool", "everton"],
  ["manchester united", "manchester city"],
  ["man united", "man city"],
  ["real madrid", "barcelona"],
  ["barcelona", "real madrid"],
  ["atletico madrid", "real madrid"],
  ["bayern", "dortmund"],
  ["juventus", "torino"],
  ["psg", "marseille"],
];

/** Strong rivalries (non-derby). */
const RIVALRY_NARRATIVE_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["juventus", "inter"],
  ["juventus", "milan"],
  ["liverpool", "manchester united"],
  ["liverpool", "man united"],
  ["arsenal", "chelsea"],
  ["milan", "napoli"],
  ["roma", "napoli"],
  ["benfica", "porto"],
  ["celtic", "rangers"],
];

function normTeamBlob(home: string, away: string): string {
  return ` ${home.toLowerCase()} ${away.toLowerCase()} `;
}

function pairMatchesBlob(blob: string, a: string, b: string): boolean {
  return blob.includes(a) && blob.includes(b);
}

function narrativeBonusFromTeams(home: string, away: string): { bonus: number; isDerby: boolean } {
  const blob = normTeamBlob(home, away);
  for (const [a, b] of DERBY_NARRATIVE_PAIRS) {
    if (pairMatchesBlob(blob, a, b)) return { bonus: NARRATIVE_DERBY_BONUS, isDerby: true };
  }
  for (const [a, b] of RIVALRY_NARRATIVE_PAIRS) {
    if (pairMatchesBlob(blob, a, b)) return { bonus: NARRATIVE_RIVALRY_BONUS, isDerby: false };
  }
  return { bonus: 0, isDerby: false };
}

function teamNamesFromRaw(g: RawAzuroGame | RawForScore): { home: string; away: string } {
  const sorted = sortParticipantsByOrder(
    "participants" in g && g.participants ? g.participants : undefined,
  );
  return {
    home: String(sorted[0]?.name || "").toLowerCase(),
    away: String(sorted[1]?.name || "").toLowerCase(),
  };
}

function sideHasPrestigeClub(teamName: string): boolean {
  const side = ` ${teamName.toLowerCase()} `;
  return PRESTIGE_CLUB_SNIPPETS.some((club) => side.includes(club));
}

/** League tier weights for market appeal (trading narrative). */
export function computeLeagueAppeal(leagueName: string, countryName = ""): number {
  const league = leagueName.toLowerCase();
  const cnt = countryName.toLowerCase();

  if (league.includes("champions league") && !league.includes("afc") && !league.includes("caf"))
    return 120;
  if (league.includes("europa league") && !league.includes("conference")) return 85;
  if (league.includes("conference league")) return 55;
  if (
    league.includes("premier league") &&
    !league.includes("scottish") &&
    !league.includes("northern ireland") &&
    (cnt.includes("england") || cnt.includes("united kingdom"))
  )
    return 95;
  if ((league.includes("la liga") || league.includes("laliga")) && cnt.includes("spain")) return 90;
  if (league.includes("serie a") && cnt.includes("ital")) return 90;
  if (league.includes("bundesliga") && cnt.includes("germany")) return 85;
  if (league.includes("ligue 1") && cnt.includes("france")) return 80;
  if (league.includes("eredivisie") && cnt.includes("netherlands")) return 55;
  if (league.includes("primeira liga") && cnt.includes("portugal")) return 55;
  if (
    league.includes("coppa italia") ||
    league.includes("fa cup") ||
    league.includes("dfb pokal") ||
    league.includes("copa del rey")
  )
    return 70;
  return 25;
}

/** +35 per prestige club; +40 extra when both sides are prestige (marquee). */
export function computeClubAppeal(home: string, away: string): number {
  const homePrestige = sideHasPrestigeClub(home);
  const awayPrestige = sideHasPrestigeClub(away);
  if (!homePrestige && !awayPrestige) return 0;
  let score = 0;
  if (homePrestige) score += CLUB_PRESTIGE_POINTS;
  if (awayPrestige) score += CLUB_PRESTIGE_POINTS;
  if (homePrestige && awayPrestige) score += MARQUEE_BOTH_PRESTIGE_EXTRA;
  return score;
}

export function computeNarrativeAppeal(home: string, away: string): number {
  return narrativeBonusFromTeams(home, away).bonus;
}

export function isDerbyNarrativeMatch(home: string, away: string): boolean {
  return narrativeBonusFromTeams(home, away).isDerby;
}

/** Unpredictability as bonus only (strict / tier1 / tier2). Missing odds → 0. */
export function computeUnpredictabilityBonus(
  homeOdds: number | null,
  awayOdds: number | null,
): number {
  if (homeOdds == null || awayOdds == null) return 0;
  if (
    isEventUnpredictableWithParams(
      homeOdds,
      awayOdds,
      UNPRED_MIN_FAVORITE_ODDS,
      UNPRED_MAX_HOME_AWAY_GAP,
    )
  )
    return 25;
  if (isEventUnpredictableWithParams(homeOdds, awayOdds, 1.38, 2.85)) return 15;
  if (isEventUnpredictableWithParams(homeOdds, awayOdds, 1.28, 3.6)) return 8;
  return 0;
}

function isUefaChampionsLeague(leagueName: string): boolean {
  const ln = leagueName.toLowerCase();
  return ln.includes("champions league") && !ln.includes("afc") && !ln.includes("caf");
}

/**
 * Market Appeal Score — canonical ranking for curation (stored as `importanceScore` in DB).
 * Reversible: set pool gate back to `rawPassesUnpredictability` to restore legacy behavior.
 */
export function computeAppealScore(
  game: RawAzuroGame | RawForScore,
  oddsOverride?: { homeOdds: number | null; drawOdds: number | null; awayOdds: number | null },
): number {
  const leagueName = game.league?.name || "";
  const countryName =
    "country" in (game.league || {}) && game.league && "country" in game.league
      ? String((game.league as { country?: { name?: string } }).country?.name || "")
      : "";
  const { home, away } = teamNamesFromRaw(game);
  const league = computeLeagueAppeal(leagueName, countryName);
  const club = computeClubAppeal(home, away);
  const narrative = computeNarrativeAppeal(home, away);
  const o = oddsOverride ?? extract1x2DecimalOddsFromRawGame(game as RawAzuroGame);
  const unpred = computeUnpredictabilityBonus(o.homeOdds, o.awayOdds);
  return league + club + narrative + unpred;
}

/** League + big-club importance (legacy); prefer `computeAppealScore` for curation. */
export function getImportanceScore(game: RawForScore): number {
  const league = (game.league?.name || "").toLowerCase();
  const sorted = sortParticipantsByOrder(game.participants);
  const home = (sorted[0]?.name || "").toLowerCase();
  const away = (sorted[1]?.name || "").toLowerCase();
  const teams = `${home} ${away}`;

  let score = 0;

  if (league.includes("champions league")) score += 100;
  else if (league.includes("europa league")) score += 80;
  else if (league.includes("conference league")) score += 60;
  else if (league.includes("premier league")) score += 90;
  else if (league.includes("serie a")) score += 85;
  else if (league.includes("la liga") || league.includes("laliga")) score += 85;
  else if (league.includes("bundesliga")) score += 80;
  else if (league.includes("ligue 1")) score += 75;
  else if (league.includes("primeira liga")) score += 60;
  else if (league.includes("eredivisie")) score += 60;
  else if (league.includes("super lig")) score += 55;
  else if (league.includes("fa cup")) score += 65;
  else if (league.includes("coppa italia")) score += 65;
  else if (league.includes("dfb pokal")) score += 65;
  else score += 20;

  const TOP_TEAMS = [
    "real madrid",
    "barcelona",
    "manchester city",
    "manchester united",
    "liverpool",
    "arsenal",
    "chelsea",
    "tottenham",
    "juventus",
    "inter",
    "milan",
    "napoli",
    "roma",
    "lazio",
    "atalanta",
    "bayern",
    "dortmund",
    "psg",
    "atletico",
    "porto",
    "benfica",
    "ajax",
    "celtic",
    "rangers",
    "fenerbahce",
    "galatasaray",
  ];

  for (const team of TOP_TEAMS) {
    if (teams.includes(team)) score += 30;
  }

  return score;
}

export function getImportanceScoreFromNormalized(meta: NormalizedCuratorGame): number {
  return computeAppealScore({
    league: { name: meta.leagueName },
    participants: [
      { name: meta.homeTeam, sortOrder: 0 },
      { name: meta.awayTeam, sortOrder: 1 },
    ],
  });
}

/** Normalize for audit display only. */
export function normalizeLeagueMetadata(leagueName: string, country: string): {
  league: string;
  country: string;
} {
  return {
    league: leagueName.toLowerCase().trim(),
    country: country.toLowerCase().trim(),
  };
}

function normLeagueSlug(slug: string | undefined): string {
  return (slug || "").toLowerCase().trim().replace(/\s+/g, "-");
}

/** Hard reject known false-positive league slugs (no whitelist expansion). */
export type LeagueGateVerdict = {
  passesLeagueGate: boolean;
  rejectionReason: string;
};

function isRejectedLeagueSlug(slug: string): boolean {
  if (!slug) return false;
  const s = normLeagueSlug(slug);
  if (s.includes("brasileir")) return true;
  if (s.includes("serie-b")) return true;
  if (s.includes("austrian") && s.includes("bundesliga")) return true;
  if (s.includes("bundesliga") && s.includes("austria")) return true;
  if (s.includes("premier-division")) return true;
  if (s.includes("premier-league") && s.includes("scottish")) return true;
  if (s.includes("premier-league") && s.includes("northern-ireland")) return true;
  if (s.includes("premier-league") && s.includes("welsh")) return true;
  return false;
}

function slugMatchesTopLeague(slug: string, cnt: string): LeagueGateVerdict | null {
  const s = normLeagueSlug(slug);
  if (!s || isRejectedLeagueSlug(s)) {
    if (s && isRejectedLeagueSlug(s)) {
      return { passesLeagueGate: false, rejectionReason: `slug_rejected:${s}` };
    }
    return null;
  }

  if (s.includes("coppa-italia")) {
    return { passesLeagueGate: true, rejectionReason: "pass:slug_coppa_italia" };
  }
  if (s.includes("supercoppa") && s.includes("ital")) {
    return { passesLeagueGate: true, rejectionReason: "pass:slug_supercoppa_italia" };
  }
  if (s.includes("champions-league") && !s.includes("afc") && !s.includes("caf")) {
    return { passesLeagueGate: true, rejectionReason: "pass:slug_uefa_champions_league" };
  }
  if (s.includes("europa-league") && !s.includes("conference")) {
    return { passesLeagueGate: true, rejectionReason: "pass:slug_uefa_europa_league" };
  }
  if (s.includes("conference-league")) {
    return { passesLeagueGate: true, rejectionReason: "pass:slug_uefa_conference_league" };
  }

  if (s === "serie-a" || s.endsWith("-serie-a") || (s.includes("serie-a") && !s.includes("brasileir"))) {
    if (!cnt.includes("ital")) {
      return { passesLeagueGate: false, rejectionReason: "slug_serie_a_country_not_italy" };
    }
    return { passesLeagueGate: true, rejectionReason: "pass:slug_serie_a" };
  }

  if (s === "premier-league" || (s.includes("premier-league") && !s.includes("scottish"))) {
    if (!(cnt.includes("england") || cnt.includes("united kingdom"))) {
      return {
        passesLeagueGate: false,
        rejectionReason: `slug_premier_league_country_gate:country="${cnt}"`,
      };
    }
    return { passesLeagueGate: true, rejectionReason: "pass:slug_premier_league" };
  }

  if (s === "la-liga" || s === "laliga" || s.includes("la-liga") || s.includes("laliga")) {
    if (!cnt.includes("spain")) {
      return { passesLeagueGate: false, rejectionReason: `slug_la_liga_country_gate:country="${cnt}"` };
    }
    return { passesLeagueGate: true, rejectionReason: "pass:slug_la_liga" };
  }

  if (s === "bundesliga" || (s.includes("bundesliga") && !s.includes("austria"))) {
    if (!cnt.includes("germany")) {
      return {
        passesLeagueGate: false,
        rejectionReason: `slug_bundesliga_country_gate:country="${cnt}"`,
      };
    }
    return { passesLeagueGate: true, rejectionReason: "pass:slug_bundesliga" };
  }

  if (s.includes("ligue-1") || s === "ligue-1") {
    if (!cnt.includes("france")) {
      return { passesLeagueGate: false, rejectionReason: `slug_ligue1_country_gate:country="${cnt}"` };
    }
    return { passesLeagueGate: true, rejectionReason: "pass:slug_ligue_1" };
  }

  if (s.includes("eredivisie")) {
    if (!cnt.includes("netherlands")) {
      return {
        passesLeagueGate: false,
        rejectionReason: `slug_eredivisie_country_gate:country="${cnt}"`,
      };
    }
    return { passesLeagueGate: true, rejectionReason: "pass:slug_eredivisie" };
  }

  if (s.includes("primeira-liga")) {
    if (!cnt.includes("portugal")) {
      return {
        passesLeagueGate: false,
        rejectionReason: `slug_primeira_liga_country_gate:country="${cnt}"`,
      };
    }
    return { passesLeagueGate: true, rejectionReason: "pass:slug_primeira_liga" };
  }

  return null;
}

/**
 * Explains why `isAllowedLeague` accepts or rejects — slug-first when available, then name fallback.
 */
export function explainAllowedLeagueRejection(
  leagueName: string,
  country: string,
  leagueSlug?: string,
): LeagueGateVerdict {
  const league = leagueName.toLowerCase();
  const cnt = country.toLowerCase();
  const slugNorm = normLeagueSlug(leagueSlug);

  if (slugNorm) {
    const slugVerdict = slugMatchesTopLeague(slugNorm, cnt);
    if (slugVerdict) return slugVerdict;
  }

  if (!league) {
    return { passesLeagueGate: false, rejectionReason: "missing_league_name" };
  }

  if (league.includes("brasileir") || league.includes("serie b")) {
    return { passesLeagueGate: false, rejectionReason: "name_brasileir_or_serie_b_excluded" };
  }

  if (league.includes("serie a")) {
    if (!cnt.includes("ital")) {
      return { passesLeagueGate: false, rejectionReason: "serie_a_country_not_italy" };
    }
    return { passesLeagueGate: true, rejectionReason: "pass:serie_a" };
  }
  if (league.includes("coppa italia")) {
    return { passesLeagueGate: true, rejectionReason: "pass:coppa_italia" };
  }
  if (league.includes("supercoppa") && league.includes("ital")) {
    return { passesLeagueGate: true, rejectionReason: "pass:supercoppa_italia" };
  }
  if (
    league.includes("champions league") &&
    !league.includes("afc") &&
    !league.includes("caf")
  ) {
    return { passesLeagueGate: true, rejectionReason: "pass:uefa_champions_league" };
  }
  if (league.includes("europa league")) {
    return { passesLeagueGate: true, rejectionReason: "pass:uefa_europa_league" };
  }
  if (league.includes("conference league")) {
    return { passesLeagueGate: true, rejectionReason: "pass:uefa_conference_league" };
  }

  if (league.includes("premier league")) {
    if (league.includes("scottish")) {
      return { passesLeagueGate: false, rejectionReason: "premier_league_scottish_excluded" };
    }
    if (league.includes("northern ireland")) {
      return { passesLeagueGate: false, rejectionReason: "premier_league_ni_excluded" };
    }
    if (league.includes("premier division")) {
      return { passesLeagueGate: false, rejectionReason: "premier_division_excluded" };
    }
    if (!(cnt.includes("england") || cnt.includes("united kingdom"))) {
      return {
        passesLeagueGate: false,
        rejectionReason: `premier_league_country_gate:country="${country || ""}"`,
      };
    }
    return { passesLeagueGate: true, rejectionReason: "pass:premier_league" };
  }

  if (league.includes("la liga") || league.includes("laliga")) {
    if (!cnt.includes("spain")) {
      return {
        passesLeagueGate: false,
        rejectionReason: `la_liga_country_gate:country="${country || ""}"`,
      };
    }
    return { passesLeagueGate: true, rejectionReason: "pass:la_liga" };
  }

  if (league.includes("bundesliga")) {
    if (cnt.includes("austria") && !cnt.includes("germany")) {
      return { passesLeagueGate: false, rejectionReason: "bundesliga_austria_excluded" };
    }
    if (!cnt.includes("germany")) {
      return {
        passesLeagueGate: false,
        rejectionReason: `bundesliga_country_gate:country="${country || ""}"`,
      };
    }
    return { passesLeagueGate: true, rejectionReason: "pass:bundesliga" };
  }

  if (league.includes("ligue 1")) {
    if (!cnt.includes("france")) {
      return {
        passesLeagueGate: false,
        rejectionReason: `ligue1_country_gate:country="${country || ""}"`,
      };
    }
    return { passesLeagueGate: true, rejectionReason: "pass:ligue_1" };
  }

  if (league.includes("eredivisie")) {
    if (!cnt.includes("netherlands")) {
      return {
        passesLeagueGate: false,
        rejectionReason: `eredivisie_country_gate:country="${country || ""}"`,
      };
    }
    return { passesLeagueGate: true, rejectionReason: "pass:eredivisie" };
  }

  if (league.includes("primeira liga")) {
    if (!cnt.includes("portugal")) {
      return {
        passesLeagueGate: false,
        rejectionReason: `primeira_liga_country_gate:country="${country || ""}"`,
      };
    }
    return { passesLeagueGate: true, rejectionReason: "pass:primeira_liga" };
  }

  return { passesLeagueGate: false, rejectionReason: "league_not_in_whitelist" };
}

/** Italy + UEFA cups + major European domestic (country-gated, slug-aware). */
export function isAllowedLeague(
  leagueName: string,
  country: string,
  leagueSlug?: string,
): boolean {
  return explainAllowedLeagueRejection(leagueName, country, leagueSlug).passesLeagueGate;
}

const KICKOFF_LOCK_BUFFER_SEC = 5 * 60;

export function kickoffSecFromRaw(g: RawAzuroGame): number | null {
  const kickoff = parseInt(String(g.startsAt), 10);
  return Number.isFinite(kickoff) ? kickoff : null;
}

export function lockedAtSecFromRaw(g: RawAzuroGame): number | null {
  const kickoff = kickoffSecFromRaw(g);
  if (kickoff == null) return null;
  return kickoff - KICKOFF_LOCK_BUFFER_SEC;
}

/** Stale Prematch rows: kickoff or derived lock time already passed. */
export function isStalePrematchGame(g: RawAzuroGame, nowSec: number): boolean {
  const kickoff = kickoffSecFromRaw(g);
  if (kickoff != null && kickoff <= nowSec) return true;
  const locked = lockedAtSecFromRaw(g);
  if (locked != null && locked <= nowSec) return true;
  return false;
}

const STALE_PREMATCH_LOG_LIMIT = 30;
const STALE_PREMATCH_LOG_COOLDOWN_MS = 5 * 60 * 1000;
let stalePrematchLogCount = 0;
let stalePrematchLogWindowStart = 0;

function maybeLogStalePrematch(g: RawAzuroGame, nowSec: number): void {
  const nowMs = Date.now();
  if (nowMs - stalePrematchLogWindowStart > STALE_PREMATCH_LOG_COOLDOWN_MS) {
    stalePrematchLogWindowStart = nowMs;
    stalePrematchLogCount = 0;
  }
  if (stalePrematchLogCount >= STALE_PREMATCH_LOG_LIMIT) return;
  stalePrematchLogCount += 1;
  const kickoff = kickoffSecFromRaw(g);
  console.log(
    JSON.stringify({
      tag: "stale_prematch",
      gameId: String(g.gameId ?? "").trim(),
      league: g.league?.name ?? "",
      leagueSlug: g.league?.slug ?? "",
      startsAt: kickoff != null ? new Date(kickoff * 1000).toISOString() : String(g.startsAt ?? ""),
      now: new Date(nowSec * 1000).toISOString(),
    }),
  );
}

function teamLineHasPrestigeClub(g: RawAzuroGame): boolean {
  const sorted = sortParticipants(g.participants);
  const home = String(sorted[0]?.name || "").toLowerCase();
  const away = String(sorted[1]?.name || "").toLowerCase();
  const blob = ` ${home} ${away} `;
  return PRESTIGE_CLUB_SNIPPETS.some((club) => blob.includes(club));
}

/** Serie A / Coppa / Supercoppa IT: solo se c’è almeno un club prestigio. UEFA: stesso filtro o score molto alto (derby di coppe). */
function isPrestigeFixture(item: ScoredItalian): boolean {
  const g = item.raw;
  const ln = String(g.league?.name || "").toLowerCase();
  const cn = String(g.league?.country?.name || "").toLowerCase();
  const uefaCl =
    ln.includes("champions league") && !ln.includes("afc") && !ln.includes("caf");
  const uefaEl = ln.includes("europa league") && !ln.includes("conference");
  const uefaConf = ln.includes("conference league");
  const italianDomestic =
    (ln.includes("serie a") && cn.includes("ital") && !ln.includes("serie b")) ||
    ln.includes("coppa italia") ||
    (ln.includes("supercoppa") && ln.includes("ital"));

  if (italianDomestic) return teamLineHasPrestigeClub(g);
  if (uefaCl || uefaEl || uefaConf) {
    return teamLineHasPrestigeClub(g) || item.importanceScore >= 125;
  }
  return teamLineHasPrestigeClub(g);
}

/** Solo se serve arrivare a 9 eventi: top 5 leghe con paese corretto (no PL “fake”). */
function isFallbackTopFiveLeague(g: RawAzuroGame, importanceScore: number, minScore: number): boolean {
  if (importanceScore < minScore) return false;
  if (!teamLineHasPrestigeClub(g)) return false;
  const ln = String(g.league?.name || "").toLowerCase();
  const cn = String(g.league?.country?.name || "").toLowerCase();
  const pl =
    ln.includes("premier league") &&
    !ln.includes("scottish") &&
    !ln.includes("welsh") &&
    !ln.includes("northern ireland") &&
    (cn.includes("england") || cn.includes("united kingdom"));
  const laliga = (ln.includes("la liga") || ln.includes("laliga")) && cn.includes("spain");
  const bundes = ln.includes("bundesliga") && cn.includes("germany");
  const ligue1 = ln.includes("ligue 1") && cn.includes("france");
  return pl || laliga || bundes || ligue1;
}

const LEAGUE_GATE_AUDIT_LIMIT = 50;
const LEAGUE_GATE_AUDIT_COOLDOWN_MS = 5 * 60 * 1000;
let lastLeagueGateAuditAt = 0;

/** Temporary production audit — set CURATED_LEAGUE_GATE_AUDIT=1 (max 50 rows / 5 min). */
export function logEuropeanLeagueGateAudit(
  upcoming: RawAzuroGame[],
  opts?: { force?: boolean },
): void {
  if (process.env.CURATED_LEAGUE_GATE_AUDIT !== "1" && !opts?.force) return;

  const now = Date.now();
  if (!opts?.force && now - lastLeagueGateAuditAt < LEAGUE_GATE_AUDIT_COOLDOWN_MS) {
    return;
  }
  lastLeagueGateAuditAt = now;

  const sample = [...upcoming]
    .sort((a, b) => parseInt(String(a.startsAt), 10) - parseInt(String(b.startsAt), 10))
    .slice(0, LEAGUE_GATE_AUDIT_LIMIT);

  const rejectionCounts: Record<string, number> = {};
  const leagueCounts: Record<string, number> = {};
  let passCount = 0;

  for (const g of sample) {
    const leagueName = g.league?.name ?? "";
    const countryName = g.league?.country?.name ?? "";
    const verdict = explainAllowedLeagueRejection(
      leagueName,
      countryName,
      g.league?.slug,
    );
    const leagueKey = `${leagueName} | ${countryName}`;
    leagueCounts[leagueKey] = (leagueCounts[leagueKey] ?? 0) + 1;

    if (verdict.passesLeagueGate) {
      passCount += 1;
    } else {
      rejectionCounts[verdict.rejectionReason] =
        (rejectionCounts[verdict.rejectionReason] ?? 0) + 1;
    }

    console.log(
      JSON.stringify({
        tag: "european_league_gate_audit",
        gameId: String(g.gameId ?? "").trim(),
        leagueName,
        countryName,
        sportName: g.sport?.name ?? "",
        sportSlug: g.sport?.slug ?? "",
        leagueSlug: (g.league as { slug?: string } | undefined)?.slug ?? "",
        startsAt: String(g.startsAt ?? ""),
        passesLeagueGate: verdict.passesLeagueGate,
        rejectionReason: verdict.rejectionReason,
      }),
    );
  }

  console.log(
    JSON.stringify({
      tag: "european_league_gate_audit_summary",
      sampleSize: sample.length,
      upcomingTotal: upcoming.length,
      passInSample: passCount,
      rejectInSample: sample.length - passCount,
      topRejectionReasons: Object.entries(rejectionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15),
      topLeagueCountryPairs: Object.entries(leagueCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20),
    }),
  );
}

export type EuropeanUpcomingFilterResult = {
  footballGames: RawAzuroGame[];
  upcoming: RawAzuroGame[];
  europeanGames: RawAzuroGame[];
  stalePrematchRejected: number;
  validFutureFootball: number;
  futureWhitelisted: number;
  futureItalianPool: number;
};

export function filterEuropeanUpcoming(
  rawGames: RawAzuroGame[],
  nowSec: number,
  windowEndSec: number,
): EuropeanUpcomingFilterResult {
  let stalePrematchRejected = 0;
  const liveGames: RawAzuroGame[] = [];

  for (const g of rawGames) {
    if (isStalePrematchGame(g, nowSec)) {
      stalePrematchRejected += 1;
      maybeLogStalePrematch(g, nowSec);
      continue;
    }
    liveGames.push(g);
  }

  const footballGames = liveGames.filter((g) => rawGameIsFootball(g));

  const upcoming = footballGames.filter((g) => {
    const kickoff = kickoffSecFromRaw(g);
    return kickoff != null && kickoff > nowSec && kickoff < windowEndSec;
  });

  logEuropeanLeagueGateAudit(upcoming);

  const europeanGames = upcoming.filter((g) => {
    const leagueName = g.league?.name || "";
    const countryName = g.league?.country?.name || "";
    return isAllowedLeague(leagueName, countryName, g.league?.slug);
  });

  const futureItalianPool = upcoming.filter((g) => isItalianPriorityFixture(g)).length;

  return {
    footballGames,
    upcoming,
    europeanGames,
    stalePrematchRejected,
    validFutureFootball: upcoming.length,
    futureWhitelisted: europeanGames.length,
    futureItalianPool,
  };
}

/** Nomi display (Azuro spesso usa “Inter Milan”). */
function displayTeamName(raw: string): string {
  const t = raw.trim();
  if (/^inter milan$/i.test(t)) return "Inter";
  if (/^fc internazionale milano$/i.test(t)) return "Inter";
  return t;
}

function sortParticipants(parts: unknown) {
  const arr = Array.isArray(parts) ? parts : [];
  return [...arr].sort(
    (a: { sortOrder?: number }, b: { sortOrder?: number }) =>
      Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0),
  ) as Array<{ name?: string; image?: string | null }>;
}

function isEventUnpredictable(homeOdds: number | null, awayOdds: number | null): boolean {
  return isEventUnpredictableWithParams(
    homeOdds,
    awayOdds,
    UNPRED_MIN_FAVORITE_ODDS,
    UNPRED_MAX_HOME_AWAY_GAP,
  );
}

function rawPassesUnpredictabilityLevel(raw: RawAzuroGame, level: 0 | 1 | 2): boolean {
  const o = extract1x2DecimalOddsFromRawGame(raw);
  const tiers = [
    { minF: UNPRED_MIN_FAVORITE_ODDS, maxGap: UNPRED_MAX_HOME_AWAY_GAP },
    { minF: 1.38, maxGap: 2.85 },
    { minF: 1.28, maxGap: 3.6 },
  ];
  const { minF, maxGap } = tiers[level];
  return isEventUnpredictableWithParams(o.homeOdds, o.awayOdds, minF, maxGap);
}

function rawPassesUnpredictability(raw: RawAzuroGame): boolean {
  return rawPassesUnpredictabilityLevel(raw, 0);
}

/**
 * Auto-publish: prestige fixture OR high market appeal (no strict unpredictability gate).
 * `importanceScore` arg should be appeal score from `computeAppealScore`.
 */
export function isAutoPublish(
  raw: RawAzuroGame,
  importanceScore: number,
  oddsOverride?: { homeOdds: number | null; drawOdds: number | null; awayOdds: number | null },
): boolean {
  const appeal =
    importanceScore > 0
      ? importanceScore
      : computeAppealScore(raw, oddsOverride);
  if (isPrestigeFixture({ raw, importanceScore: appeal })) return true;
  return appeal >= AUTO_PUBLISH_APPEAL_THRESHOLD;
}

/** Pool entry: allowed league + (UCL | prestige fixture | appeal >= threshold). */
function qualifiesForAppealPool(g: RawAzuroGame, appealScore: number): boolean {
  const leagueName = g.league?.name || "";
  if (isUefaChampionsLeague(leagueName)) return true;
  if (isPrestigeFixture({ raw: g, importanceScore: appealScore })) return true;
  return appealScore >= POOL_MIN_APPEAL_THRESHOLD;
}

function scoredFromRaw(g: RawAzuroGame): ScoredItalian {
  const appealScore = computeAppealScore(g);
  return { raw: g, importanceScore: appealScore };
}

function logAppealCurationDiagnostics(
  picked: ScoredItalian[],
  sourceForPick: ScoredItalian[],
  baseLog: Record<string, unknown>,
): void {
  const sample = picked.slice(0, 3).map((it) => {
    const sorted = sortParticipants(it.raw.participants);
    const home = displayTeamName(sorted[0]?.name?.trim() || "");
    const away = displayTeamName(sorted[1]?.name?.trim() || "");
    const o = extract1x2DecimalOddsFromRawGame(it.raw);
    return {
      gameId: it.raw.gameId,
      appeal: it.importanceScore,
      league: it.raw.league?.name,
      title: `${home} vs ${away}`,
      unpredBonus: computeUnpredictabilityBonus(o.homeOdds, o.awayOdds),
    };
  });

  let ucl = 0;
  let premier = 0;
  let derby = 0;
  const unpredDist = { b25: 0, b15: 0, b8: 0, b0: 0 };

  for (const it of picked) {
    const ln = String(it.raw.league?.name || "").toLowerCase();
    const cnt = String(it.raw.league?.country?.name || "").toLowerCase();
    if (isUefaChampionsLeague(ln)) ucl += 1;
    if (
      ln.includes("premier league") &&
      !ln.includes("scottish") &&
      (cnt.includes("england") || cnt.includes("united kingdom"))
    )
      premier += 1;
    const sorted = sortParticipants(it.raw.participants);
    const home = sorted[0]?.name?.trim() || "";
    const away = sorted[1]?.name?.trim() || "";
    if (isDerbyNarrativeMatch(home, away)) derby += 1;
    const o = extract1x2DecimalOddsFromRawGame(it.raw);
    const ub = computeUnpredictabilityBonus(o.homeOdds, o.awayOdds);
    if (ub >= 25) unpredDist.b25 += 1;
    else if (ub >= 15) unpredDist.b15 += 1;
    else if (ub >= 8) unpredDist.b8 += 1;
    else unpredDist.b0 += 1;
  }

  const poolAvg =
    sourceForPick.length > 0
      ? Math.round(
          sourceForPick.reduce((s, x) => s + x.importanceScore, 0) / sourceForPick.length,
        )
      : 0;

  console.log(
    JSON.stringify({
      ...baseLog,
      tag: "azuro_curation_appeal",
      poolAvgAppeal: poolAvg,
      pickedUcl: ucl,
      pickedPremier: premier,
      pickedDerby: derby,
      pickedUnpredBonus: unpredDist,
      topAppealPicked: sample,
    }),
  );
}

/** Finestra fino a ~60 giorni così entrano partite “tra un mese” e si riempie il catalogo. */
const LOOKAHEAD_SEC_60D = 60 * 24 * 60 * 60;
const BUCKET_SOON_SEC = 3 * 24 * 60 * 60;
const BUCKET_MID_SEC = 14 * 24 * 60 * 60;

/** Fascia temporale rispetto a `nowSec` (kickoff in secondi). */
export function getTemporalBandForUnix(nowSec: number, kickoffSec: number): "SOON" | "MID" | "LATER" {
  const d = kickoffSec - nowSec;
  if (d <= BUCKET_SOON_SEC) return "SOON";
  if (d <= BUCKET_MID_SEC) return "MID";
  return "LATER";
}

type ScoredItalian = { raw: RawAzuroGame; importanceScore: number };

function byImportanceThenKickoff(a: ScoredItalian, b: ScoredItalian) {
  if (b.importanceScore !== a.importanceScore) return b.importanceScore - a.importanceScore;
  return parseInt(String(a.raw.startsAt), 10) - parseInt(String(b.raw.startsAt), 10);
}

function partitionItalianTemporal(nowSec: number, items: ScoredItalian[]) {
  const soon: ScoredItalian[] = [];
  const mid: ScoredItalian[] = [];
  const later: ScoredItalian[] = [];
  for (const it of items) {
    const k = parseInt(String(it.raw.startsAt), 10);
    if (!Number.isFinite(k)) continue;
    const band = getTemporalBandForUnix(nowSec, k);
    if (band === "SOON") soon.push(it);
    else if (band === "MID") mid.push(it);
    else later.push(it);
  }
  soon.sort(byImportanceThenKickoff);
  mid.sort(byImportanceThenKickoff);
  later.sort(byImportanceThenKickoff);
  return { soon, mid, later };
}

const MIN_ITALIAN_EVENTS = 6;

/** Italian prestige clubs for editorial quota (Serie A narrative; not Serie B by default). */
const ITALIAN_PRESTIGE_CLUB_SNIPPETS = [
  "juventus",
  "inter",
  "milan",
  "roma",
  "lazio",
  "napoli",
  "fiorentina",
  "atalanta",
  "bologna",
] as const;

const UNION_BERLIN_SNIPPETS = ["union berlin", "1. fc union berlin", "fc union berlin"] as const;

function normMeta(s: string): string {
  return s.toLowerCase().trim();
}

function italianPrestigeClubInFixture(raw: RawAzuroGame): boolean {
  const { home, away } = teamNamesFromRaw(raw);
  const blob = normTeamBlob(home, away);
  return ITALIAN_PRESTIGE_CLUB_SNIPPETS.some((club) => blob.includes(club));
}

/** Italy-first editorial fixture (excludes Serie B unless prestige-club override). */
export function isItalianPriorityFixture(raw: RawAzuroGame): boolean {
  const leagueName = normMeta(String(raw.league?.name || ""));
  const countryName = normMeta(String(raw.league?.country?.name || ""));
  const isSerieB =
    leagueName.includes("serie b") && countryName.includes("ital");

  if (leagueName.includes("coppa italia")) return true;

  if (
    leagueName.includes("serie a") &&
    countryName.includes("ital") &&
    !leagueName.includes("serie b")
  ) {
    return true;
  }

  if (italianPrestigeClubInFixture(raw)) return true;

  if (countryName.includes("ital")) {
    if (isSerieB) return false;
    if (leagueName.includes("supercoppa") && leagueName.includes("ital")) return true;
    return true;
  }

  return false;
}

export function isUnionBerlinFixture(raw: RawAzuroGame): boolean {
  const { home, away } = teamNamesFromRaw(raw);
  const blob = `${home} ${away}`;
  return UNION_BERLIN_SNIPPETS.some((s) => blob.includes(s));
}

function scoredGameId(it: ScoredItalian): string {
  return String(it.raw.gameId || "").trim();
}

function kickoffUnix(raw: RawAzuroGame): number {
  return parseInt(String(raw.startsAt), 10);
}

/** Lowest appeal; tie-break toward LATER bucket (sacrificial slot). */
function indexOfEditorialReplacementVictim(
  picked: ScoredItalian[],
  nowSec: number,
  protectedIds: Set<string>,
  opts?: { skipItalianVictims?: boolean },
): number {
  let bestIdx = -1;
  let bestAppeal = Infinity;
  let bestBandPri = -1;

  for (let i = 0; i < picked.length; i++) {
    const it = picked[i];
    const gid = scoredGameId(it);
    if (!gid || protectedIds.has(gid)) continue;
    if (isUnionBerlinFixture(it.raw)) continue;
    if (opts?.skipItalianVictims && isItalianPriorityFixture(it.raw)) continue;

    const appeal = it.importanceScore;
    const band = getTemporalBandForUnix(nowSec, kickoffUnix(it.raw));
    const bandPri = band === "LATER" ? 3 : band === "MID" ? 2 : 1;

    if (appeal < bestAppeal || (appeal === bestAppeal && bandPri > bestBandPri)) {
      bestAppeal = appeal;
      bestBandPri = bandPri;
      bestIdx = i;
    }
  }

  return bestIdx;
}

/**
 * Post-pick editorial: Union Berlin pin + Italy-first quota (pool = valid combined curation pool).
 */
function ensureEditorialPinnedEvents(
  picked: ScoredItalian[],
  pool: ScoredItalian[],
  nowSec: number,
): ScoredItalian[] {
  const MAX = 9;
  let result = [...picked].slice(0, MAX);

  const unionCandidate = pool.find((it) => isUnionBerlinFixture(it.raw));
  if (unionCandidate) {
    const unionGid = scoredGameId(unionCandidate);
    const alreadyIn = result.some((it) => scoredGameId(it) === unionGid);
    if (!alreadyIn && unionGid) {
      const victimIdx = indexOfEditorialReplacementVictim(result, nowSec, new Set());
      if (victimIdx >= 0) {
        result[victimIdx] = unionCandidate;
        console.log(
          JSON.stringify({ tag: "editorial_pin", type: "union_berlin", inserted: true }),
        );
      } else {
        console.log(
          JSON.stringify({ tag: "editorial_pin", type: "union_berlin", inserted: false }),
        );
      }
    } else {
      console.log(
        JSON.stringify({
          tag: "editorial_pin",
          type: "union_berlin",
          inserted: alreadyIn,
          alreadyPresent: alreadyIn,
        }),
      );
    }
  }

  const protectedIds = new Set<string>();
  for (const it of result) {
    if (isUnionBerlinFixture(it.raw)) {
      const gid = scoredGameId(it);
      if (gid) protectedIds.add(gid);
    }
  }

  const italianPool = pool
    .filter((it) => isItalianPriorityFixture(it.raw))
    .sort(byImportanceThenKickoff);
  const availableItalianPool = italianPool.length;

  let italianCount = result.filter((it) => isItalianPriorityFixture(it.raw)).length;

  for (const candidate of italianPool) {
    if (italianCount >= MIN_ITALIAN_EVENTS) break;
    const gid = scoredGameId(candidate);
    if (!gid || result.some((it) => scoredGameId(it) === gid)) continue;

    const victimIdx = indexOfEditorialReplacementVictim(result, nowSec, protectedIds, {
      skipItalianVictims: true,
    });
    if (victimIdx < 0) break;

    result[victimIdx] = candidate;
    italianCount += 1;
  }

  console.log(
    JSON.stringify({
      tag: "editorial_quota",
      italianPicked: italianCount,
      target: MIN_ITALIAN_EVENTS,
      availableItalianPool,
    }),
  );

  result.sort(byImportanceThenKickoff);
  return result.slice(0, MAX);
}

/** Max 9: top 3 per fascia (SOON/MID/LATER), poi compensazione dal pool globale per importanza. */
function pickDistributedNineFromBuckets(source: ScoredItalian[], soon: ScoredItalian[], mid: ScoredItalian[], later: ScoredItalian[]) {
  const MAX = 9;
  const PER = 3;
  const selectedIds = new Set<string>();
  const picked: ScoredItalian[] = [];

  function takeFrom(arr: ScoredItalian[], n: number) {
    for (const it of arr) {
      if (n <= 0) break;
      const gid = String(it.raw.gameId || "").trim();
      if (!gid || selectedIds.has(gid)) continue;
      selectedIds.add(gid);
      picked.push(it);
      n--;
    }
  }

  takeFrom(soon, PER);
  takeFrom(mid, PER);
  takeFrom(later, PER);

  const pool = [...source]
    .filter((it) => {
      const gid = String(it.raw.gameId || "").trim();
      return gid && !selectedIds.has(gid);
    })
    .sort(byImportanceThenKickoff);

  while (picked.length < MAX && pool.length > 0) {
    const it = pool.shift()!;
    const gid = String(it.raw.gameId || "").trim();
    if (selectedIds.has(gid)) continue;
    selectedIds.add(gid);
    picked.push(it);
  }

  return picked;
}

/**
 * Fetch Azuro Prematch games, filter football ~60d + allowed leagues,
 * rank by Market Appeal Score (unpredictability = bonus, not gate), pick 9 across SOON/MID/LATER.
 */
export async function buildEuropeanCurationGamesPayload(selectedGameIds: Set<string>): Promise<{
  games: CurationGamePayload[];
  diagnostics: {
    totalFromAzuro: number;
    footballGames: number;
    footballInWindowCount: number;
    europeanLeagueGateCount: number;
    afterPrestigeStrictUnpred: number;
    combinedPoolSize: number;
    topMatchScoreOver80: number;
    pickedCount: number;
  };
}> {
  const nowSec = Math.floor(Date.now() / 1000);
  const windowEndSec = nowSec + LOOKAHEAD_SEC_60D;

  const allGames = await fetchAzuroGames({ minStartsAtSec: nowSec });
  const {
    footballGames,
    upcoming,
    europeanGames,
    stalePrematchRejected,
    validFutureFootball,
    futureWhitelisted,
    futureItalianPool,
  } = filterEuropeanUpcoming(allGames, nowSec, windowEndSec);

  const allowedPool: ScoredItalian[] = [];
  for (const g of europeanGames) {
    const item = scoredFromRaw(g);
    if (!qualifiesForAppealPool(g, item.importanceScore)) continue;
    allowedPool.push(item);
  }
  allowedPool.sort(byImportanceThenKickoff);

  const seenGid = (it: ScoredItalian) => String(it.raw.gameId || "").trim();
  const combinedPool: ScoredItalian[] = [...allowedPool];
  const seen = new Set(combinedPool.map(seenGid).filter(Boolean));
  const TARGET_POOL = 36;

  const fillFallback = (minAppeal: number) => {
    for (const g of upcoming) {
      if (combinedPool.length >= TARGET_POOL) break;
      const item = scoredFromRaw(g);
      if (!isFallbackTopFiveLeague(g, item.importanceScore, minAppeal)) continue;
      if (!qualifiesForAppealPool(g, item.importanceScore)) continue;
      const gid = String(g.gameId || "").trim();
      if (!gid || seen.has(gid)) continue;
      seen.add(gid);
      combinedPool.push(item);
    }
    combinedPool.sort(byImportanceThenKickoff);
  };
  if (combinedPool.length < TARGET_POOL) fillFallback(72);
  if (combinedPool.length < TARGET_POOL) fillFallback(60);

  const relaxIntoPool = (cap: number) => {
    for (const g of upcoming) {
      if (combinedPool.length >= cap) break;
      const leagueName = g.league?.name || "";
      const country = g.league?.country?.name || "";
      const item = scoredFromRaw(g);
      if (
        !isAllowedLeague(leagueName, country, g.league?.slug) &&
        !isFallbackTopFiveLeague(g, item.importanceScore, 52)
      )
        continue;
      if (!qualifiesForAppealPool(g, item.importanceScore)) continue;
      const gid = String(g.gameId || "").trim();
      if (!gid || seen.has(gid)) continue;
      seen.add(gid);
      combinedPool.push(item);
    }
    combinedPool.sort(byImportanceThenKickoff);
  };
  if (combinedPool.length < TARGET_POOL) relaxIntoPool(48);
  if (combinedPool.length < TARGET_POOL) relaxIntoPool(56);

  const MAX_SOURCE = 120;
  const sourceForPick = combinedPool.slice(0, MAX_SOURCE);

  const { soon: soonEvents, mid: midEvents, later: laterEvents } = partitionItalianTemporal(
    nowSec,
    sourceForPick,
  );

  const bucketPicked = pickDistributedNineFromBuckets(
    sourceForPick,
    soonEvents,
    midEvents,
    laterEvents,
  );

  const picked = ensureEditorialPinnedEvents(bucketPicked, combinedPool, nowSec);

  const topOver80 = sourceForPick.filter((x) => x.importanceScore > 80).length;
  const editorialItalian = picked.filter((it) => isItalianPriorityFixture(it.raw)).length;
  const unionBerlinPresent = picked.some((it) => isUnionBerlinFixture(it.raw));

  const pipelineLog = {
    tag: "azuro_curation_pipeline",
    rawIndexer: allGames.length,
    stalePrematchRejected,
    afterFootballFilter: footballGames.length,
    validFutureFootball,
    upcomingIn60d: upcoming.length,
    futureWhitelisted,
    futureItalianPool,
    europeanLeagueGate: europeanGames.length,
    afterPrestigeStrictUnpred: allowedPool.length,
    combinedPool: combinedPool.length,
    sourceForPick: sourceForPick.length,
    soonBucket: soonEvents.length,
    midBucket: midEvents.length,
    laterBucket: laterEvents.length,
    picked: picked.length,
    editorialItalian,
    unionBerlinPresent,
  };
  console.log(JSON.stringify(pipelineLog));
  logAppealCurationDiagnostics(picked, sourceForPick, pipelineLog);

  const games: CurationGamePayload[] = picked.map(({ raw: g, importanceScore }) => {
    const sorted = sortParticipants(g.participants);
    const kickoff = parseInt(String(g.startsAt), 10);
    const gid = String(g.gameId || "").trim();
    const homeTeam = displayTeamName(sorted[0]?.name?.trim() || "TBD");
    const awayTeam = displayTeamName(sorted[1]?.name?.trim() || "TBD");
    const rawTitle = typeof g.title === "string" ? g.title.trim() : "";
    const title =
      rawTitle.length > 0
        ? rawTitle
            .replace(/Inter\s+Milan/gi, "Inter")
            .replace(/FC\s+Internazionale\s+Milano/gi, "Inter")
        : `${homeTeam} vs ${awayTeam}`;
    const autoP = isAutoPublish(g, importanceScore);
    const odds = extract1x2DecimalOddsFromRawGame(g);
    const temporalBand = getTemporalBandForUnix(nowSec, kickoff);

    return {
      id: gid,
      gameId: gid,
      title,
      sport: "football",
      sportSlug: "football",
      competition: g.league?.name || "",
      leagueName: g.league?.name || "",
      country: g.league?.country?.name || "",
      homeTeam,
      awayTeam,
      homeImage: sorted[0]?.image ?? null,
      awayImage: sorted[1]?.image ?? null,
      startsAt: new Date(kickoff * 1000).toISOString(),
      startsAtUnix: kickoff,
      status: "OPEN",
      isSelected: selectedGameIds.has(gid),
      importanceScore,
      autoPublish: autoP,
      homeOdds: odds.homeOdds,
      drawOdds: odds.drawOdds,
      awayOdds: odds.awayOdds,
      temporalBand,
    };
  });

  return {
    games,
    diagnostics: {
      totalFromAzuro: allGames.length,
      footballGames: footballGames.length,
      footballInWindowCount: upcoming.length,
      europeanLeagueGateCount: europeanGames.length,
      afterPrestigeStrictUnpred: allowedPool.length,
      combinedPoolSize: combinedPool.length,
      topMatchScoreOver80: topOver80,
      pickedCount: games.length,
    },
  };
}
