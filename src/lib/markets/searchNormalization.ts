/**
 * Lightweight search normalization for curated markets (client + server).
 */

/** Strip accents/diacritics for fuzzy team/league matching. */
export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Normalize a single token for search indexing/matching. */
export function normalizeSearchToken(raw: string): string {
  return stripAccents(raw)
    .toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Split user query into normalized tokens (min length 2). */
export function tokenizeSearchQuery(query: string): string[] {
  const norm = normalizeSearchToken(query);
  if (!norm) return [];
  return norm.split(/\s+/).filter((t) => t.length >= 2);
}

export function normalizeSearchPhrase(query: string): string {
  return tokenizeSearchQuery(query).join(" ");
}
