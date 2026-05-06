import { Market, MockTweet, TrackedUser } from "./types";

export const mockMarkets: Market[] = [
  {
    id: "m001",
    event: "Real Madrid vs Barcelona",
    sport: "Football",
    league: "UEFA Champions League",
    volume: 124500,
    timeToClose: 7200,
    odds: { teamA: 2.21, draw: 4.52, teamB: 3.06 },
    percentSplit: { teamA: 45, draw: 22, teamB: 33 },
  },
  {
    id: "m002",
    event: "Poirier vs Gaethje",
    sport: "MMA",
    league: "UFC 310",
    volume: 89200,
    timeToClose: 86400,
    odds: { teamA: 2.63, teamB: 1.6 },
    percentSplit: { teamA: 38, teamB: 62 },
  },
  {
    id: "m003",
    event: "India vs Australia",
    sport: "Cricket",
    league: "ICC World Cup Final",
    volume: 203100,
    timeToClose: 10800,
    odds: { teamA: 1.63, teamB: 2.56 },
    percentSplit: { teamA: 61, teamB: 39 },
  },
  {
    id: "m004",
    event: "Lakers vs Celtics",
    sport: "Basketball",
    league: "NBA Finals",
    volume: 156800,
    timeToClose: 14400,
    odds: { teamA: 1.89, teamB: 2.12 },
    percentSplit: { teamA: 53, teamB: 47 },
  },
  {
    id: "m005",
    event: "Djokovic vs Alcaraz",
    sport: "Tennis",
    league: "Wimbledon Final",
    volume: 98300,
    timeToClose: 28800,
    odds: { teamA: 2.05, teamB: 1.95 },
    percentSplit: { teamA: 49, teamB: 51 },
  },
  {
    id: "m006",
    event: "Yankees vs Dodgers",
    sport: "Baseball",
    league: "World Series Game 7",
    volume: 112400,
    timeToClose: 18000,
    odds: { teamA: 1.78, teamB: 2.35 },
    percentSplit: { teamA: 56, teamB: 44 },
  },
  {
    id: "m007",
    event: "Fury vs Usyk",
    sport: "Boxing",
    league: "Heavyweight Championship",
    volume: 187600,
    timeToClose: 5400,
    odds: { teamA: 2.41, teamB: 1.72 },
    percentSplit: { teamA: 41, teamB: 59 },
  },
  {
    id: "m008",
    event: "Verstappen vs Hamilton",
    sport: "F1",
    league: "Monaco Grand Prix",
    volume: 134200,
    timeToClose: 25200,
    odds: { teamA: 1.55, teamB: 2.85 },
    percentSplit: { teamA: 65, teamB: 35 },
  },
];

export const mockContent: Record<string, { preMatch: string; lastHour: string; controversial: string }> = {
  m001: {
    preMatch:
      "$124K already riding on El Clasico and the market is surprisingly split. 45% Real Madrid, 33% Barca. Someone knows something about tonight's lineup.",
    lastHour:
      "Bernabéu in 58 minutes. Volume just crossed $124K. The crowd is going 45% Real Madrid but the sharp money moved to Draw in the last hour.",
    controversial:
      "Everyone's backing Real Madrid at home but $27K is sitting on Draw. Casemiro is suspended. Do the math.",
  },
  m002: {
    preMatch:
      "UFC 310 market has Gaethje at 62% despite Poirier's chin being tested zero times this camp. $89K says the crowd is wrong.",
    lastHour:
      "Last hour. $89K on Poirier vs Gaethje. 62-38 split for Gaethje. If Poirier lands that left hook early, a lot of people lose a lot of money.",
    controversial:
      "Gaethje at 62%? The man has been knocked out twice in championship fights. The market is emotional, not analytical.",
  },
  m003: {
    preMatch:
      "$203K on India vs Australia. Biggest cricket market we've seen. India at 61% — but Australia wins World Cup finals. History vs momentum.",
    lastHour:
      "3 hours. $203K USDC. India 61% Australia 39%. The pitch report just dropped and it's spinning. India should be at 70%+. Market is slow.",
    controversial:
      "Australia has won 6 World Cup finals. India has won 2. $203K says India wins. The market has short memory.",
  },
};

export const mockTweets: MockTweet[] = [
  {
    id: "tw001",
    handle: "@FootballAnalyst",
    text: "Real Madrid at home in a UCL semi is basically a guaranteed win tbh",
    likes: 847,
    replies: 23,
    matchId: "m001",
  },
  {
    id: "tw002",
    handle: "@UFCfanatic99",
    text: "Gaethje is going to sleep Poirier in round 1, easy money",
    likes: 234,
    replies: 8,
    matchId: "m002",
  },
  {
    id: "tw003",
    handle: "@CricketGuru",
    text: "India is winning this World Cup final, no debate",
    likes: 1204,
    replies: 67,
    matchId: "m003",
  },
  {
    id: "tw004",
    handle: "@NBAinsider",
    text: "Lakers dynasty incoming. Celtics don't stand a chance.",
    likes: 456,
    replies: 34,
    matchId: "m004",
  },
  {
    id: "tw005",
    handle: "@TennisExpert",
    text: "Alcaraz is the future. Djokovic era is over.",
    likes: 678,
    replies: 89,
    matchId: "m005",
  },
];

export const initialTrackedUsers: TrackedUser[] = [
  {
    handle: "@FootballAnalyst",
    engagementCount: 3,
    lastInteraction: Date.now() - 3600000,
    interactions: [
      { type: "like", postId: "post_001", timestamp: Date.now() - 7200000 },
      { type: "reply", postId: "post_002", timestamp: Date.now() - 5400000 },
      { type: "retweet", postId: "post_003", timestamp: Date.now() - 3600000 },
    ],
    status: "engaged",
    sport: "Football",
    notes: "",
  },
  {
    handle: "@CryptoSportsFan",
    engagementCount: 2,
    lastInteraction: Date.now() - 1800000,
    interactions: [
      { type: "like", postId: "post_004", timestamp: Date.now() - 3600000 },
      { type: "like", postId: "post_005", timestamp: Date.now() - 1800000 },
    ],
    status: "engaged",
    sport: "Cricket",
    notes: "",
  },
  {
    handle: "@UFCfanatic99",
    engagementCount: 1,
    lastInteraction: Date.now() - 900000,
    interactions: [{ type: "like", postId: "post_006", timestamp: Date.now() - 900000 }],
    status: "new",
    sport: "MMA",
    notes: "",
  },
  {
    handle: "@BettingPro_EU",
    engagementCount: 4,
    lastInteraction: Date.now() - 7200000,
    interactions: [
      { type: "like", postId: "post_007", timestamp: Date.now() - 14400000 },
      { type: "reply", postId: "post_008", timestamp: Date.now() - 10800000 },
      { type: "retweet", postId: "post_009", timestamp: Date.now() - 9000000 },
      { type: "like", postId: "post_010", timestamp: Date.now() - 7200000 },
    ],
    status: "dm_sent",
    sport: "Football",
    notes: "",
  },
  {
    handle: "@SportsTradez",
    engagementCount: 2,
    lastInteraction: Date.now() - 5400000,
    interactions: [
      { type: "like", postId: "post_011", timestamp: Date.now() - 7200000 },
      { type: "reply", postId: "post_012", timestamp: Date.now() - 5400000 },
    ],
    status: "replied",
    sport: "Basketball",
    notes: "",
  },
];

export const dmTemplates: Record<string, string[]> = {
  Football: [
    "The El Clasico market split is actually more interesting than the odds suggest — sharp money moved in the last 2 hours in a direction most people aren't seeing.",
    "You seem to follow this match closely. The crowd is 45% Real Madrid but the volume distribution tells a different story.",
  ],
  Cricket: [
    "The India-Australia split shifted 8 points in the last hour after the pitch report. You'd find the movement pattern interesting.",
    "Most people are backing India but the $39K sitting on Australia is coming from accounts with a strong track record on World Cup finals.",
  ],
  MMA: [
    "UFC 310 market moved against Gaethje in the last 30 min. Weight cut rumors or just late sharp money — not clear yet.",
    "The Poirier-Gaethje split is wider than any comparable UFC main event we've tracked. Something's off.",
  ],
  Basketball: [
    "Lakers-Celtics volume just crossed $156K. The split moved 4 points in the last hour with zero news. Sharp money or whale activity.",
    "NBA Finals market behavior is different this year. The crowd is betting emotion, not data.",
  ],
  Tennis: [
    "Wimbledon final odds are almost even but the volume tells a different story. One side has 3x the average bet size.",
    "Djokovic-Alcaraz market is the most balanced we've seen all year. Sharp money is sitting this one out.",
  ],
  Baseball: [
    "World Series Game 7 market has Yankees at 56% but the sharp money moved to Dodgers in the last 2 hours.",
    "Baseball markets are usually predictable. This one isn't. Volume pattern suggests insider information.",
  ],
  Boxing: [
    "Fury-Usyk heavyweight market moved 12 points overnight. Weight-in results or something else — unclear.",
    "The boxing market is showing patterns we usually only see when there's leaked training camp data.",
  ],
  F1: [
    "Monaco GP market has Verstappen at 65% but Hamilton money just doubled in the last hour. Weather forecast or strategy leak?",
    "F1 markets move fast but this one is different. The volume distribution suggests teams are betting on their own drivers.",
  ],
};

export const CONTENT_SYSTEM_PROMPT = `You are a sharp, analytical sports trader who shares market insights on social media.

TONE RULES (CRITICAL):
- Sound human, tagliente, slightly provocative
- Always include real numbers: volume, % split, odds
- Zero AI-generic phrases like "Exciting match ahead!" or "Don't miss out!"
- No forced CTAs like "Click here" or "Join now"
- Write like an informed sports trader, not a brand
- Be contrarian when the data supports it
- Max 240 characters for Twitter posts

CONTENT STRUCTURE:
- Lead with the data hook (volume, split, odds)
- Add context that challenges conventional wisdom
- End with a sharp observation, not a call to action

EXAMPLES OF GOOD TONE:
✓ "$124K on El Clasico and it's 45-33-22. Draw money is sharper than you think."
✓ "Gaethje at 62% despite being KO'd twice in title fights. Market has short memory."
✓ "India 61% but Australia wins finals. $203K says history doesn't matter."

EXAMPLES OF BAD TONE (NEVER USE):
✗ "Exciting match coming up! Who do you think will win?"
✗ "Join us to bet on this amazing game!"
✗ "The stakes are high and the action is intense!"

Focus on data, contrarian insights, and sharp observations.`;
