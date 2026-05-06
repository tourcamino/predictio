import { Market, MockTweet } from "./types";
import { mockTweets } from "./mockData";

interface ScheduledReply {
  id: string;
  tweetId: string;
  content: string;
  scheduledAt: number;
  marketId: string;
}

export const scheduledReplies: ScheduledReply[] = [];
const replyCountByMarket: Map<string, number> = new Map();

function generateId(): string {
  return `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateReply(tweet: MockTweet, market: Market): string {
  const volumeK = (market.volume / 1000).toFixed(0);
  const splits = Object.values(market.percentSplit);

  // Determine if tweet is bullish on the favorite
  const isBullish = tweet.text.toLowerCase().includes("win") || 
                    tweet.text.toLowerCase().includes("guaranteed") ||
                    tweet.text.toLowerCase().includes("easy");

  const contrarian = [
    `Market has them at ${splits[0]}% right now. $${volumeK}K disagrees with you.`,
    `${splits[1]}% of $${volumeK}K says otherwise. Interesting split.`,
    `Volume just crossed $${volumeK}K and it's ${splits.join("-")}. Not as obvious as people think.`,
    `Sharp money moved opposite in the last hour. $${volumeK}K tells a different story.`,
  ];

  const reinforcing = [
    `Data backs this. ${splits[0]}% weight on $${volumeK}K right now.`,
    `Smart money agrees. $${volumeK}K in and ${splits[0]}% on the same side.`,
    `Market confirms this. ${splits.join("-")} split on $${volumeK}K volume.`,
  ];

  const replies = isBullish ? contrarian : reinforcing;
  return replies[Math.floor(Math.random() * replies.length)];
}

export async function findTweets(market: Market): Promise<MockTweet[]> {
  // Filter tweets for this market that meet quality threshold
  return mockTweets.filter(
    (tweet) => tweet.matchId === market.id && tweet.likes > 50
  );
}

export async function scheduleReply(
  tweetId: string,
  content: string,
  marketId: string
): Promise<void> {
  // Check rate limit: max 2 replies per market per hour
  const hourAgo = Date.now() - 3600000;
  const recentReplies = scheduledReplies.filter(
    (r) => r.marketId === marketId && r.scheduledAt > hourAgo
  );

  if (recentReplies.length >= 2) {
    console.log(`Rate limit: Already sent 2 replies for market ${marketId} in the last hour`);
    return;
  }

  // Human timing: 5-45 minutes delay
  const delayMs = (5 + Math.random() * 40) * 60 * 1000;
  const scheduledAt = Date.now() + delayMs;

  const reply: ScheduledReply = {
    id: generateId(),
    tweetId,
    content,
    scheduledAt,
    marketId,
  };

  scheduledReplies.push(reply);
}

export function getRecentReplies(limit: number = 20): ScheduledReply[] {
  return scheduledReplies
    .sort((a, b) => b.scheduledAt - a.scheduledAt)
    .slice(0, limit);
}

export function getTodayReplyCount(): number {
  const todayStart = new Date().setHours(0, 0, 0, 0);
  return scheduledReplies.filter((r) => r.scheduledAt >= todayStart).length;
}
