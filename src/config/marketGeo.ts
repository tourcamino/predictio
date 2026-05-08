export type CountryCode = 'IT' | 'US' | 'GB' | 'ES' | 'FR' | 'DE' | 'BR' | 'AR' | 'NL' | 'PT' | 'TR';

export const COUNTRY_LABEL: Record<CountryCode, string> = {
  IT: 'Italy',
  US: 'United States',
  GB: 'United Kingdom',
  ES: 'Spain',
  FR: 'France',
  DE: 'Germany',
  BR: 'Brazil',
  AR: 'Argentina',
  NL: 'Netherlands',
  PT: 'Portugal',
  TR: 'Turkey',
};

export const COUNTRY_FLAG: Record<CountryCode, string> = {
  IT: '🇮🇹',
  US: '🇺🇸',
  GB: '🇬🇧',
  ES: '🇪🇸',
  FR: '🇫🇷',
  DE: '🇩🇪',
  BR: '🇧🇷',
  AR: '🇦🇷',
  NL: '🇳🇱',
  PT: '🇵🇹',
  TR: '🇹🇷',
};

export const COUNTRY_OPTIONS: readonly CountryCode[] = [
  'IT',
  'GB',
  'US',
  'ES',
  'FR',
  'DE',
  'NL',
  'PT',
  'TR',
  'BR',
  'AR',
] as const;

/**
 * Stable "Elite / World Class" set.
 * Keep it JSON-like (data-first) so it’s easy to extend later.
 */
export const ELITE_COMPETITIONS = [
  'champions-league',
  'premier-league',
  'nba',
  'nfl',
  'ufc',
  'formula-1',
] as const;

/**
 * Map competition slug -> country.
 * Add new sports/regions by extending this object only.
 */
export const COMPETITION_COUNTRY: Record<string, CountryCode> = {
  'serie-a': 'IT',
  'coppa-italia': 'IT',
  'premier-league': 'GB',
  'la-liga': 'ES',
  'ligue-1': 'FR',
  bundesliga: 'DE',
  'eredivisie': 'NL',
  'primeira-liga': 'PT',
  'super-lig': 'TR',
  mls: 'US',
  nba: 'US',
  nfl: 'US',
  'copa-libertadores': 'BR',
  'argentina-primera': 'AR',
};

/** Supports seed `Market.league` and API-shaped competition fields. */
export type MarketGeoLike = {
  competitionSlug?: string;
  competition?: string;
  league?: string;
};

function normalizeCompetitionSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getCompetitionSlug(market: MarketGeoLike) {
  const raw = (market.competitionSlug || market.competition || market.league || '').toString().trim();
  return normalizeCompetitionSlug(raw);
}

export function getMarketCountryCode(market: MarketGeoLike): CountryCode | null {
  const slug = getCompetitionSlug(market);
  return COMPETITION_COUNTRY[slug] ?? null;
}

export function isEliteMarket(market: MarketGeoLike) {
  const slug = getCompetitionSlug(market);
  return (ELITE_COMPETITIONS as readonly string[]).includes(slug);
}

/** Cups & international windows — slug or league name match (API slugs vary). */
const MAJOR_TOURNAMENT_SLUGS = new Set([
  "champions-league",
  "world-cup",
  "fifa-world-cup",
  "uefa-euro",
  "european-championship",
  "copa-america",
  "copa-libertadores",
  "europa-league",
  "wc-qualifiers",
  "africa-cup-of-nations",
  "afc-asian-cup",
  "gold-cup",
  "nations-league",
  "uefa-nations-league",
]);

const MAJOR_NAME_MARKERS = [
  "champions league",
  "world cup",
  "european championship",
  "copa america",
  "copa libertadores",
  "europa league",
  "nations league",
  "euro 202",
  "euro 20",
  "africa cup",
  "asian cup",
  "gold cup",
  "fifa",
];

export function isMajorTournamentMarket(
  market: MarketGeoLike & { competition?: string },
): boolean {
  const slug = getCompetitionSlug(market);
  if (MAJOR_TOURNAMENT_SLUGS.has(slug)) return true;
  const n = (market.competition || "").toLowerCase();
  return MAJOR_NAME_MARKERS.some((m) => n.includes(m));
}

