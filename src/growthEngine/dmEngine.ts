import { DMLog, TrackedUser } from "./types";
import { dmTemplates } from "./mockData";
import { getUsersByStatus, updateUserStatus } from "./interactionTracker";

export const dmLog: DMLog[] = [];
let dailyDMCount = 0;

// Reset daily count at midnight
function resetDailyCount() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const msUntilMidnight = tomorrow.getTime() - now.getTime();

  setTimeout(() => {
    dailyDMCount = 0;
    resetDailyCount(); // Schedule next reset
  }, msUntilMidnight);
}

// Initialize daily reset
resetDailyCount();

function generateId(): string {
  return `dm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateDM(user: TrackedUser): string {
  const templates = dmTemplates[user.sport] || dmTemplates.Football;
  return templates[Math.floor(Math.random() * templates.length)];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function processDMQueue(): Promise<number> {
  const candidates = getUsersByStatus("engaged");
  let sentCount = 0;

  for (const user of candidates) {
    // Check daily limit
    if (dailyDMCount >= 5) {
      console.log("Daily DM limit reached (5)");
      break;
    }

    // Check if enough time has passed since last interaction (4 hours)
    const hoursSinceLastInteraction =
      (Date.now() - user.lastInteraction) / 3600000;
    if (hoursSinceLastInteraction < 4) {
      continue;
    }

    // Generate and send DM
    const dm = generateDM(user);

    const dmEntry: DMLog = {
      id: generateId(),
      handle: user.handle,
      message: dm,
      sentAt: Date.now(),
      status: "sent",
    };

    dmLog.push(dmEntry);
    updateUserStatus(user.handle, "dm_sent");
    dailyDMCount++;
    sentCount++;

    console.log(`✉️ DM sent to ${user.handle}`);

    // Random delay between DMs (15-45 min)
    const delayMs = (15 + Math.random() * 30) * 60 * 1000;
    await sleep(delayMs);
  }

  return sentCount;
}

export async function sendManualDM(handle: string): Promise<boolean> {
  // Check daily limit
  if (dailyDMCount >= 5) {
    console.log("Daily DM limit reached (5)");
    return false;
  }

  const user = getUsersByStatus("engaged").find((u) => u.handle === handle);
  if (!user) {
    console.log(`User ${handle} not found or not engaged`);
    return false;
  }

  const dm = generateDM(user);

  const dmEntry: DMLog = {
    id: generateId(),
    handle: user.handle,
    message: dm,
    sentAt: Date.now(),
    status: "sent",
  };

  dmLog.push(dmEntry);
  updateUserStatus(user.handle, "dm_sent");
  dailyDMCount++;

  console.log(`✉️ Manual DM sent to ${user.handle}`);
  return true;
}

export function getRecentDMs(limit: number = 20): DMLog[] {
  return dmLog.sort((a, b) => b.sentAt - a.sentAt).slice(0, limit);
}

export function getTodayDMCount(): number {
  const todayStart = new Date().setHours(0, 0, 0, 0);
  return dmLog.filter((d) => d.sentAt >= todayStart).length;
}

export function getDailyDMCount(): number {
  return dailyDMCount;
}
