/**
 * One-shot audit: Azuro upcoming football metadata vs european league gate.
 * Usage: node --env-file=.env --import tsx src/scripts/auditEuropeanLeagueGate.ts
 */
import { fetchAzuroGames, rawGameIsFootball } from "../services/azuroCuratorGraphql";
import {
  explainAllowedLeagueRejection,
  filterEuropeanUpcoming,
  isStalePrematchGame,
  kickoffSecFromRaw,
  logEuropeanLeagueGateAudit,
} from "../services/eventCurationPipeline";

const LOOKAHEAD_SEC_60D = 60 * 24 * 60 * 60;

async function main() {
  const nowSec = Math.floor(Date.now() / 1000);
  const windowEndSec = nowSec + LOOKAHEAD_SEC_60D;

  const all = await fetchAzuroGames({ minStartsAtSec: nowSec });
  const filtered = filterEuropeanUpcoming(all, nowSec, windowEndSec);

  const staleOnRaw = all.filter((g) => isStalePrematchGame(g, nowSec)).length;

  const passed = filtered.upcoming.filter((g) =>
    explainAllowedLeagueRejection(
      g.league?.name ?? "",
      g.league?.country?.name ?? "",
      g.league?.slug,
    ).passesLeagueGate,
  );

  console.log(
    JSON.stringify({
      tag: "audit_european_league_gate_totals",
      rawIndexer: all.length,
      stalePrematchOnRaw: staleOnRaw,
      stalePrematchRejected: filtered.stalePrematchRejected,
      football: filtered.footballGames.length,
      validFutureFootball: filtered.validFutureFootball,
      upcomingIn60d: filtered.upcoming.length,
      futureWhitelisted: filtered.futureWhitelisted,
      futureItalianPool: filtered.futureItalianPool,
      europeanLeagueGate: passed.length,
    }),
  );

  logEuropeanLeagueGateAudit(filtered.upcoming, { force: true });

  const passedAll: Array<{
    league: string;
    country: string;
    leagueSlug: string;
    kickoff: string;
    in60d: boolean;
    stale: boolean;
  }> = [];

  for (const g of all.filter((x) => rawGameIsFootball(x))) {
    const league = g.league?.name ?? "";
    const country = g.league?.country?.name ?? "";
    const verdict = explainAllowedLeagueRejection(league, country, g.league?.slug);
    if (!verdict.passesLeagueGate) continue;
    const kickoff = kickoffSecFromRaw(g);
    const in60d =
      kickoff != null && kickoff > nowSec && kickoff < windowEndSec && !isStalePrematchGame(g, nowSec);
    passedAll.push({
      league,
      country,
      leagueSlug: g.league?.slug ?? "",
      kickoff: kickoff != null ? new Date(kickoff * 1000).toISOString() : "",
      in60d,
      stale: isStalePrematchGame(g, nowSec),
    });
  }

  console.log(
    JSON.stringify({
      tag: "audit_european_league_gate_all_football",
      footballTotal: all.filter((g) => rawGameIsFootball(g)).length,
      passAllFootball: passedAll.length,
      passIn60d: passedAll.filter((p) => p.in60d).length,
      passStaleKickoff: passedAll.filter((p) => p.stale).length,
      passedSample: passedAll.slice(0, 40),
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
