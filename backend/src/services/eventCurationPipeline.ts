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

export function getImportanceScoreFromNormalized(meta: NormalizedCuratorGame): number {
  return getImportanceScore({
    league: { name: meta.leagueName },
    participants: [
      { name: meta.homeTeam, sortOrder: 0 },
      { name: meta.awayTeam, sortOrder: 1 },
    ],
  });
}

/** Leghe prioritarie (solo Serie A IT + coppe italiane top + coppe UEFA). Niente Serie B. */
export function isAllowedLeague(leagueName: string, country: string): boolean {
  const league = leagueName.toLowerCase();
  const cnt = country.toLowerCase();

  if (league.includes("serie a") && cnt.includes("ital")) return true;
  if (league.includes("coppa italia")) return true;
  if (league.includes("supercoppa") && league.includes("ital")) return true;
  /** Es. "AFC Champions League" contiene "champions league" ma non è UEFA. */
  if (league.includes("champions league") && !league.includes("afc") && !league.includes("caf"))
    return true;
  if (league.includes("europa league")) return true;
  if (league.includes("conference league")) return true;

  return false;
}

/** Club “prestigio” (top leghe + big Serie A / UEFA). Match su sottostringa nome squadra Azuro. */
const PRESTIGE_CLUB_SNIPPETS = [
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

/** Mercato 1X2 “bilanciato”: niente big favorite ovvia, quote 1 e 2 vicine. Senza prezzi validi → escluso (serve al modello economico). */
const UNPRED_MIN_FAVORITE_ODDS = 1.5;
const UNPRED_MAX_HOME_AWAY_GAP = 2.0;

function isEventUnpredictable(homeOdds: number | null, awayOdds: number | null): boolean {
  if (homeOdds == null || awayOdds == null) return false;
  if (!(homeOdds > 1) || !(awayOdds > 1)) return false;
  const favorite = Math.min(homeOdds, awayOdds);
  const gap = Math.abs(homeOdds - awayOdds);
  if (favorite < UNPRED_MIN_FAVORITE_ODDS) return false;
  if (gap > UNPRED_MAX_HOME_AWAY_GAP) return false;
  return true;
}

function rawPassesUnpredictability(raw: RawAzuroGame): boolean {
  const o = extract1x2DecimalOddsFromRawGame(raw);
  return isEventUnpredictable(o.homeOdds, o.awayOdds);
}

/**
 * Job auto-publish + flag DB: stessi criteri della curazione europea (club prestigio + mercato 1X2 bilanciato).
 * Italia + UEFA + fallback top‑5 estero: usa `isPrestigeFixture` come nel pool.
 * Se `raw` non ha `conditions` (es. stub admin), passare `oddsOverride` da `fetchAzuro1x2DecimalOddsByGameId`.
 */
export function isAutoPublish(
  raw: RawAzuroGame,
  importanceScore: number,
  oddsOverride?: { homeOdds: number | null; drawOdds: number | null; awayOdds: number | null },
): boolean {
  if (!isPrestigeFixture({ raw, importanceScore })) return false;
  const o = oddsOverride ?? extract1x2DecimalOddsFromRawGame(raw);
  return isEventUnpredictable(o.homeOdds, o.awayOdds);
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
 * Fetch Azuro Prematch games (no date in GraphQL `where`), filter in JS a football nei prossimi ~60 giorni,
 * leghe prioritarie + fallback top-5 se serve arrivare a 9, **solo** partite con 1X2 poco prevedibile (quote bilanciate),
 * SOON/MID/LATER, max 9.
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
  const windowEndSec = nowSec + LOOKAHEAD_SEC_60D;

  const allGames = await fetchAzuroGames();
  const { footballGames, upcoming, europeanGames } = filterEuropeanUpcoming(allGames, nowSec, windowEndSec);

  const allowedPool: ScoredItalian[] = [];
  for (const g of europeanGames) {
    const importanceScore = getImportanceScore(g);
    const item: ScoredItalian = { raw: g, importanceScore };
    if (!isPrestigeFixture(item)) continue;
    if (!rawPassesUnpredictability(g)) continue;
    allowedPool.push(item);
  }
  allowedPool.sort(byImportanceThenKickoff);

  const seenGid = (it: ScoredItalian) => String(it.raw.gameId || "").trim();
  const combinedPool: ScoredItalian[] = [...allowedPool];
  const seen = new Set(combinedPool.map(seenGid).filter(Boolean));
  const fillFallback = (minScore: number) => {
    for (const g of upcoming) {
      if (combinedPool.length >= 9) break;
      const importanceScore = getImportanceScore(g);
      if (!isFallbackTopFiveLeague(g, importanceScore, minScore)) continue;
      if (!rawPassesUnpredictability(g)) continue;
      const gid = String(g.gameId || "").trim();
      if (!gid || seen.has(gid)) continue;
      seen.add(gid);
      combinedPool.push({ raw: g, importanceScore });
    }
    combinedPool.sort(byImportanceThenKickoff);
  };
  if (combinedPool.length < 9) fillFallback(72);
  if (combinedPool.length < 9) fillFallback(60);

  console.log(
    `[curation] primary pool: ${allowedPool.length}, con fallback top-5: ${combinedPool.length} eventi ` +
      `(tutti con 1X2 “bilanciato”: favorite ≥${UNPRED_MIN_FAVORITE_ODDS}, |H−A| ≤${UNPRED_MAX_HOME_AWAY_GAP})`,
  );

  const MAX_SOURCE = 72;
  const sourceForPick = combinedPool.slice(0, MAX_SOURCE);

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
      footballInWindowCount: games.length,
      topMatchScoreOver80: topOver80,
    },
  };
}
