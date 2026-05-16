/**
 * Anti-regression tests (run: npm run test:football-first-guards)
 */
import assert from "node:assert/strict";
import {
  assertFootballFirstGuards,
  scanFootballFirstGuardViolations,
} from "../../services/footballFirstGuards";
import {
  inferSportFromLeagueAndTitle,
  resolveCanonicalSportFromRaw,
  resolveRegistrySportFields,
} from "../../services/canonicalSportTaxonomy";
import type { RawAzuroGame } from "../../services/azuroCuratorGraphql";

function hockeyGame(): RawAzuroGame {
  return {
    gameId: "1006000000000029560323",
    title: "Slovakia – Norway",
    startsAt: String(Math.floor(Date.now() / 1000) + 7200),
    sport: { name: "Football", slug: "football" },
    league: { name: "IIHF World Championship", country: { name: "International" } },
    participants: [{ name: "Slovakia" }, { name: "Norway" }],
  };
}

assert.equal(inferSportFromLeagueAndTitle("IIHF World Championship", ""), "hockey");
assert.equal(resolveCanonicalSportFromRaw(hockeyGame()), "hockey");
assert.equal(resolveRegistrySportFields(hockeyGame()).sportSlug, "hockey");

const mmaGame: RawAzuroGame = {
  gameId: "x",
  title: "Fighter A – Fighter B",
  sport: { slug: "football" },
  league: { name: "UFC 312" },
};
assert.equal(resolveCanonicalSportFromRaw(mmaGame), "mma");

const veikkaus: RawAzuroGame = {
  gameId: "y",
  title: "HJK – Ilves",
  sport: { slug: "soccer" },
  league: { name: "Veikkausliiga" },
};
assert.equal(resolveCanonicalSportFromRaw(veikkaus), "football");

const violations = scanFootballFirstGuardViolations();
assert.equal(
  violations.length,
  0,
  `static guard violations: ${JSON.stringify(violations)}`,
);
assertFootballFirstGuards();

console.log("OK: football-first guards + taxonomy tests passed");
