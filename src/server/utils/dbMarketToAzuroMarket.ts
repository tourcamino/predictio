import type { Market as PrismaMarketRow } from "@prisma/client";
import type { SeedMarket } from "~/data/seedMarkets";
import type { AzuroMarket } from "~/services/azuro";
import {
  parseKickoff,
  parseTeamsFromEvent,
  parseYesNoPrices,
  sportEmojiFromLabel,
} from "~/server/utils/prismaMarket";

function slugifySegment(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "market"
  );
}

function mapDbRowToSeedStatus(
  row: PrismaMarketRow,
  kickoff: Date,
): SeedMarket["status"] {
  const now = Date.now();
  if (row.status === "resolved") return "resolved";
  if (
    row.status === "voided" ||
    row.status === "under_review" ||
    row.status === "closed"
  ) {
    return "locked";
  }

  const closes = row.closesAt.getTime();
  if (now >= closes) return "locked";

  const hoursToClose = (closes - now) / (1000 * 60 * 60);
  if (hoursToClose > 0 && hoursToClose < 2) return "ending-soon";
  if (kickoff.getTime() > now) return "upcoming";
  return "live";
}

/** Maps a Prisma `Market` row to the same shape used by Azuro list + `/markets` UI. */
export function prismaMarketRowToAzuroMarket(row: PrismaMarketRow): AzuroMarket {
  const { teamA, teamB } = parseTeamsFromEvent(row.event);
  const { yesPrice, noPrice } = parseYesNoPrices(row.outcomes);
  const kickoff = parseKickoff(row.outcomes, row.closesAt);
  const status = mapDbRowToSeedStatus(row, kickoff);
  const liquidity =
    row.totalLPPool != null ? row.totalLPPool : Math.floor(row.volume * 0.5);

  return {
    id: row.id,
    question:
      row.description?.trim() || `Who will win: ${teamA} vs ${teamB}?`,
    sport: row.sport,
    sportEmoji: sportEmojiFromLabel(row.sport),
    competition: row.league,
    competitionSlug: slugifySegment(row.league),
    event: {
      name: row.event,
      slug: slugifySegment(row.event),
      startsAt: kickoff.toISOString(),
      teams: [teamA, teamB],
    },
    outcomes: [
      {
        id: `${row.id}-yes`,
        label: `${teamA} wins`,
        price: yesPrice,
        volume24h: row.volume * yesPrice,
      },
      {
        id: `${row.id}-no`,
        label: `${teamB} wins`,
        price: noPrice,
        volume24h: row.volume * noPrice,
      },
    ],
    volume24h: row.volume,
    liquidity,
    traders: row.predictions,
    status,
    createdAt: row.createdAt.toISOString(),
    creator: "predictio",
    resolutionSources: ["Predictio"],
    endsAt: row.closesAt.toISOString(),
    description: row.description ?? undefined,
    isFeatured: row.tags.includes("featured"),
  };
}
