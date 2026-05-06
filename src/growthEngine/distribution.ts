import { PostLog, TelegramLog } from "./types";

// In-memory logs (in production, these would be in a database)
export const postLog: PostLog[] = [];
export const telegramLog: TelegramLog[] = [];

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function postToX(
  content: string,
  marketId: string,
  type: "preMatch" | "lastHour" | "controversial"
): Promise<void> {
  // Calculate jitter based on content type
  let jitterRange = 1800; // ±15 min for normal posts
  if (type === "lastHour") {
    jitterRange = 300; // ±5 min for urgent posts
  }

  const jitter = Math.floor(Math.random() * jitterRange * 2) - jitterRange;
  const scheduledAt = Date.now() + jitter * 1000;

  const post: PostLog = {
    id: generateId(),
    platform: "twitter",
    marketId,
    content,
    scheduledAt,
    status: "scheduled",
    mockTweetId: `tweet_${Date.now()}`,
    type,
  };

  postLog.push(post);

  // Simulate posting after delay
  setTimeout(() => {
    post.status = "posted";
  }, Math.abs(jitter) * 1000);
}

export async function postToTelegram(
  content: string,
  type: "lastHour" | "controversial"
): Promise<void> {
  // Only post FOMO and controversial content to Telegram
  if (type !== "lastHour" && type !== "controversial") {
    return;
  }

  const log: TelegramLog = {
    chatId: "@predictio_channel",
    content,
    sentAt: Date.now(),
    type,
  };

  telegramLog.push(log);
}

export function getRecentPosts(limit: number = 20): PostLog[] {
  return postLog
    .sort((a, b) => b.scheduledAt - a.scheduledAt)
    .slice(0, limit);
}

export function getTodayStats(): { posts: number; telegrams: number } {
  const todayStart = new Date().setHours(0, 0, 0, 0);

  const posts = postLog.filter((p) => p.scheduledAt >= todayStart).length;
  const telegrams = telegramLog.filter((t) => t.sentAt >= todayStart).length;

  return { posts, telegrams };
}
