import {
  extract1x2DecimalOddsFromRawGame,
  fetchAzuroGames,
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

/** League + big-club importance for Event Curation ordering */
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

export function isAutoPublish(raw: RawAzuroGame, importanceScore: number): boolean {
  const league = (raw.league?.name || "").toLowerCase();
  const title = (raw.title || "").toLowerCase();

  const TOP_KEYWORDS = [
    "final",
    "finale",
    "semifinal",
    "semi-final",
    "quarter",
    "quarti",
    "semifinale",
    "champions league",
    "europa league final",
  ];

  const isTopEvent = TOP_KEYWORDS.some((k) => title.includes(k) || league.includes(k));

  const isTopLeague = ["champions league", "europa league"].some((l) => league.includes(l));

  return isTopEvent || (isTopLeague && importanceScore > 90);
}

export function getImportanceScoreFromNormalized(meta: NormalizedCuratorGame): number {
  return getImportanceScore({
    league: { name: meta.leagueName },
    participants: [
      { name: meta.homeTeam, sortOrder: 0 },
      { name: meta.awayTeam, sortOrder: 1 },
    ],
  });
}

/** UNICO filtro leghe per la curation (Serie A IT + Coppa Italia + coppe UEFA). */
export function isAllowedLeague(leagueName: string, country: string): boolean {
  const league = leagueName.toLowerCase();
  const cnt = country.toLowerCase();

  if (league.includes("serie a") && cnt.includes("ital")) return true;
  if (league.includes("coppa italia")) return true;
  /** Es. "AFC Champions League" contiene "champions league" ma non è UEFA. */
  if (league.includes("champions league") && !league.includes("afc") && !league.includes("caf"))
    return true;
  if (league.includes("europa league")) return true;
  if (league.includes("conference league")) return true;

  return false;
}

function filterEuropeanUpcoming(rawGames: RawAzuroGame[], nowSec: number, windowEndSec: number) {
  const footballGames = rawGames.filter((g) => g.sport?.slug === "football");

  const upcoming = footballGames.filter((g) => {
    const kickoff = parseInt(String(g.startsAt), 10);
    return Number.isFinite(kickoff) && kickoff > nowSec && kickoff < windowEndSec;
  });

  const europeanGames = upcoming.filter((g) => {
    const leagueName = g.league?.name || "";
    const countryName = g.league?.country?.name || "";
    return isAllowedLeague(leagueName, countryName);
  });

  return { footballGames, upcoming, europeanGames };
}

function sortParticipants(parts: unknown) {
  const arr = Array.isArray(parts) ? parts : [];
  return [...arr].sort(
    (a: { sortOrder?: number }, b: { sortOrder?: number }) =>
      Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0),
  ) as Array<{ name?: string; image?: string | null }>;
}

function isEventUnpredictable(homeOdds: number | null, awayOdds: number | null): boolean {
  if (homeOdds == null || awayOdds == null) return true;
  if (!homeOdds || !awayOdds) return true;
  const favorite = Math.min(homeOdds, awayOdds);
  const gap = Math.abs(homeOdds - awayOdds);
  if (favorite < 1.5) return false;
  if (gap > 2.0) return false;
  return true;
}

const LOOKAHEAD_SEC_30D = 30 * 24 * 60 * 60;
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

function buildSourceUpToNine(pool: ScoredItalian[], passUnpred: (x: ScoredItalian) => boolean): ScoredItalian[] {
  const seen = new Set<string>();
  const out: ScoredItalian[] = [];
  const take = (arr: ScoredItalian[]) => {
    for (const it of arr) {
      if (out.length >= 9) return;
      const gid = String(it.raw.gameId || "").trim();
      if (!gid || seen.has(gid)) continue;
      seen.add(gid);
      out.push(it);
    }
  };
  take(pool.filter(passUnpred));
  take(pool);
  return out;
}

/**
 * Fetch Azuro Prematch games (no date in GraphQL `where`), filter in JS a football nei prossimi 30 giorni,
 * solo leghe consentite (Serie A IT, Coppa Italia, Champions/Europa/Conference), imprevedibilità, SOON/MID/LATER, max 9.
 */
export async function buildEuropeanCurationGamesPayload(selectedGameIds: Set<string>): Promise<{
  games: CurationGamePayload[];
  diagnostics: {
    totalFromAzuro: number;
    footballGames: number;
    footballInWindowCount: number;
    topMatchScoreOver80: number;
  };
}> {
  const nowSec = Math.floor(Date.now() / 1000);
  const windowEndSec = nowSec + LOOKAHEAD_SEC_30D;

  const allGames = await fetchAzuroGames();
  const { footballGames, europeanGames } = filterEuropeanUpcoming(allGames, nowSec, windowEndSec);

  const allowedPool: ScoredItalian[] = [];
  for (const g of europeanGames) {
    const importanceScore = getImportanceScore(g);
    allowedPool.push({ raw: g, importanceScore });
  }
  allowedPool.sort(byImportanceThenKickoff);

  console.log(`[curation] allowed leagues pool: ${allowedPool.length} eventi`);

  const passUnpred = (x: ScoredItalian) => {
    const o = extract1x2DecimalOddsFromRawGame(x.raw);
    return isEventUnpredictable(o.homeOdds, o.awayOdds);
  };

  const sourceForPick = buildSourceUpToNine(allowedPool, passUnpred);

  const { soon: soonEvents, mid: midEvents, later: laterEvents } = partitionItalianTemporal(
    nowSec,
    sourceForPick,
  );
  console.log(`[curation] SOON: ${soonEvents.length} eventi`);
  console.log(`[curation] MID: ${midEvents.length} eventi`);
  console.log(`[curation] LATER: ${laterEvents.length} eventi`);

  const picked = pickDistributedNineFromBuckets(
    sourceForPick,
    soonEvents,
    midEvents,
    laterEvents,
  );
  console.log(
    `[curation] Pool totale: ${sourceForPick.length} → selezionati: ${picked.length}`,
  );

  const topOver80 = sourceForPick.filter((x) => x.importanceScore > 80).length;

  const games: CurationGamePayload[] = picked.map(({ raw: g, importanceScore }) => {
    const sorted = sortParticipants(g.participants);
    const kickoff = parseInt(String(g.startsAt), 10);
    const gid = String(g.gameId || "").trim();
    const homeTeam = sorted[0]?.name?.trim() || "TBD";
    const awayTeam = sorted[1]?.name?.trim() || "TBD";
    const title =
      typeof g.title === "string" && g.title.trim().length > 0
        ? g.title.trim()
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
      footballInWindowCount: games.length,
      topMatchScoreOver80: topOver80,
    },
  };
}
