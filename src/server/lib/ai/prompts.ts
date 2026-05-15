/**
 * Centralized AI tone / instructions — OpenRouter transport stays in `openRouterClient.ts`.
 */

import { env } from "~/server/env";

function serverTargetsTestnet(): boolean {
  const n = Number(String(env.BASE_CHAIN_ID || "").trim());
  return n === 84532;
}

/** Deterministic lens per match so different fixtures get variety; same fixture stays coherent with cache. */
export const INSIGHT_LENS = ["sentiment", "volatility", "momentum", "contrarian"] as const;
export type InsightLens = (typeof INSIGHT_LENS)[number];

export function insightLensFromContext(teamA: string, teamB: string, league: string): InsightLens {
  const s = `${teamA}\0${teamB}\0${league}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return INSIGHT_LENS[Math.abs(h) % 4]!;
}

const LENS_HINT: Record<InsightLens, string> = {
  sentiment:
    "Emphasize how crowd positioning reads (lean vs split consensus) without claiming hidden flow or trader counts.",
  volatility:
    "Emphasize how tight or wide the price split is as uncertainty / two-sided risk, not drama.",
  momentum:
    "Emphasize which side is priced stronger and what that implies about near-term belief shift — still probabilistic.",
  contrarian:
    "Briefly note when the lean looks one-sided and what a cautious contrarian read of the same numbers could be — no call to bet against.",
};

const PROTOCOL_CORE = [
  "Predictio is a pre-testnet, vault-backed curated prediction protocol — football-first, max 9 active curated markets at a time.",
  "Editorial appeal (importanceScore) ranks the public catalog; the protocol vault spreads paper USDC exposure across those slots.",
  "Until aggregate paper volume is meaningful, vault weights follow appeal scores — not live on-chain TVL or trader social proof.",
  "Never invent trader counts, surging volume, guaranteed APY, live non-custodial claims, or matches outside the curated catalog block.",
].join(" ");

/** System: match card / market intelligence — protocol analyst, not sports blogging. */
export function buildMarketInsightSystemPrompt(lens: InsightLens): string {
  const lensLine = LENS_HINT[lens];
  return [
    "You write short market commentary for Predictio.live — vault-backed curated prediction markets (YES/NO implied probability).",
    PROTOCOL_CORE,
    "Voice: protocol analyst / trading desk — analytical, calm, concise, premium. Interpret prices and matchup context, not tabloid sport.",
    "Hard rules:",
    "- Use ONLY facts in the user message (teams, league, implied %, appeal rank, kickoff, optional verified paper volume). No invented stats, injuries, lineups, or insider claims.",
    "- Never describe 'high trading activity', 'surging volume', or crowded markets unless verified paper volume is explicitly provided and > 0.",
    "- Output: one flowing paragraph in English (Italian only if team/league names are clearly Italian-domestic).",
    "- Length: about 80–120 words maximum. No bullet points, no markdown.",
    "- Probabilistic framing only. No winner picks, locks, or guarantees.",
    ...(serverTargetsTestnet()
      ? ["Testnet: no mainnet value or cash-profit claims."]
      : [
          "Economy: paper USDC for predictions unless UI states on-chain; no guaranteed profits.",
        ]),
    "- Close with: prices reflect positioning; verify fees/rules in-app; not financial advice.",
    "Angle (do not name it): " + lensLine,
  ].join(" ");
}

export type MarketInsightCompact = {
  teamA: string;
  teamB: string;
  league: string;
  sport: string;
  question?: string;
  yesPct: number;
  noPct: number;
  drawPct?: number;
  volume24hUsd?: number;
  status?: string;
  lifecycle?: string;
  importanceScore?: number;
  curatedRank?: number;
  kickoffIso?: string;
  marketId?: string;
};

/** Minimum paper volume (USD) before mentioning volume in AI payloads. */
export const AI_MIN_SIGNIFICANT_VOLUME_USD = 1;

export function shouldIncludeVolumeInAiPayload(volumeUsd: number | undefined): boolean {
  return volumeUsd != null && Number.isFinite(volumeUsd) && volumeUsd >= AI_MIN_SIGNIFICANT_VOLUME_USD;
}

/** Compact user payload — minimal tokens. */
export function buildMarketInsightUserMessage(m: MarketInsightCompact): string {
  const parts = [
    `M:${m.teamA} vs ${m.teamB}`,
    `L:${m.league}`,
    `S:${m.sport}`,
    `YES~${m.yesPct.toFixed(1)}% NO~${m.noPct.toFixed(1)}%`,
  ];
  if (m.drawPct != null) parts.push(`DRAW~${m.drawPct.toFixed(1)}%`);
  if (m.marketId) parts.push(`id:${m.marketId}`);
  if (m.curatedRank != null) parts.push(`rank:#${m.curatedRank}`);
  if (m.importanceScore != null) parts.push(`appeal:${m.importanceScore}`);
  if (m.kickoffIso) parts.push(`ko:${m.kickoffIso}`);
  if (m.question?.trim()) parts.push(`Q:${m.question.trim().slice(0, 120)}`);
  if (shouldIncludeVolumeInAiPayload(m.volume24hUsd)) {
    parts.push(`paperVol~${Math.round(m.volume24hUsd!)}USD`);
  }
  if (m.status) parts.push(`st:${m.status}`);
  if (m.lifecycle) parts.push(`lc:${m.lifecycle}`);
  return parts.join(" | ") + " Write the commentary paragraph now.";
}

/** Strip common markdown / bullets if the model slips. */
export function sanitizeInsightOutput(text: string): string {
  let t = text.trim();
  t = t.replace(/\r\n/g, "\n");
  t = t.replace(/^#{1,6}\s+/gm, "");
  t = t.replace(/^[-*•]\s+/gm, "");
  t = t.replace(/^\d+\.\s+/gm, "");
  t = t.replace(/\n{3,}/g, "\n\n");
  return clampInsightWordCount(t.trim(), 120);
}

function clampInsightWordCount(text: string, maxWords: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(" ")}…`;
}

// --- Chat assistant (product-native, not generic ChatGPT) ---

export function formatWalletSessionBlock(walletRef: string | null): string {
  return walletRef
    ? `Session: wallet connected (ref ${walletRef} only). Never infer balances, PnL, or open positions; send users to Portfolio.`
    : `Session: guest (wallet not linked). Do not imply they already hold USDC on Predictio; explain connect-wallet when relevant.`;
}

/** Core assistant identity — compact for latency/cost. */
export function buildChatAssistantBaseSystemPrompt(): string {
  return [
    "You are Predictio's in-app protocol assistant — not a generic ChatGPT wrapper.",
    PROTOCOL_CORE,
    "You help users navigate curated football prediction markets: implied probability from YES/NO prices, kickoff lock, paper USDC pre-testnet, and the single protocol vault that backs exposure across the active catalog.",
    "Priorities: (1) explain markets and vault exposure using the ACTIVE CURATED CATALOG block below; (2) trading flow — Markets, event page, Portfolio; (3) fees/splits — exact numbers only if known in-app, never invent.",
    "Tone: protocol analyst, trading-aware, concise, premium. No motivational fluff or sportsbook hype.",
    "When asked for picks: frame as probabilities from prices; no locks or guarantees. Do not invent form, injuries, or results.",
    "Never cite trader counts, TVL, live on-chain liquidity, or APY unless explicitly provided in the catalog block.",
    serverTargetsTestnet()
      ? "Deployment: Base Sepolia testnet — tokens have no monetary value; balances are paper unless UI states otherwise."
      : "Economy: paper USDC for predictions; wallet USDC is for gas unless UI states an on-chain leg.",
  ].join(" ");
}

/** Ask AI on market detail — focused on one fixture. */
export function buildAskMarketAiSystemPrompt(
  curatedCatalogBlock: string,
  focusMarketBlock: string,
): string {
  return [
    "You answer questions about ONE curated prediction market on Predictio — protocol analyst / football trading desk tone.",
    PROTOCOL_CORE,
    "Answer ONLY about the FOCUS MARKET and the ACTIVE CURATED CATALOG below. You know this match is in the catalog — never say you do not know the fixture.",
    "Use appeal score and vault narrative when asked why a match is ranked or vault-backed. Explain implied YES/NO % as crowd positioning, not picks.",
    "Never invent volume, traders, injuries, lineups, or guaranteed outcomes. No financial advice. Concise: 2–4 short paragraphs max.",
    "---",
    focusMarketBlock,
    "---",
    curatedCatalogBlock,
  ].join("\n");
}

export type AskMarketAiContext = {
  marketId: string;
  teamA: string;
  teamB: string;
  league: string;
  sport: string;
  question: string;
  yesPct: number;
  noPct: number;
  drawPct?: number;
  importanceScore?: number;
  curatedRank?: number;
  kickoffIso?: string;
  lifecycle?: string;
  vaultNarrative?: string;
};

export function buildAskMarketAiUserMessage(ctx: AskMarketAiContext): string {
  const parts = [
    `Q:${ctx.question.trim().slice(0, 500)}`,
    `M:${ctx.teamA} vs ${ctx.teamB}`,
    `L:${ctx.league}`,
    `id:${ctx.marketId}`,
    `YES~${ctx.yesPct.toFixed(1)}% NO~${ctx.noPct.toFixed(1)}%`,
  ];
  if (ctx.drawPct != null) parts.push(`DRAW~${ctx.drawPct.toFixed(1)}%`);
  if (ctx.curatedRank != null) parts.push(`rank:#${ctx.curatedRank}`);
  if (ctx.importanceScore != null) parts.push(`appeal:${ctx.importanceScore}`);
  if (ctx.kickoffIso) parts.push(`kickoff:${ctx.kickoffIso}`);
  if (ctx.lifecycle) parts.push(`lifecycle:${ctx.lifecycle}`);
  return parts.join(" | ");
}

export function buildAskMarketAiFocusBlock(
  row: {
    rank: number;
    teamA: string;
    teamB: string;
    league: string;
    yesPct: number;
    noPct: number;
    drawPct?: number;
    importanceScore: number;
    kickoffIso: string;
    marketId: string;
  } | null,
  fallback: { teamA: string; teamB: string; league: string; yesPct: number; noPct: number; marketId: string },
): string {
  if (row) {
    const draw = row.drawPct != null ? ` DRAW~${row.drawPct.toFixed(1)}%` : "";
    return (
      `FOCUS MARKET #${row.rank} (${row.marketId}): ${row.teamA} vs ${row.teamB} | ${row.league} | ` +
      `YES~${row.yesPct.toFixed(1)}% NO~${row.noPct.toFixed(1)}%${draw} | appeal=${row.importanceScore} | kickoff=${row.kickoffIso}`
    );
  }
  return (
    `FOCUS MARKET (${fallback.marketId}): ${fallback.teamA} vs ${fallback.teamB} | ${fallback.league} | ` +
    `YES~${fallback.yesPct.toFixed(1)}% NO~${fallback.noPct.toFixed(1)}%`
  );
}

export function buildAskMarketAiFallback(ctx: AskMarketAiContext): string {
  const y = ctx.yesPct.toFixed(0);
  const n = ctx.noPct.toFixed(0);
  const rank =
    ctx.curatedRank != null
      ? ` It is ranked #${ctx.curatedRank} in the founder-curated catalog`
      : " It is part of the founder-curated catalog";
  const appeal =
    ctx.importanceScore != null
      ? ` (editorial appeal score ${ctx.importanceScore})`
      : "";
  const vault =
    ctx.vaultNarrative
      ? ` ${ctx.vaultNarrative}`
      : " Protocol vault exposure is spread across curated slots using appeal scores until real paper volume is meaningful (pre-testnet).";

  const q = ctx.question.toLowerCase();
  if (q.includes("rank") || q.includes("curated") || q.includes("vault") || q.includes("why")) {
    return (
      `${ctx.teamA} vs ${ctx.teamB} (${ctx.league})${rank}${appeal}.${vault} ` +
      `Implied prices sit near ${y}% YES / ${n}% NO — interpret as positioning, not a forecast. Not financial advice.`
    );
  }
  if (q.includes("odds") || q.includes("balanced") || q.includes("price")) {
    return (
      `For ${ctx.teamA} vs ${ctx.teamB}, the market embeds roughly ${y}% YES versus ${n}% NO — ` +
      `a ${Math.abs(Number(y) - Number(n)) < 12 ? "relatively balanced" : "skewed"} split. ` +
      `Compare that to your own view of form and matchup before kickoff lock. Not financial advice.`
    );
  }
  if (q.includes("kickoff") || q.includes("watch") || q.includes("before")) {
    return (
      `Before kickoff on ${ctx.teamA} vs ${ctx.teamB}: confirm lock time in-app, resolution rules, and how YES/NO maps to the listed outcome. ` +
      `Prices near ${y}% / ${n}% reflect current paper-market positioning only. Not financial advice.`
    );
  }
  return (
    `${ctx.teamA} vs ${ctx.teamB} (${ctx.league}) is a vault-backed curated market on Predictio (pre-testnet paper USDC). ` +
    `Implied ${y}% YES / ${n}% NO aggregates trader views — not a guaranteed result.${appeal ? ` Appeal${appeal}.` : ""} Not financial advice.`
  );
}

export function sanitizeAskMarketAiOutput(text: string): string {
  return clampInsightWordCount(
    text
      .trim()
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^[-*•]\s+/gm, ""),
    220,
  );
}

export function buildChatAssistantSystemPrompt(
  walletAddress: string | undefined,
  curatedCatalogBlock: string,
): string {
  const ref =
    walletAddress?.trim() && /^0x[a-fA-F0-9]{40}$/.test(walletAddress.trim())
      ? `${walletAddress.trim().slice(0, 6)}…${walletAddress.trim().slice(-4)}`
      : null;
  return [
    buildChatAssistantBaseSystemPrompt(),
    "---",
    formatWalletSessionBlock(ref),
    "---",
    curatedCatalogBlock,
  ].join("\n");
}
