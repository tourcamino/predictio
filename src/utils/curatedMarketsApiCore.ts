import type { SeedMarket } from "~/data/seedMarkets";
import { getSportMetadata } from "~/data/mockMarkets";
import type { AzuroMarket } from "~/services/azuro";
import { transformAzuroThreeWayOdds } from "~/utils/azuroThreeWayOdds";
import { compareEditorialCatalogOrder } from "~/lib/editorialCatalogOrder";

const SYNTHETIC_DRAW_DECIMAL = 3.35;

export type CuratedMarketApiRow = {
  id: string;
  gameId: string;
  title: string;
  homeTeam: string;
  awayTeam: string;
  homeImage: string | null;
  awayImage: string | null;
  leagueName: string;
  country: string;
  startsAt: string;
  lockedAt: string;
  status: string;
  result: string | null;
  timeToLock: number;
  importanceScore: number;
  autoPublish: boolean;
  homeOdds?: number | null;
  drawOdds?: number | null;
  awayOdds?: number | null;
  paperLiquidityAllocation?: number | null;
  paperLiquiditySharePct?: number | null;
  editorialSlot?:
    | "premiumAnchors"
    | "italyFirst"
    | "unionBerlin"
    | "tennisPremium"
    | "basketballPremium"
    | "motorsportCombat"
    | "adaptiveFallback";
  selectionReason?: string;
  sport?: string;
  sportSlug?: string;
};

function slugifyCompetition(name: string | undefined | null): string {
  return String(name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "league";
}

function deriveSeedStatus(row: CuratedMarketApiRow): SeedMarket["status"] {
  const st = String(row.status || "OPEN").toUpperCase();
  if (st === "RESOLVED") return "resolved";
  if (st === "LOCKED") return "locked";
  const starts = new Date(row.startsAt).getTime();
  const locked = new Date(row.lockedAt).getTime();
  const now = Date.now();
  if (now >= locked) return "live";
  if (now >= starts) return "live";
  const hoursToLock = (locked - now) / (1000 * 60 * 60);
  if (hoursToLock > 0 && hoursToLock <= 24) return "ending-soon";
  return "upcoming";
}

export function curatedApiRowToAzuroMarket(row: CuratedMarketApiRow): AzuroMarket {
  const startsAt = row.startsAt;
  const endsAt = row.lockedAt;
  const slug = slugifyCompetition(row.leagueName);

  const ho = row.homeOdds;
  const doo = row.drawOdds;
  const ao = row.awayOdds;

  const homeOk = ho != null && ho > 0;
  const awayOk = ao != null && ao > 0;
  const drawOk = doo != null && doo > 0;

  let outcomes: SeedMarket["outcomes"];
  let drawOddsField: string;

  if (homeOk && awayOk) {
    const drawDec = drawOk ? doo! : SYNTHETIC_DRAW_DECIMAL;
    const t = transformAzuroThreeWayOdds(String(ho), String(drawDec), String(ao));
    drawOddsField = drawOk ? doo!.toFixed(2) : SYNTHETIC_DRAW_DECIMAL.toFixed(2);
    outcomes = [
      { id: `${row.gameId}-home`, label: row.homeTeam, price: t.home, volume24h: 0 },
      { id: `${row.gameId}-draw`, label: "Pareggio", price: t.draw, volume24h: 0 },
      { id: `${row.gameId}-away`, label: row.awayTeam, price: t.away, volume24h: 0 },
    ];
  } else {
    drawOddsField = "3.00";
    outcomes = [
      { id: `${row.gameId}-home`, label: row.homeTeam, price: 1 / 3, volume24h: 0 },
      { id: `${row.gameId}-draw`, label: "Pareggio", price: 1 / 3, volume24h: 0 },
      { id: `${row.gameId}-away`, label: row.awayTeam, price: 1 / 3, volume24h: 0 },
    ];
  }

  const sportKey = row.sportSlug ?? row.sport ?? "unknown";
  const sportMeta = getSportMetadata(sportKey);
  const competition = String(row.leagueName ?? row.title ?? "unknown").trim() || "unknown";

  return {
    id: row.id,
    question: `${row.homeTeam} vs ${row.awayTeam}`,
    sport: sportKey,
    sportEmoji: sportMeta.emoji,
    competition,
    competitionSlug: slug,
    event: {
      name: row.title || `${row.homeTeam} vs ${row.awayTeam}`,
      slug: `${slug}-${row.gameId}`.slice(0, 80),
      startsAt,
      lockedAt: row.lockedAt,
      teams: [row.homeTeam, row.awayTeam],
      location: row.country,
    },
    outcomes,
    volume24h: 0,
    liquidity:
      typeof row.paperLiquidityAllocation === "number" && row.paperLiquidityAllocation > 0
        ? row.paperLiquidityAllocation
        : 0,
    traders: 0,
    status: deriveSeedStatus(row),
    createdAt: startsAt,
    creator: "predictio",
    resolutionSources: [],
    endsAt,
    isFeatured: false,
    azuroGameId: row.gameId,
    azuroStatus: row.status,
    azuroResult: row.result ?? undefined,
    importanceScore: row.importanceScore,
    editorialSlot: row.editorialSlot,
    selectionReason: row.selectionReason,
    drawOdds: drawOddsField,
    paperLiquidityAllocation: row.paperLiquidityAllocation ?? null,
    paperLiquiditySharePct: row.paperLiquiditySharePct ?? null,
  };
}

function kickoffMsForSort(m: AzuroMarket): number {
  const s = m.event?.startsAt;
  if (s) {
    const t = Date.parse(s);
    if (Number.isFinite(t)) return t;
  }
  const e = Date.parse(m.endsAt);
  return Number.isFinite(e) ? e : Number.MAX_SAFE_INTEGER;
}

export function sortByBackendCuratedRanking(markets: AzuroMarket[]): AzuroMarket[] {
  return [...markets].sort((a, b) =>
    compareEditorialCatalogOrder(
      {
        editorialSlot: a.editorialSlot,
        importanceScore: a.importanceScore,
        startsAtMs: kickoffMsForSort(a),
      },
      {
        editorialSlot: b.editorialSlot,
        importanceScore: b.importanceScore,
        startsAtMs: kickoffMsForSort(b),
      },
    ),
  );
}
