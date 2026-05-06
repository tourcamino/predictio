import { GrowthActivity, EngineStats, Market } from "./types";
import { scanMarkets, selectTopMarkets } from "./marketScanner";
import { generateContent } from "./contentEngine";
import { postToX, postToTelegram, getTodayStats } from "./distribution";
import { findTweets, generateReply, scheduleReply, getTodayReplyCount } from "./replyEngine";
import { processDMQueue, getTodayDMCount } from "./dmEngine";
import { trackInteraction } from "./interactionTracker";

// Engine state
let isRunning = false;
let isPaused = false;
let loopInterval: NodeJS.Timeout | null = null;
let cycleCount = 0;
let lastCycleTime: number | null = null;
let nextCycleTime: number | null = null;

// Activity log
const activityLog: GrowthActivity[] = [];
const MAX_LOG_SIZE = 100;

function generateActivityId(): string {
  return `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function logActivity(
  type: GrowthActivity["type"],
  message: string,
  platform?: "twitter" | "telegram",
  marketId?: string
): void {
  const activity: GrowthActivity = {
    id: generateActivityId(),
    type,
    message,
    timestamp: new Date(),
    platform,
    marketId,
  };

  activityLog.unshift(activity);

  // Keep log size manageable
  if (activityLog.length > MAX_LOG_SIZE) {
    activityLog.pop();
  }
}

async function runCycle(): Promise<void> {
  console.log(`\n[${new Date().toISOString()}] 🚀 Running Growth Engine cycle...`);
  logActivity("cycle", "Growth Engine cycle started");

  try {
    // 1. Scan markets
    const allMarkets = await scanMarkets();
    console.log(`📊 Scanned ${allMarkets.length} markets`);

    // 2. Select top 3
    const topMarkets = selectTopMarkets(allMarkets, 3);
    console.log(`🎯 Top markets: ${topMarkets.map((m) => m.event).join(", ")}`);

    // 3. Generate and distribute content
    for (const market of topMarkets) {
      const content = await generateContent(market);

      // Always post preMatch
      await postToX(content.preMatch, market.id, "preMatch");
      logActivity(
        "post",
        `Posted to X: "${content.preMatch.substring(0, 60)}..."`,
        "twitter",
        market.id
      );

      // Post lastHour content if market closes soon
      if (market.timeToClose < 3600) {
        await postToTelegram(content.lastHour, "lastHour");
        logActivity(
          "post",
          `Posted to Telegram: last-hour FOMO for ${market.event}`,
          "telegram",
          market.id
        );

        await postToX(content.lastHour, market.id, "lastHour");
        logActivity(
          "post",
          `Posted to X: "${content.lastHour.substring(0, 60)}..."`,
          "twitter",
          market.id
        );
      }

      // Post controversial content (2h after preMatch in real scenario, immediate in demo)
      await postToX(content.controversial, market.id, "controversial");
      logActivity(
        "post",
        `Posted controversial take: "${content.controversial.substring(0, 60)}..."`,
        "twitter",
        market.id
      );

      // 4. Find and reply to tweets
      const tweets = await findTweets(market);
      const tweetsToReply = tweets.slice(0, 2); // max 2 per market

      for (const tweet of tweetsToReply) {
        const reply = generateReply(tweet, market);
        await scheduleReply(tweet.id, reply, market.id);
        logActivity(
          "reply",
          `Replied to ${tweet.handle}: "${reply.substring(0, 60)}..."`,
          "twitter",
          market.id
        );

        // Simulate the tweet author engaging with our reply
        if (Math.random() > 0.5) {
          setTimeout(() => {
            trackInteraction(tweet.handle, "like", `post_${Date.now()}`, market.sport);
            logActivity(
              "user_tracked",
              `Tracked interaction from ${tweet.handle} (${market.sport})`
            );
          }, 5000);
        }
      }
    }

    // 5. Process DM queue
    const dmsSent = await processDMQueue();
    if (dmsSent > 0) {
      logActivity("dm", `Sent ${dmsSent} targeted DM${dmsSent > 1 ? "s" : ""} to engaged users`);
    }

    // 6. Update stats
    cycleCount++;
    lastCycleTime = Date.now();

    logActivity(
      "cycle",
      `Cycle completed: ${topMarkets.length} markets, ${getTodayStats().posts} posts, ${getTodayReplyCount()} replies, ${dmsSent} DMs`
    );

    console.log("✅ Cycle completed successfully");
  } catch (error) {
    console.error("❌ Error in growth engine cycle:", error);
    logActivity("cycle", `Cycle failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

function scheduleNextCycle(): void {
  if (loopInterval) {
    clearTimeout(loopInterval);
  }

  // Wait 2-3 hours (randomized) before next cycle
  const waitTime = 7200000 + Math.random() * 3600000; // 2-3 hours in ms
  nextCycleTime = Date.now() + waitTime;

  console.log(`⏳ Next cycle in ${Math.round(waitTime / 3600000 * 10) / 10}h`);

  loopInterval = setTimeout(() => {
    if (!isPaused) {
      runCycle().then(() => scheduleNextCycle());
    }
  }, waitTime);
}

export function startEngine(): void {
  if (isRunning) {
    console.log("Engine already running");
    return;
  }

  isRunning = true;
  isPaused = false;
  console.log("🚀 Growth Engine starting...");
  logActivity("cycle", "🚀 Growth Engine started");

  // Run first cycle immediately
  runCycle().then(() => scheduleNextCycle());
}

export function pauseEngine(): void {
  if (!isRunning) {
    console.log("Engine not running");
    return;
  }

  isPaused = true;
  if (loopInterval) {
    clearTimeout(loopInterval);
    loopInterval = null;
  }
  nextCycleTime = null;

  console.log("⏸ Engine paused");
  logActivity("cycle", "⏸ Engine paused");
}

export function resumeEngine(): void {
  if (!isRunning || !isPaused) {
    console.log("Cannot resume - engine not paused");
    return;
  }

  isPaused = false;
  console.log("▶ Engine resumed");
  logActivity("cycle", "▶ Engine resumed");

  scheduleNextCycle();
}

export function stopEngine(): void {
  if (!isRunning) {
    return;
  }

  isRunning = false;
  isPaused = false;

  if (loopInterval) {
    clearTimeout(loopInterval);
    loopInterval = null;
  }

  lastCycleTime = null;
  nextCycleTime = null;

  console.log("🛑 Engine stopped");
  logActivity("cycle", "🛑 Engine stopped");
}

export function forceRunCycle(): void {
  if (!isRunning) {
    console.log("Engine not running - cannot force run");
    return;
  }

  console.log("⚡ Forcing immediate cycle...");
  logActivity("cycle", "⚡ Manual cycle triggered");

  // Cancel scheduled cycle
  if (loopInterval) {
    clearTimeout(loopInterval);
  }

  // Run immediately and reschedule
  runCycle().then(() => scheduleNextCycle());
}

export function getEngineStats(): EngineStats {
  const { posts, telegrams } = getTodayStats();

  return {
    postsToday: posts,
    repliesToday: getTodayReplyCount(),
    dmsToday: getTodayDMCount(),
    cyclesCompleted: cycleCount,
    lastCycleAt: lastCycleTime,
    nextCycleAt: nextCycleTime,
  };
}

export function getActivityLog(limit: number = 50): GrowthActivity[] {
  return activityLog.slice(0, limit);
}

export function isEngineRunning(): boolean {
  return isRunning && !isPaused;
}

export function isEnginePaused(): boolean {
  return isPaused;
}
