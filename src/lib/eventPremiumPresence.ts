import type { AzuroMarket } from '~/services/azuro';

/**
 * Short, factual identity lines derived from competition/participants only —
 * for atmosphere, not editorial copy.
 */
export function eventAtmosphereLabel(m: AzuroMarket): string | null {
  const c = m.competition.toLowerCase();
  const blob = `${m.question ?? ''} ${(m.event?.teams ?? []).join(' ')}`.toLowerCase();

  if (c.includes('monaco') || blob.includes('monaco')) return 'Monte Carlo';
  if (c.includes('champions league') && !c.includes('afc') && !c.includes('caf')) {
    return 'Champions League';
  }
  if (m.sport === 'f1' || /\bformula\s*1\b|\bgrand prix\b/i.test(c)) return 'Formula 1';
  if (m.sport === 'tennis' && /\b(sinner|alcaraz|djokovic|nadal)\b/i.test(blob)) {
    return 'Grand Slam';
  }
  if (c.includes('serie a') && !c.includes('brasileir')) return 'Serie A';
  if (c.includes('premier league') && !c.includes('scottish') && !c.includes('welsh')) {
    return 'Premier League';
  }
  if (c.includes('la liga') || c.includes('laliga')) return 'La Liga';
  if (c.includes('bundesliga') && !c.includes('austria')) return 'Bundesliga';
  if (c.includes('ligue 1')) return 'Ligue 1';
  if (c.includes('coppa italia')) return 'Coppa Italia';
  if (m.sport === 'mma' && c.includes('ufc')) return 'UFC';
  if (c.includes('euroleague')) return 'EuroLeague';
  return null;
}

/** Oversized watermark source — league name only. */
export function competitionWatermarkText(leagueName: string, maxLen = 28): string {
  const t = leagueName.trim();
  if (!t) return 'LIVE';
  if (t.length <= maxLen) return t.toUpperCase();
  return `${t.slice(0, maxLen - 1).trim()}…`.toUpperCase();
}
