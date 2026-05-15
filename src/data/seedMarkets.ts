export interface SeedMarket {
  id: string;
  question: string;
  sport: string;
  sportEmoji: string;
  competition: string;
  competitionSlug: string;
  event: {
    name: string;
    slug: string;
    startsAt: string;
    /** Trading locks at kickoff — defaults to startsAt when synced from Azuro. */
    lockedAt?: string;
    teams: string[];
    location?: string;
  };
  outcomes: Array<{
    id: string;
    label: string;
    price: number;
    volume24h: number;
  }>;
  volume24h: number;
  liquidity: number;
  traders: number;
  status: 'live' | 'upcoming' | 'ending-soon' | 'locked' | 'resolved';
  createdAt: string;
  creator: string;
  resolutionSources: string[];
  endsAt: string;
  description?: string;
  isFeatured?: boolean;
  /** Curated catalog appeal score from GET /api/markets. */
  importanceScore?: number;
}

/** Intenzionalmente vuoto: niente mock come dati primari (solo API curata / Azuro). */
export const SEED_MARKETS: SeedMarket[] = [];
