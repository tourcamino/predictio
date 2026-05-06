import { aiClient } from "./openRouterClient";

export const generateOutreachMessage = async (
  contact: {
    name: string;
    type: string;
    sport: string;
    platform: string;
    followers: string;
  },
  channel: string,
  goal: string,
  tone: string,
  language: string,
  context: string
) => {
  return await aiClient.complete(
    "Affiliate Outreach",
    "outreach",
    `You are an affiliate manager at Predictio.live, a DeFi sports prediction market.
Write personalized outreach messages.
Rules:
- Personalized to their content and audience
- Lead with value for them, not for us
- Never say "blockchain" "Web3" "DeFi" upfront
- Focus on: earning USDC, their audience, easy setup
- ${channel === "x_dm" ? "Max 240 chars" : "Max 3 short paragraphs"}
- Tone: ${tone} — Language: ${language}
- Sound human, not mass outreach`,
    `Write a ${channel} message for:
Contact: ${contact.name} — Type: ${contact.type}
Sport: ${contact.sport} — Platform: ${contact.platform}
Followers: ${contact.followers}
Goal: ${goal}
Extra context: ${context}
Write the message only, no commentary.`
  );
};

export const generateMarketContent = async (market: {
  event: string;
  sport: string;
  volume: number;
  percentSplit: { teamA: number; teamB: number };
  odds: { teamA: number; teamB: number };
  timeToClose: number;
}) => {
  return await aiClient.complete(
    "Market Content",
    "content",
    `You write social media content about sports prediction markets.
Rules:
- Include real numbers always
- Sound like a sports trader, not a brand
- No forced CTAs or links — Sharp and slightly provocative
- Max 240 chars per X post`,
    `Generate 3 posts for:
Event: ${market.event} — Sport: ${market.sport}
Volume: $${market.volume.toLocaleString()} USDC
Split: ${market.percentSplit.teamA}% vs ${market.percentSplit.teamB}%
Odds: ${market.odds.teamA}x vs ${market.odds.teamB}x
Closes in: ${Math.round(market.timeToClose / 3600)}h
Return JSON only:
{"preMatch":"...","lastHour":"...","controversial":"..."}`
  );
};

export const generateTweetReply = async (
  tweetText: string,
  marketData: {
    event: string;
    volume: number;
    percentSplit: { teamA: number; teamB: number };
  }
) => {
  return await aiClient.complete(
    "Tweet Reply",
    "replies",
    `Reply to sports tweets using prediction market data.
Rules:
- Sound like a real sports fan
- Never mention Predictio by name — No links ever
- Max 180 chars — Use market data naturally`,
    `Tweet: "${tweetText}"
Market: ${marketData.event}
Data: ${marketData.percentSplit.teamA}% split, $${(marketData.volume / 1000).toFixed(0)}K volume
Write a short natural reply.`
  );
};

export const generateDM = async (user: {
  handle: string;
  sport: string;
  engagementCount: number;
}) => {
  return await aiClient.complete(
    "User DM",
    "dms",
    `Write short personalized DMs to engaged sports users.
Rules:
- Curiosity-driven, not promotional
- Reference their sport naturally
- Max 200 chars — Never hard sell — Sound like a real person`,
    `User: ${user.handle}
Sport interest: ${user.sport}
Engaged with us: ${user.engagementCount} times
Write a short DM that creates curiosity.`
  );
};

export const generateMarketInsight = async (market: {
  event: string;
  sport: string;
  volume: number;
  percentSplit: { teamA: number; teamB: number };
  odds: { teamA: number; teamB: number };
}) => {
  return await aiClient.complete(
    "Market Insight",
    "insights",
    `You are a sports market analyst.
Write one sharp insight about a prediction market.
Rules:
- Max 2 sentences — Data-driven, reference numbers
- Point out something non-obvious — No hype, pure analysis`,
    `Market: ${market.event}
Volume: $${market.volume.toLocaleString()}
Split: ${market.percentSplit.teamA}% vs ${market.percentSplit.teamB}%
Odds: ${market.odds.teamA}x vs ${market.odds.teamB}x
Write one market insight.`
  );
};

export const generateNetworkProposal = async (network: {
  name: string;
  reach: string;
  verticals: string[];
  proposedRevShare: number;
}) => {
  return await aiClient.complete(
    "Network Proposal",
    "outreach",
    `You write B2B partnership proposals for Predictio.live.
Rules:
- Professional email format
- Lead with network benefit
- Include specific numbers
- 3 paragraphs max — Clear CTA at end`,
    `Network: ${network.name}
Reach: ${network.reach}
Verticals: ${network.verticals.join(", ")}
Proposed rev share: ${network.proposedRevShare}%
Write a partnership proposal email.`
  );
};

export const generateReEngagement = async (analyst: {
  displayName: string;
  sport: string;
  daysInactive: number;
  totalEarned: number;
  pendingRewards: number;
}) => {
  return await aiClient.complete(
    "Re-engagement",
    "outreach",
    `Write re-engagement messages for inactive analysts.
Rules:
- Friendly, not pushy
- Reference their earnings — Create urgency if pending rewards
- Max 200 chars — Personal tone`,
    `Analyst: ${analyst.displayName}
Sport: ${analyst.sport}
Inactive: ${analyst.daysInactive} days
Total earned: $${analyst.totalEarned}
Pending rewards: $${analyst.pendingRewards}
Write a re-engagement DM.`
  );
};
