import {
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

function normLeague(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

const BLACKLIST_LEAGUES = [
  "copa libertadores",
  "copa sudamericana",
  "copa do nordeste",
  "copa de la liga",
  "botola",
  "brasileirao",
  "serie a brasileira",
  "campeonato brasileiro",
  "liga mx",
  "mls",
  "saudi",
  "chinese",
  "japan",
  "australia",
  "argentina",
  "colombia",
  "chile",
  "peru",
  "venezuela",
  "ecuador",
  "bolivia",
  "paraguay",
  "uruguay",
  "morocco",
  "egypt",
  "algeria",
  "tunisia",
  "nigeria",
  "south africa",
  "ghana",
  "kenya",
  "tanzania",
  "india",
  "uae",
  "qatar",
  "iran",
  "iraq",
  "korea",
  "thailand",
  "indonesia",
  "malaysia",
  "brazil",
  "brasil",
  "mexico",
  "united states",
  "bangladesh",
  "pakistan",
  "sri lanka",
  "nepal",
  "myanmar",
  "cambodia",
  "singapore",
  "hong kong",
  "botswana",
  "zimbabwe",
  "uganda",
  "zambia",
];

const EUROPEAN_COUNTRY_TOKENS = [
  "albania",
  "andorra",
  "armenia",
  "austria",
  "azerbaijan",
  "belarus",
  "belgium",
  "bosnia",
  "herzegovina",
  "bosnia and herzegovina",
  "bulgaria",
  "croatia",
  "cyprus",
  "czech republic",
  "czechia",
  "czech",
  "denmark",
  "england",
  "estonia",
  "faroe islands",
  "faroes",
  "faroe",
  "finland",
  "france",
  "georgia",
  "germany",
  "gibraltar",
  "great britain",
  "greece",
  "guernsey",
  "holland",
  "holy see",
  "hungary",
  "iceland",
  "ireland",
  "isle of man",
  "italy",
  "jersey",
  "kazakhstan",
  "kosovo",
  "latvia",
  "liechtenstein",
  "lithuania",
  "luxembourg",
  "malta",
  "moldova",
  "monaco",
  "montenegro",
  "netherlands",
  "north macedonia",
  "macedonia",
  "northern ireland",
  "norway",
  "poland",
  "portugal",
  "republic of ireland",
  "romania",
  "russia",
  "san marino",
  "scotland",
  "serbia",
  "slovakia",
  "slovenia",
  "spain",
  "sweden",
  "switzerland",
  "turkey",
  "turkiye",
  "ukraine",
  "united kingdom",
  "vatican",
  "wales",
];

const WHITELIST_LEAGUES = [
  "uefa champions league",
  "champions league",
  "uefa europa league",
  "europa league",
  "uefa conference league",
  "conference league",
  "uefa super cup",
  "supercoppa uefa",
  "uefa super",
  "uefa youth league",
  "women champions league",
  "womens champions league",
  "women euro",
  "womens euro",
  "serie a",
  "serie b",
  "premier league",
  "premiership",
  "scottish premiership",
  "welsh premiership",
  "la liga",
  "laliga",
  "laliga hypermotion",
  "segunda",
  "bundesliga",
  "2. bundesliga",
  "3. liga",
  "ligue 1",
  "ligue 2",
  "coppa italia",
  "supercoppa italia",
  "fa cup",
  "efl cup",
  "community shield",
  "copa del rey",
  "supercopa de espana",
  "dfb pokal",
  "supercup",
  "coupe de france",
  "coupe de la ligue",
  "trophee des champions",
  "trophée des champions",
  "primeira liga",
  "liga portugal",
  "taça de portugal",
  "eredivisie",
  "knvb beker",
  "super lig",
  "turkish cup",
  "pro league",
  "jupiler",
  "championship",
  "league one",
  "league two",
  "national league",
  "super league",
  "swiss super league",
  "austrian bundesliga",
  "russian premier",
  "ukrainian premier",
  "greek super league",
  "superliga",
  "eliteserien",
  "allsvenskan",
  "veikkausliiga",
  "ekstraklasa",
  "first league",
  "liga i",
  "fortuna liga",
  "prvaliga",
  "hnb",
  "czech first league",
  "uefa euro",
  "european championship",
  "euro qualifying",
  "nations league",
  "european qualification",
  "wc qualification europe",
  "world cup qualification",
  "uefa nations",
  "uefa",
];

function filterEuropeanUpcoming(rawGames: RawAzuroGame[], nowSec: number, fifteenDaysSec: number) {
  const footballGames = rawGames.filter((g) => g.sport?.slug === "football");

  const upcoming = footballGames.filter((g) => {
    const kickoff = parseInt(String(g.startsAt), 10);
    return Number.isFinite(kickoff) && kickoff > nowSec && kickoff < fifteenDaysSec;
  });

  const europeanGames = upcoming.filter((g) => {
    const leagueName = g.league?.name || "";
    const countryName = g.league?.country?.name || "";
    const combined = normLeague(`${leagueName} ${countryName}`);
    const countryNorm = normLeague(countryName);

    const isBlacklisted = BLACKLIST_LEAGUES.some((b) => combined.includes(normLeague(b)));
    if (isBlacklisted) return false;

    const isWhitelisted = WHITELIST_LEAGUES.some((w) => combined.includes(normLeague(w)));
    if (isWhitelisted) return true;

    return EUROPEAN_COUNTRY_TOKENS.some((c) => countryNorm.includes(normLeague(c)));
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

/**
 * Fetch Azuro Prematch games (no date in GraphQL), filter to EU football in the next 15 days,
 * rank by importanceScore, attach autoPublish.
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
  const now = Math.floor(Date.now() / 1000);
  const fifteenDays = now + 15 * 24 * 60 * 60;

  const allGames = await fetchAzuroGames();
  const { footballGames, europeanGames } = filterEuropeanUpcoming(allGames, now, fifteenDays);

  const rankedEuropean = europeanGames.map((g) => ({
    raw: g,
    importanceScore: getImportanceScore(g),
  }));

  rankedEuropean.sort((a, b) => {
    if (b.importanceScore !== a.importanceScore) {
      return b.importanceScore - a.importanceScore;
    }
    return parseInt(String(a.raw.startsAt), 10) - parseInt(String(b.raw.startsAt), 10);
  });

  const topOver80 = rankedEuropean.filter((x) => x.importanceScore > 80).length;

  const games: CurationGamePayload[] = rankedEuropean.map(({ raw: g, importanceScore }) => {
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
    };
  });

  return {
    games,
    diagnostics: {
      totalFromAzuro: allGames.length,
      footballGames: footballGames.length,
      footballInWindowCount: rankedEuropean.length,
      topMatchScoreOver80: topOver80,
    },
  };
}
