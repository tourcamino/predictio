/**
 * Football Focus Configuration
 * 
 * This config enables the "Football Focus" phase of the product.
 * When ENABLED is true, the platform shows only football markets
 * and hides all other sports from the UI.
 * 
 * To revert to multi-sport:
 * 1. Set ENABLED to false
 * 2. All other sports will automatically reappear
 * 
 * No code deletion required - everything is preserved.
 */

export const FOOTBALL_FOCUS_CONFIG = {
  /** When true, UI limits sport scope to football — off for premium multisport identity. */
  ENABLED: false,
  
  // Allowed sport slug (only used when ENABLED is true)
  ALLOWED_SPORT: 'football' as const,
  
  // Priority competitions to feature prominently
  PRIORITY_COMPETITIONS: [
    'UEFA Champions League',
    'Serie A',
    'UEFA Europa League',
    'Premier League',
    'La Liga',
    'Bundesliga',
  ] as const,
  
  // Competitions to show in filters (subset of priority)
  FEATURED_COMPETITIONS: [
    'UEFA Champions League',
    'Serie A',
  ] as const,
  
  REDIRECT_TO_FOOTBALL: false,
  SHOW_COMING_SOON_SECTION: false,
  HIDE_SPORT_SELECTOR: false,
  /** Legacy hero strings — unused while multisport hero is default; kept for optional narrow mode. */
  HERO: {
    headline: 'European multisport — premium lane',
    subheadline: 'Serie A, cups, and continental lanes as one curated row alongside other sports.',
    ctaPrimary: 'Open markets',
    ctaSecondary: 'Curated outlook',
    supportingLine: 'UCL · Serie A · top European competitions',
  },
  
  // Stats to show (football-focused)
  STATS: {
    showSportCount: false, // Hide "47 Sports Covered"
    customStats: [
      { label: 'Live Matches', value: 'dynamic' }, // Will be calculated
      { label: 'Active Traders', value: 'dynamic' },
      { label: 'Trading Volume', value: 'dynamic' },
    ],
  },
} as const;

/**
 * Helper function to check if football focus mode is active
 */
export function isFootballFocusEnabled(): boolean {
  return FOOTBALL_FOCUS_CONFIG.ENABLED;
}

/**
 * Helper function to check if a sport should be visible
 */
export function isSportAllowed(sportSlug: string): boolean {
  if (!FOOTBALL_FOCUS_CONFIG.ENABLED) {
    return true; // All sports allowed when feature is disabled
  }
  return sportSlug === FOOTBALL_FOCUS_CONFIG.ALLOWED_SPORT || sportSlug === 'all';
}

/**
 * Helper function to get the default sport for navigation
 */
export function getDefaultSport(): string {
  return FOOTBALL_FOCUS_CONFIG.ENABLED 
    ? FOOTBALL_FOCUS_CONFIG.ALLOWED_SPORT 
    : 'all';
}

/**
 * Helper function to check if a competition should be featured
 */
export function isFeaturedCompetition(competitionName: string): boolean {
  if (!FOOTBALL_FOCUS_CONFIG.ENABLED) {
    return false;
  }
  return FOOTBALL_FOCUS_CONFIG.PRIORITY_COMPETITIONS.some(
    comp => competitionName.toLowerCase().includes(comp.toLowerCase())
  );
}
