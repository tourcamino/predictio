/**
 * One-shot audit: Azuro upcoming football metadata vs european league gate.
 * Usage: CURATED_LEAGUE_GATE_AUDIT=1 node --env-file=.env --import tsx src/scripts/auditEuropeanLeagueGate.ts
 */
import { fetchAzuroGames, rawGameIsFootball } from "../services/azuroCuratorGraphql";
import {
  explainAllowedLeagueRejection,
  logEuropeanLeagueGateAudit,
} from "../services/eventCurationPipeline";

const LOOKAHEAD_SEC_60D = 60 * 24 * 60 * 60;

async function main() {
  const nowSec = Math.floor(Date.now() / 1000);
  const windowEndSec = nowSec + LOOKAHEAD_SEC_60D;

  const all = await fetchAzuroGames();
  const football = all.filter((g) => rawGameIsFootball(g));
  const upcoming = football.filter((g) => {
    const kickoff = parseInt(String(g.startsAt), 10);
    return Number.isFinite(kickoff) && kickoff > nowSec && kickoff < windowEndSec;
  });

  const passed = upcoming.filter((g) =>
    explainAllowedLeagueRejection(g.league?.name ?? "", g.league?.country?.name ?? "")
      .passesLeagueGate,
  );

  console.log(
    JSON.stringify({
      tag: "audit_european_league_gate_totals",
      rawIndexer: all.length,
      football: football.length,
      upcomingIn60d: upcoming.length,
      europeanLeagueGate: passed.length,
    }),
  );

  logEuropeanLeagueGateAudit(upcoming, { force: true });

  const passedAll: Array<{ league: string; country: string; kickoff: string; in60d: boolean }> =
    [];
  for (const g of football) {
    const league = g.league?.name ?? "";
    const country = g.league?.country?.name ?? "";
    const verdict = explainAllowedLeagueRejection(league, country);
    if (!verdict.passesLeagueGate) continue;
    const kickoff = parseInt(String(g.startsAt), 10);
    const in60d = Number.isFinite(kickoff) && kickoff > nowSec && kickoff < windowEndSec;
    passedAll.push({
      league,
      country,
      kickoff: new Date(kickoff * 1000).toISOString(),
      in60d,
    });
  }

  console.log(
    JSON.stringify({
      tag: "audit_european_league_gate_all_football",
      footballTotal: football.length,
      passAllFootball: passedAll.length,
      passIn60d: passedAll.filter((p) => p.in60d).length,
      passedSample: passedAll.slice(0, 40),
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
