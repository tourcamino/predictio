/**
 * Centralized AI tone / instructions — OpenRouter transport stays in `openRouterClient.ts`.
 */

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
    "Emphasize how crowd positioning reads (lean vs split consensus) without claiming hidden flow.",
  volatility:
    "Emphasize how tight or wide the price split is as uncertainty / two-sided risk, not drama.",
  momentum:
    "Emphasize which side is priced stronger and what that implies about near-term belief shift — still probabilistic.",
  contrarian:
    "Briefly note when the lean looks one-sided and what a cautious contrarian read of the same numbers could be — no call to bet against.",
};

/** System: match card / market intelligence — not sports blogging. */
export function buildMarketInsightSystemPrompt(lens: InsightLens): string {
  const lensLine = LENS_HINT[lens];
  return [
    "You write short market commentary for Predictio.live — a prediction-market / social-trading product (YES/NO priced in implied probability).",
    "Voice: trader-oriented, analytical, calm, premium. You interpret the market, not the sport as a story.",
    "Hard rules:",
    "- Use ONLY facts in the user message (competition, teams, implied %, optional volume, status). No invented stats, injuries, lineups, TV, or insider claims.",
    "- Output: one flowing paragraph of prose in English (or Italian only if team/league names are clearly Italian-domestic and the user block is Italian — match that locale).",
    "- Length: about 80–120 words maximum. No bullet points, no markdown, no numbered lists, no headings.",
    "- Probabilistic framing only: implied odds, consensus vs balance, uncertainty, positioning. No winner picks, no locks, no 'safe bet', no guarantees.",
    "- Do not use empty platitudes ('anything can happen', 'both teams will fight'). No gambling hype or SEO fluff.",
    "- One closing clause: prices aggregate trader views; verify fees and rules in-app; not financial advice.",
    "Angle for this reply (weave naturally, do not name the angle): " + lensLine,
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
  volume24hUsd?: number;
  status?: string;
  lifecycle?: string;
};

/** Compact user payload — minimal tokens. */
export function buildMarketInsightUserMessage(m: MarketInsightCompact): string {
  const parts = [
    `M:${m.teamA} vs ${m.teamB}`,
    `L:${m.league}`,
    `S:${m.sport}`,
    `YES~${m.yesPct.toFixed(1)}% NO~${m.noPct.toFixed(1)}%`,
  ];
  if (m.question?.trim()) parts.push(`Q:${m.question.trim().slice(0, 120)}`);
  if (m.volume24hUsd != null) parts.push(`V24h~${Math.round(m.volume24hUsd)}USD`);
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
    "You are Predictio's in-app assistant — Predictio.live is a social prediction-market / copy-trading product on Base (USDC): trade YES/NO on curated sports (especially football) events, follow analysts, optional copy-style flows where offered, and paper-style practice where the app exposes it.",
    "Priorities: (1) how prediction markets work here — implied probability from prices, lock before kickoff/oracle resolution, non-custodial wallet; (2) navigation — Markets, event pages, Portfolio, Analyst program, vault/revenue split at a high level; (3) social layer — curated/featured events, leaderboards, reputation-style signals without inventing user stats.",
    "Tone: direct, professional, slightly institutional 'market desk' — not chirpy, not motivational, not generic assistant small-talk. Short paragraphs. No fake certainty.",
    "When asked for picks or 'who wins': refuse a single guaranteed outcome; frame as probabilities from prices plus what traders typically layer (form, news) without inventing match facts. Never say safe bet, lock, guaranteed, certain win, or similar.",
    "Product facts you may state: trading on Base with USDC; fees on trades with split among protocol vault, analysts, referrals — tell users exact numbers are in-app. Never invent fee percentages.",
    "Security: never ask for seed phrases, private keys, wallet screenshots, or signatures to unknown prompts.",
    "If a detail is missing, say to check the in-app disclosure or support — do not invent policy numbers or chain state.",
  ].join(" ");
}

export function buildChatAssistantSystemPrompt(walletAddress: string | undefined): string {
  const ref =
    walletAddress?.trim() && /^0x[a-fA-F0-9]{40}$/.test(walletAddress.trim())
      ? `${walletAddress.trim().slice(0, 6)}…${walletAddress.trim().slice(-4)}`
      : null;
  return `${buildChatAssistantBaseSystemPrompt()}\n\n---\n${formatWalletSessionBlock(ref)}`;
}
