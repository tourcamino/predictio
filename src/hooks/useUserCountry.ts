import { useMemo } from 'react';
import type { CountryCode } from '~/config/marketGeo';
import { COUNTRY_FLAG, COUNTRY_LABEL } from '~/config/marketGeo';

function parseRegionFromLanguage(lang: string | undefined): string | null {
  if (!lang) return null;
  const parts = lang.split(/[-_]/);
  const maybeRegion = parts[1];
  if (!maybeRegion) return null;
  if (/^[A-Za-z]{2}$/.test(maybeRegion)) return maybeRegion.toUpperCase();
  return null;
}

function safeRegion(): string | null {
  if (typeof navigator === 'undefined') return null;

  // 1) navigator.languages / navigator.language
  const langs = (navigator.languages && navigator.languages.length > 0 ? navigator.languages : [navigator.language]).filter(Boolean);
  for (const l of langs) {
    const r = parseRegionFromLanguage(l);
    if (r) return r;
  }

  // 2) Intl.Locale when available
  try {
    const loc = new Intl.Locale(navigator.language);
    const r = loc.maximize().region;
    if (typeof r === 'string' && r.length === 2) return r.toUpperCase();
  } catch {
    // ignore
  }

  return null;
}

export function useUserCountry() {
  return useMemo(() => {
    const region = safeRegion();

    // If we can’t determine, default to US (neutral for now).
    const country = (region as CountryCode) || ('US' as CountryCode);
    return {
      countryCode: country,
      flag: COUNTRY_FLAG[country] ?? '🌍',
      label: COUNTRY_LABEL[country] ?? 'Your Nation',
    };
  }, []);
}

