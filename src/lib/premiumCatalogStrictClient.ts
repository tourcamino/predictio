import type { AzuroMarket } from "~/services/azuro";

/** P10 — strict premium book + Tier A / B / C for ranking (client mirror of backend firewall). */
export type PremiumTier = "A" | "B" | "C";

const MULTISPORT_MIN = 82;

function normCountryToken(s: string): string {
  const c = s.toLowerCase().trim();
  if (c === "italy" || c === "italia") return "italy";
  if (c === "england" || c === "united kingdom" || c === "uk") return "england";
  if (c === "spain" || c === "españa" || c === "espana") return "spain";
  if (c === "germany" || c === "deutschland") return "germany";
  if (c === "france") return "france";
  if (c === "brazil" || c === "brasil") return "brazil";
  if (c === "finland") return "finland";
  return c;
}

function teamBlob(m: AzuroMarket): string {
  const teams = (m.event?.teams ?? []).join(" ").toLowerCase();
  return ` ${teams} `;
}

/** Founder + headline European clubs — Tier A anchors. */
export function hasFounderWhitelistClub(blob: string): boolean {
  const patterns = [
    "real madrid",
    "fc barcelona",
    "barcelona",
    "arsenal",
    "liverpool",
    "manchester city",
    "bayern",
    "fc bayern",
    "juventus",
    "ssc napoli",
    "napoli",
    "paris saint",
    "psg",
  ] as const;
  for (const p of patterns) {
    if (blob.includes(p)) return true;
  }
  if (/\binter\b/.test(blob) || blob.includes("internazionale")) return true;
  if (/\bac milan\b/.test(blob)) return true;
  if (/\bmilan\b/.test(blob) && !blob.includes("nashville")) return true;
  return false;
}

/** Tier B — strong premium support (bundesliga / serie A / la liga depth). */
const TIER_B_FRAGMENTS = [
  "dortmund",
  "leipzig",
  "leverkusen",
  "atalanta",
  "roma",
  "fiorentina",
  "lazio",
  "sevilla",
  "atletico",
  "atlético",
  "bilbao",
  "real sociedad",
] as const;

export function countPremiumTierBHits(blob: string): number {
  let n = 0;
  for (const p of TIER_B_FRAGMENTS) {
    if (blob.includes(p)) n++;
  }
  return n;
}

function hasControlledPremiumPair(blob: string): boolean {
  const pairs: [string, string][] = [
    ["juventus", "fiorentina"],
    ["roma", "atalanta"],
    ["dortmund", "leipzig"],
  ];
  return pairs.some(([a, b]) => blob.includes(a) && blob.includes(b));
}

export function isItalianSerieAItalyMarket(m: AzuroMarket): boolean {
  const comp = m.competition.toLowerCase();
  const loc = normCountryToken(m.event?.location ?? "");
  if (loc === "brazil" || comp.includes("brasileir")) return false;
  if (!loc || loc === "italy") {
    return (comp.includes("serie a") && !comp.includes("serie b")) || comp.includes("serie-a");
  }
  return (
    loc === "italy" &&
    (comp.includes("serie a") || comp.includes("serie-a")) &&
    !comp.includes("serie b")
  );
}

export function isVerifiedItalianFootballCopy(m: AzuroMarket): boolean {
  const comp = m.competition.toLowerCase();
  const loc = normCountryToken(m.event?.location ?? "");
  if (loc === "brazil" || comp.includes("brasileir") || comp.includes("brazil")) return false;
  if (comp.includes("coppa italia") && loc === "italy") return true;
  if (comp.includes("supercoppa") && loc === "italy") return true;
  return isItalianSerieAItalyMarket(m);
}

function isStrictFootballLeague(m: AzuroMarket): boolean {
  const comp = m.competition.toLowerCase();
  const loc = normCountryToken(m.event?.location ?? "");
  if (loc === "brazil" || comp.includes("brasileir")) return false;
  if (comp.includes("serie b") && loc === "italy") return false;
  if (loc === "finland" && comp.includes("veikkausliiga")) return false;

  if (comp.includes("champions league") && !comp.includes("afc") && !comp.includes("caf")) return true;
  if (comp.includes("europa league") || comp.includes("conference league")) return false;

  if (isItalianSerieAItalyMarket(m)) return true;
  if (comp.includes("coppa italia") && loc === "italy") return true;
  if (comp.includes("supercoppa") && loc === "italy") return true;
  if (
    comp.includes("premier league") &&
    !comp.includes("scottish") &&
    !comp.includes("northern ireland") &&
    loc === "england"
  ) {
    return true;
  }
  if ((comp.includes("la liga") || comp.includes("laliga")) && loc === "spain") return true;
  if (comp.includes("bundesliga") && loc === "germany") return true;
  if (comp.includes("ligue 1") && loc === "france") return true;
  return false;
}

function footballPremiumTier(m: AzuroMarket): PremiumTier | null {
  if (m.sport !== "football") return null;
  if (!isStrictFootballLeague(m)) return null;

  const blob = teamBlob(m);
  const imp = m.importanceScore ?? 0;
  const comp = m.competition.toLowerCase();
  const loc = normCountryToken(m.event?.location ?? "");
  const ucl = comp.includes("champions league") && !comp.includes("afc") && !comp.includes("caf");
  const founder = hasFounderWhitelistClub(blob);
  const tb = countPremiumTierBHits(blob);
  const pair = hasControlledPremiumPair(blob);
  const serieA = isItalianSerieAItalyMarket(m);

  const passes =
    founder ||
    (ucl && imp >= 100) ||
    (tb >= 2 && imp >= 86) ||
    (pair && serieA && imp >= 82) ||
    (ucl && tb >= 1 && imp >= 96);

  if (!passes) return null;

  if (founder || (ucl && imp >= 108) || (serieA && founder)) return "A";
  if (ucl || (tb >= 2 && imp >= 90)) return "B";
  if (pair || tb >= 1) return "C";
  return "B";
}

function eventTextBlob(m: AzuroMarket): string {
  const q = (m.question ?? "").toLowerCase();
  const ev = (m.event?.name ?? "").toLowerCase();
  const teams = (m.event?.teams ?? []).join(" ").toLowerCase();
  return `${q} ${ev} ${teams}`;
}

function multisportPremiumTier(m: AzuroMarket): PremiumTier | null {
  const sport = m.sport.toLowerCase();
  const compFull = `${m.competition} ${m.event?.name ?? ""}`.toLowerCase();
  const blob = eventTextBlob(m);
  const imp = m.importanceScore ?? 0;

  if (sport === "tennis") {
    const gsOrMasters =
      /grand slam|wimbledon|roland|australian open|us open|french open/i.test(compFull) ||
      /\bmasters\b/.test(compFull) ||
      /\batp finals\b/i.test(compFull);
    const atp500 =
      /\batp\b/.test(compFull) &&
      (/\b500\b/.test(compFull) ||
        /indian wells|miami open|rome|madrid|monte carlo|canada masters|cincinnati|shanghai|paris masters/i.test(
          compFull,
        ));
    const star = /\b(sinner|alcaraz|djokovic|nadal)\b/i.test(blob);
    const lateDraw = /\b(quarter|semi|semifinal|semi-final|round of 16|round of sixteen)\b/i.test(
      compFull + blob,
    );
    const compOk =
      /\batp\b/.test(compFull) ||
      /\bwta\b/.test(compFull) ||
      gsOrMasters;

    if (!compOk) return null;

    if ((gsOrMasters || /\bmasters\b/.test(compFull)) && star && imp >= MULTISPORT_MIN) return "A";
    if (atp500 && imp >= 86) return "B";
    if (star && imp >= MULTISPORT_MIN) return "B";
    if (lateDraw && imp >= 88 && /\batp\b/.test(compFull)) return "C";
    return null;
  }

  if (sport === "basketball") {
    const nba = /\bnba\b/.test(compFull);
    const euro = /euroleague/.test(compFull);
    const marquee = /finals|conference final|eastern final|western final|game\s*[67]\b/i.test(compFull);
    const playoff = /playoff|play-in|finals|conference|semifinal|semi-final/.test(compFull);
    if (!(nba || euro) || !playoff || imp < MULTISPORT_MIN) return null;
    if (marquee || (nba && /finals/.test(compFull))) return "A";
    if (euro && /final|final four/i.test(compFull)) return "A";
    return "B";
  }

  if (sport === "f1" || sport === "motorsport") {
    const f1 = /\bformula\s*1\b|\bf1\b|grand prix/.test(compFull + blob);
    const monaco = /monaco|monza|silverstone|spa-francorchamps|spa francorchamps/i.test(compFull + blob);
    const narrative = /ferrari|leclerc|verstappen|hamilton|\bmonaco gp\b/i.test(compFull + blob);
    if (!f1) return null;
    if (monaco || (narrative && imp >= 88)) return "A";
    if (narrative || imp >= 88) return "B";
    return null;
  }

  if (sport === "mma") {
    const ufc = /\bufc\b/.test(compFull + blob);
    const titleCard = /title|championship|main event|\bufc\s*\d+/i.test(compFull);
    if (!ufc || imp < MULTISPORT_MIN) return null;
    if (titleCard && imp >= 88) return "A";
    if (titleCard || imp >= 86) return "B";
    return imp >= 84 ? "C" : null;
  }

  return null;
}

function isContinuityFootballLeague(m: AzuroMarket): boolean {
  if (isStrictFootballLeague(m)) return true;
  const comp = m.competition.toLowerCase();
  const loc = normCountryToken(m.event?.location ?? "");
  if (loc === "brazil" || comp.includes("brasileir")) return false;
  if (comp.includes("serie b") && loc === "italy") return false;
  if (loc === "finland" && comp.includes("veikkausliiga")) return false;
  const el = comp.includes("europa league") && !comp.includes("conference");
  const conf = comp.includes("conference league");
  if (!el && !conf) return false;
  const banned = ["senegal", "thailand", "saudi", "qatar", "malaysia"];
  if (banned.some((b) => loc.includes(b))) return false;
  return true;
}

/** Client mirror of `strictPremiumFootballContinuityOnly` — Tier D surface only. */
function footballProtocolContinuityOnly(m: AzuroMarket): boolean {
  if (m.sport !== "football") return false;
  if (!isContinuityFootballLeague(m)) return false;
  const imp = m.importanceScore ?? 0;
  if (imp < 64) return false;
  const blob = teamBlob(m);
  const founder = hasFounderWhitelistClub(blob);
  const comp = m.competition.toLowerCase();
  const ucl = comp.includes("champions league") && !comp.includes("afc") && !comp.includes("caf");
  const el = comp.includes("europa league") && !comp.includes("conference");
  const conf = comp.includes("conference league");
  if (ucl && imp >= 92) return true;
  if ((el || conf) && imp >= 70) return true;
  if (isStrictFootballLeague(m) && (founder || imp >= 72)) return true;
  if (isItalianSerieAItalyMarket(m) && imp >= 74) return true;
  return false;
}

/** Client mirror of `strictPremiumMultisportContinuityOnly`. */
function multisportProtocolContinuityOnly(m: AzuroMarket): boolean {
  const sport = m.sport.toLowerCase();
  if (sport === "football") return false;
  const compFull = `${m.competition} ${m.event?.name ?? ""}`.toLowerCase();
  const blob = eventTextBlob(m);
  const imp = m.importanceScore ?? 0;
  const minRel = 72;

  if (sport === "tennis") {
    const compOk =
      /\batp\b/.test(compFull) ||
      /\bwta\b/.test(compFull) ||
      /grand slam|wimbledon|roland/i.test(compFull);
    return compOk && imp >= minRel;
  }
  if (sport === "basketball") {
    const nba = /\bnba\b/.test(compFull);
    const euro = /euroleague/.test(compFull);
    return ((nba || euro) && imp >= minRel) || (nba && imp >= 78);
  }
  if (sport === "f1" || sport === "motorsport") {
    const f1 =
      /\bformula\s*1\b|\bf1\b|grand prix/.test(compFull) ||
      /\bformula\s*1\b|\bf1\b|grand prix/.test(blob);
    return f1 && imp >= minRel;
  }
  if (sport === "mma") {
    const ufc = /\bufc\b/.test(compFull) || /\bufc\b/.test(blob);
    return ufc && imp >= minRel;
  }
  return false;
}

export function protocolContinuityOnlyPasses(m: AzuroMarket): boolean {
  if (m.sport === "football") return footballProtocolContinuityOnly(m);
  return multisportProtocolContinuityOnly(m);
}

export function azuroMarketPassesProtocolCatalogSurface(m: AzuroMarket): boolean {
  if (azuroMarketPassesStrictPremium(m)) return true;
  return protocolContinuityOnlyPasses(m);
}

export function premiumCatalogTier(m: AzuroMarket): PremiumTier | null {
  if (m.sport === "football") return footballPremiumTier(m);
  return multisportPremiumTier(m);
}

export function azuroMarketPassesStrictPremium(m: AzuroMarket): boolean {
  return premiumCatalogTier(m) !== null;
}

export function premiumTierSortKey(t: PremiumTier | null): number {
  if (t === "A") return 3;
  if (t === "B") return 2;
  if (t === "C") return 1;
  return 0;
}
