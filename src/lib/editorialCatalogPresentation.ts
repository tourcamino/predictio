import type { AzuroMarket } from "~/services/azuro";

export type EditorialSlotId =
  | "premiumAnchors"
  | "italyFirst"
  | "unionBerlin"
  | "tennisPremium"
  | "basketballPremium"
  | "motorsportCombat"
  | "adaptiveFallback";

const SLOT_ORDER: EditorialSlotId[] = [
  "premiumAnchors",
  "unionBerlin",
  "italyFirst",
  "tennisPremium",
  "basketballPremium",
  "motorsportCombat",
  "adaptiveFallback",
];

export const EDITORIAL_SLOT_LABELS: Record<EditorialSlotId, string> = {
  premiumAnchors: "Premium anchors",
  italyFirst: "Italy-first",
  unionBerlin: "Protocol anchor",
  tennisPremium: "Tennis premium",
  basketballPremium: "Basketball premium",
  motorsportCombat: "Motorsport & combat",
  adaptiveFallback: "Curated depth",
};

export function editorialSlotLabel(slot: EditorialSlotId | undefined): string | null {
  if (!slot) return null;
  return EDITORIAL_SLOT_LABELS[slot] ?? null;
}

export type EditorialCatalogSection = {
  slot: EditorialSlotId;
  label: string;
  markets: AzuroMarket[];
};

export function groupMarketsByEditorialSlot(markets: AzuroMarket[]): EditorialCatalogSection[] {
  const buckets = new Map<EditorialSlotId, AzuroMarket[]>();
  for (const slot of SLOT_ORDER) {
    buckets.set(slot, []);
  }

  for (const m of markets) {
    const slot = m.editorialSlot ?? "adaptiveFallback";
    const list = buckets.get(slot) ?? buckets.get("adaptiveFallback")!;
    list.push(m);
  }

  return SLOT_ORDER.map((slot) => ({
    slot,
    label: EDITORIAL_SLOT_LABELS[slot],
    markets: buckets.get(slot) ?? [],
  })).filter((s) => s.markets.length > 0);
}
