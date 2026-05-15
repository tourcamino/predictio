/** Liquidity route — market-terminal tone (avoid protocol-internals wording). */

export const liquidityPageHero = {
  preTestnetTitle: "Live capital · mapped to the board",
  liveTitle: "Vault pulse",
  preTestnetSub:
    "See how the pool leans into the same open markets as the homepage — weights breathe with flow and attention, not admin sliders.",
  liveSub: "Your deposits stack behind the live book — sized where traders are actually playing.",
  microPre:
    "Practice environment: numbers follow the real curated book so the room never looks empty. When we flip testnet, your USDC tags the same lanes.",
} as const;

export const liquidityTerminal = {
  tickerPrefix: "BOOK SYNC",
  columnEvent: "Event",
  columnLeague: "Competition",
  columnHeat: "Heat",
  columnWeight: "Pool %",
  columnNotional: "Notional",
  heatHot: "Blazing",
  heatWarm: "Heating",
  heatCool: "Baseline",
  sourceVault: "Vault snapshot",
  sourceFeed: "Live book (synced)",
  emptyTitle: "Markets API offline",
  emptySub: "We’ll remap as soon as the curated feed responds — try refreshing in a few seconds.",
  footnote:
    "Splits mirror production logic — busier lines pull more size, quiet windows spread weight across the board so every lane stays touchable.",
} as const;

export const liquidityStats = {
  poolLabelPractice: "Practice pool (USDC)",
  poolLabelLive: "Vault TVL",
  poolHintPractice: "Sized across today’s open markets · not a holding account in your wallet",
  apyWhenLive: "Vault APY",
  apyPracticeTitle: "Fee share",
  apyPracticeBody: "Fees hit once there’s tape on testnet — until then watch the book, not a fake yield.",
  marketsOpen: "Markets live",
  marketsOpenHint: "Pulled from the same OPEN set as /markets",
} as const;

export const liquidityDepositPanel = {
  title: "Back the book",
  body:
    "Lock USDC into the vault. You earn on every taker slice while your size ladders across the games traders care about.",
  cta: "Add size to vault",
  bullets: ["Half the taker fee → LPs", "Withdraw whenever", "On-chain when testnet is live"],
} as const;

export const liquidityValueProp = {
  title: "Why park size here?",
  sub: "One pool, many games — traders bring volume, you collect the skim.",
  cards: [
    {
      title: "Earn on every swipe",
      body: "Takers pay to trade — LPs split half the take, pro-rata to what you deposited.",
    },
    {
      title: "Hands-off rotation",
      body: "No picking individual matches — size follows the live board so exposure stays where attention is.",
    },
    {
      title: "Contracts, not promises",
      body: "Funds sit in audited vault code — pull when you want, penalties only from market outcomes.",
    },
    {
      title: "Diversified tape",
      body: "Basketball, football, combat, motorsport — you’re not trapped in a single result.",
    },
  ],
} as const;

export const liquidityHowItWorks = {
  title: "Three beats",
  steps: [
    {
      title: "Pool stacks once",
      body: "Single vault, single program — capital isn’t stranded in dead silos.",
    },
    {
      title: "Board drives the split",
      body: "Open markets from the curated book get weight; busy lines pull more automatically.",
    },
    {
      title: "Fees route to you",
      body: "Every fill feeds LPs, analysts, and referrals — transparent slices, no hidden skims.",
    },
  ],
} as const;

export const liquidityFaq = {
  title: "Straight answers",
} as const;

export const liquidityBottomCta = {
  title: "Ready to back the tape?",
  sub: "Jump into the markets you just saw — add vault size when you want passive skim too.",
  button: "Open markets",
} as const;
