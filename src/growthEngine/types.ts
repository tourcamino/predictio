export interface Market {
  id: string;
  event: string;
  sport: string;
  league: string;
  volume: number; // USDC
  timeToClose: number; // seconds
  odds: Record<string, number>;
  percentSplit: Record<string, number>;
  score?: number; // calculated by marketScanner
}

export interface MarketContent {
  preMatch: string;
  lastHour: string;
  controversial: string;
}

export interface PostLog {
  id: string;
  platform: "twitter" | "telegram";
  marketId: string;
  content: string;
  scheduledAt: number;
  status: "scheduled" | "posted" | "failed";
  mockTweetId?: string;
  type?: "preMatch" | "lastHour" | "controversial";
}

export interface TelegramLog {
  chatId: string;
  content: string;
  sentAt: number;
  type: "lastHour" | "controversial";
}

export interface TrackedUser {
  handle: string;
  engagementCount: number;
  lastInteraction: number;
  interactions: Array<{
    type: "like" | "reply" | "retweet";
    postId: string;
    timestamp: number;
  }>;
  status: "new" | "engaged" | "dm_sent" | "replied" | "converted";
  sport: string;
  notes: string;
}

export interface MockTweet {
  id: string;
  handle: string;
  text: string;
  likes: number;
  replies: number;
  matchId: string;
}

export interface DMLog {
  id: string;
  handle: string;
  message: string;
  sentAt: number;
  status: "sent" | "replied" | "failed";
}

export interface GrowthActivity {
  id: string;
  type: "post" | "reply" | "dm" | "cycle" | "user_tracked";
  message: string;
  timestamp: Date;
  platform?: "twitter" | "telegram";
  marketId?: string;
}

export interface EngineStats {
  postsToday: number;
  repliesToday: number;
  dmsToday: number;
  cyclesCompleted: number;
  lastCycleAt: number | null;
  nextCycleAt: number | null;
}
