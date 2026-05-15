/**
 * Homepage + core rails — market-native tone.
 *
 * Hero A/B/C: set `ACTIVE_HOME_COPY_INDEX` to `0`, `1`, or `2` (see `multisport` below).
 */
export const ACTIVE_HOME_COPY_INDEX = 0;

const multisport = [
  {
    heroHeadlineBefore: "Trade the tape.",
    heroHeadlineAccent: "Before kickoff.",
    heroSub:
      "Live sports markets, sharp flow, copy-ready traders. Pick a side, size with the crowd, mirror someone who’s already in — while the line still moves.",
    heroCtaPrimaryGuest: "Start trading",
    heroCtaPrimaryConnected: "Open markets",
    heroCtaSecondary: "Scroll live book",
    heroRibbonLabel: "Multisport book live",
  },
  {
    heroHeadlineBefore: "The Polymarket of",
    heroHeadlineAccent: "sports.",
    heroSub:
      "Prediction markets on the games people actually watch. Real odds, real positioning, real copy-trading — not a sportsbook sidebar.",
    heroCtaPrimaryGuest: "Get in",
    heroCtaPrimaryConnected: "Trade now",
    heroCtaSecondary: "See what’s live",
    heroRibbonLabel: "Book open · flow updating",
  },
  {
    heroHeadlineBefore: "Where conviction",
    heroHeadlineAccent: "gets priced.",
    heroSub:
      "Champions League to UFC — one fast book. Follow analysts, steal their entries, ride momentum before the whistle.",
    heroCtaPrimaryGuest: "Connect & trade",
    heroCtaPrimaryConnected: "Jump to markets",
    heroCtaSecondary: "Live events",
    heroRibbonLabel: "Trader-sized lanes",
  },
] as const;

export function getActiveHomeMultisportCopy() {
  return multisport[ACTIVE_HOME_COPY_INDEX] ?? multisport[0];
}

export const homeMarketSection = {
  badge: "LIVE · ON THE BOARD",
  title: "What’s trading now",
  sub:
    "Same lanes you’ll see on Markets — football, court, octagon, grid. No junk cards, no ghost fixtures.",
  statBookLabel: "Events live",
  statFlowLabel: "Pool behind the book",
  statFlowHint: "Size moves with the action",
  emptyTitle: "Book’s catching the next kickoff",
  emptySub:
    "Hang tight — we’re piping the next set of premium fixtures. Hit Markets for the full terminal.",
  cta: "Open full book",
  ctaHint: "Homepage order matches Markets · featured",
} as const;

export const homeSocialLayer = {
  eyebrow: "Copy trading · Leaderboard",
  title: "Mirror traders who publish their edge",
  sub:
    "ROI, win rate, last tape — pick a name, copy their next entry on the same live lines everyone else is trading.",
  emptyTitle: "Leaderboard warming up",
  emptySub: "Connect a wallet and put trades on the board — top flows surface here automatically.",
  copyReady: "Copy-ready",
  programLink: "Analyst program",
} as const;

export const homeCta = {
  title: "Already saw the line move?",
  sub: "Don’t spectate. Size, copy, or fade — before the market locks.",
  buttonConnected: "Trade now",
  buttonGuest: "Connect wallet",
  footLine1: "Azuro-powered odds",
  footLine2: "Non-custodial",
  footLine3: "USDC",
} as const;

export const homeSports = {
  title: "Every league you argue about",
  sub: "Tap through — we’ll drop you on the right filter.",
} as const;

export const homeHowItWorks = {
  title: "How it works",
  steps: [
    {
      n: "01",
      title: "Find the game",
      body: "Champions League, NBA, Grand Slam, UFC — pick the market that’s moving.",
    },
    {
      n: "02",
      title: "Buy the side you believe",
      body: "YES or NO while prices still breathe. No house line — just the book.",
    },
    {
      n: "03",
      title: "Exit or hold",
      body: "Trim before kickoff or ride to settlement. Copy someone sharper if you want their sizing.",
    },
  ],
} as const;

export const homeWhy = {
  title: "Why traders stay",
  cards: [
    {
      title: "Trade early",
      body: "Markets live until the walkout. Get in while sentiment still shifts.",
    },
    {
      title: "Get out early",
      body: "Changed your read? Peel size before kickoff — liquidity willing.",
    },
    {
      title: "Prices breathe",
      body: "Lines update with flow, not a trader behind a desk hiding limits.",
    },
    {
      title: "Copy in one tap",
      body: "Leaderboard traders show receipts. Mirror their next play when you agree.",
    },
  ],
} as const;

export const homeTrust = {
  title: "No black boxes",
  sub: "Markets resolve with on-chain rules you can read — trade knowing how settlement works.",
  cards: [
    { title: "Your keys", body: "Non-custodial by default — we never touch your wallet seed." },
    { title: "No KYC theater", body: "Connect and trade. Keep your identity off the table." },
    { title: "Audited stack", body: "Battle-tested contracts and oracle resolution — not a napkin sketch." },
  ],
} as const;

export const footerTagline = "Sports prediction markets for people who actually trade them.";
