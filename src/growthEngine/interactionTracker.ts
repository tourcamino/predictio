import { TrackedUser } from "./types";
import { initialTrackedUsers } from "./mockData";

// In-memory storage (in production, this would be in a database)
let trackedUsers: TrackedUser[] = [...initialTrackedUsers];

// Load from localStorage on init
const STORAGE_KEY = "predictio_growth_tracked_users";

export function loadTrackedUsers(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      trackedUsers = JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error loading tracked users:", error);
  }
}

export function saveTrackedUsers(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trackedUsers));
  } catch (error) {
    console.error("Error saving tracked users:", error);
  }
}

export function trackInteraction(
  handle: string,
  type: "like" | "reply" | "retweet",
  postId: string,
  sport: string
): void {
  const existing = trackedUsers.find((u) => u.handle === handle);

  if (existing) {
    existing.engagementCount++;
    existing.lastInteraction = Date.now();
    existing.interactions.push({ type, postId, timestamp: Date.now() });

    // Promote to "engaged" if 2+ interactions
    if (existing.engagementCount >= 2 && existing.status === "new") {
      existing.status = "engaged";
    }
  } else {
    trackedUsers.push({
      handle,
      engagementCount: 1,
      lastInteraction: Date.now(),
      interactions: [{ type, postId, timestamp: Date.now() }],
      status: "new",
      sport,
      notes: "",
    });
  }

  saveTrackedUsers();
}

export function getTrackedUsers(): TrackedUser[] {
  return trackedUsers;
}

export function getUsersByStatus(status: TrackedUser["status"]): TrackedUser[] {
  return trackedUsers.filter((u) => u.status === status);
}

export function updateUserStatus(
  handle: string,
  status: TrackedUser["status"]
): void {
  const user = trackedUsers.find((u) => u.handle === handle);
  if (user) {
    user.status = status;
    saveTrackedUsers();
  }
}

export function getUserByHandle(handle: string): TrackedUser | undefined {
  return trackedUsers.find((u) => u.handle === handle);
}

// Initialize on module load
loadTrackedUsers();
