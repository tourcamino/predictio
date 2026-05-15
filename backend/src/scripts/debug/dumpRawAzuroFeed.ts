/**
 * Raw Azuro indexer dump + summary (writes to os.tmpdir()).
 * Usage from backend: node --env-file=.env --import tsx src/scripts/debug/dumpRawAzuroFeed.ts
 */
import type { RawAzuroGame } from "../../services/azuroCuratorGraphql";
import {
  extract1x2DecimalOddsFromRawGame,
  fetchAzuroGames,
  rawGameIsFootball,
} from "../../services/azuroCuratorGraphql";
import { canonicalSportFromRaw } from "../../services/canonicalSportTaxonomy";
import { normCountry } from "../../services/editorialLeagueTiers";
import { kickoffSecFromRaw } from "../../services/eventCurationPipeline";
import { emergencyFetchNowSkewSec } from "../../services/emergencyRelaxMode";
import { writeDebugJson } from "./debugOut";

const EU_TOKENS = new Set([
  "england",
  "italy",
  "spain",
  "germany",
  "france",
  "portugal",
  "netherlands",
  "belgium",
  "turkey",
  "scotland",
  "austria",
  "ukraine",
  "switzerland",
  "greece",
  "denmark",
  "sweden",
  "norway",
  "czech republic",
  "croatia",
  "serbia",
  "poland",
  "romania",
  "hungary",
  "slovakia",
  "slovenia",
  "europe",
  "republic of ireland",
  "ireland",
]);

function isEuropeFixture(g: RawAzuroGame): boolean {
  const c = normCountry(g.league?.country?.name ?? "");
  return EU_TOKENS.has(c);
}

function rawStateOpen(g: RawAzuroGame): boolean {
  const s = String(g.state ?? "").toLowerCase();
  return s === "prematch" || s === "open" || s === "";
}

async function run(fetchFromSec: number, wallSec: number) {
  const raw = await fetchAzuroGames({ minStartsAtSec: fetchFromSec });
  const sportBreak: Record<string, number> = {};
  const leagueBreak: Record<string, number> = {};
  let openLike = 0;
  let closedLike = 0;
  let europeN = 0;
  let nonEuropeN = 0;
  const missingFields: Record<string, number> = {};
  const invalidDates: Array<{ gameId: string; startsAt: unknown }> = [];
  const invalidCompetitors: Array<{ gameId: string }> = [];
  const emptyOdds: Array<{ gameId: string }> = [];

  for (const g of raw) {
    const sport = canonicalSportFromRaw(g) ?? "unknown";
    sportBreak[sport] = (sportBreak[sport] ?? 0) + 1;
    const leagueKey = `${g.league?.country?.name ?? "?"} | ${g.league?.name ?? "?"}`;
    leagueBreak[leagueKey] = (leagueBreak[leagueKey] ?? 0) + 1;
    if (rawStateOpen(g)) openLike += 1;
    else closedLike += 1;
    if (isEuropeFixture(g)) europeN += 1;
    else nonEuropeN += 1;

    if (!String(g.gameId || g.id || "").trim()) missingFields.noGameId = (missingFields.noGameId ?? 0) + 1;
    const ko = kickoffSecFromRaw(g);
    if (ko == null || !Number.isFinite(ko)) {
      missingFields.invalidKickoff = (missingFields.invalidKickoff ?? 0) + 1;
      invalidDates.push({ gameId: String(g.gameId || g.id || ""), startsAt: g.startsAt });
    }
    const parts = g.participants;
    if (!Array.isArray(parts) || parts.length < 2) {
      missingFields.participants = (missingFields.participants ?? 0) + 1;
      invalidCompetitors.push({ gameId: String(g.gameId || "") });
    } else {
      const a = String(parts[0]?.name || "").trim();
      const b = String(parts[1]?.name || "").trim();
      if (!a || !b) {
        missingFields.participants = (missingFields.participants ?? 0) + 1;
        invalidCompetitors.push({ gameId: String(g.gameId || "") });
      }
    }
    const odds = extract1x2DecimalOddsFromRawGame(g);
    if (odds.homeOdds == null && odds.drawOdds == null && odds.awayOdds == null) {
      emptyOdds.push({ gameId: String(g.gameId || "") });
    }
  }

  const sampleNorm = raw.slice(0, 5).map((g) => {
    const ko = kickoffSecFromRaw(g);
    const odds = extract1x2DecimalOddsFromRawGame(g);
    return {
      gameId: String(g.gameId || "").trim(),
      sport: canonicalSportFromRaw(g),
      league: g.league?.name,
      country: g.league?.country?.name,
      startsAtRaw: g.startsAt,
      startsAtUnix: ko,
      state: g.state,
      odds,
    };
  });

  const summary = {
    generatedAtIso: new Date().toISOString(),
    wallSec,
    fetchFromSec,
    totalFixtures: raw.length,
    fixturesBySport: sportBreak,
    fixturesByLeagueTop: Object.entries(leagueBreak)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40),
    openLikeRatio: raw.length ? openLike / raw.length : 0,
    openLike,
    closedLike,
    europeVsNonEurope: { europe: europeN, nonEurope: nonEuropeN },
    missingFields,
    invalidDatesSample: invalidDates.slice(0, 20),
    invalidCompetitorsSample: invalidCompetitors.slice(0, 20),
    emptyOddsSample: emptyOdds.slice(0, 20),
    sampleNormalizedRows: sampleNorm,
    first100RawFixtures: raw.slice(0, 100),
  };

  const rawPath = writeDebugJson("azuro-raw-feed.json", raw);
  const sumPath = writeDebugJson("azuro-feed-summary.json", summary);

  console.log("TOTAL EVENTS FOUND:", raw.length);
  console.log("SPORT BREAKDOWN:", sportBreak);
  console.log("LEAGUE BREAKDOWN (top 15):", summary.fixturesByLeagueTop.slice(0, 15));
  console.log("OPEN-LIKE EVENTS:", openLike, " OTHER STATE:", closedLike);
  const upcomingFootball = raw.filter((g) => rawGameIsFootball(g)).filter((g) => {
    const k = kickoffSecFromRaw(g);
    return k != null && k > wallSec && k < wallSec + 60 * 86400;
  }).length;
  console.log("UPCOMING FOOTBALL (~60d window, kickoff>now):", upcomingFootball);
  console.log("Wrote:", rawPath);
  console.log("Wrote:", sumPath);
}

async function main() {
  const wallSec = Math.floor(Date.now() / 1000);
  const fetchFrom = wallSec - emergencyFetchNowSkewSec();
  await run(fetchFrom, wallSec);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
