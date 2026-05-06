import { Market } from "./types";
import { mockMarkets } from "./mockData";

export function scoreMarket(market: Market): number {
  // Volume score: max 50 points (normalized to $200K max)
  const volumeScore = Math.min(market.volume / 200000, 1) * 50;

  // Urgency score: up to 50 points based on time to close
  let urgencyScore = 10; // default
  if (market.timeToClose < 3600) {
    // less than 1 hour
    urgencyScore = 50;
  } else if (market.timeToClose < 21600) {
    // less than 6 hours
    urgencyScore = 30;
  }

  return volumeScore + urgencyScore;
}

export function selectTopMarkets(markets: Market[], count: number = 3): Market[] {
  // Score all markets
  const scoredMarkets = markets.map((market) => ({
    ...market,
    score: scoreMarket(market),
  }));

  // Sort by score descending and take top N
  return scoredMarkets.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, count);
}

export async function scanMarkets(): Promise<Market[]> {
  // In a real implementation, this would fetch from the database
  // For now, return mock markets with some randomization
  return mockMarkets.map((market) => ({
    ...market,
    // Add some random variation to volume and timeToClose to simulate real-time changes
    volume: market.volume + Math.random() * 10000 - 5000,
    timeToClose: Math.max(0, market.timeToClose - Math.random() * 3600),
  }));
}
