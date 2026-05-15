import type { EditorialSlotId } from "~/lib/editorialCatalogPresentation";

const SLOT_DISPLAY_PRIORITY: Record<EditorialSlotId, number> = {
  premiumAnchors: 0,
  unionBerlin: 1,
  italyFirst: 2,
  tennisPremium: 3,
  basketballPremium: 4,
  motorsportCombat: 5,
  adaptiveFallback: 6,
};

export function compareEditorialCatalogOrder(
  a: { editorialSlot?: EditorialSlotId; importanceScore?: number; startsAtMs?: number },
  b: { editorialSlot?: EditorialSlotId; importanceScore?: number; startsAtMs?: number },
): number {
  const pa = a.editorialSlot ? SLOT_DISPLAY_PRIORITY[a.editorialSlot] : 99;
  const pb = b.editorialSlot ? SLOT_DISPLAY_PRIORITY[b.editorialSlot] : 99;
  if (pa !== pb) return pa - pb;
  const scoreDiff = (b.importanceScore ?? 0) - (a.importanceScore ?? 0);
  if (scoreDiff !== 0) return scoreDiff;
  return (a.startsAtMs ?? 0) - (b.startsAtMs ?? 0);
}
