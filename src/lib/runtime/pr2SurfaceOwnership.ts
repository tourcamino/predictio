/**
 * PR2 runtime ownership matrix — which API each product surface uses for wallet/catalog reads.
 * Update when wiring changes. Grep anchor: PR2_SURFACE_OWNERSHIP
 */

export type Pr2SurfaceOwnershipRow = {
  surface: string;
  route: string;
  walletReads: string;
  catalogReads: string;
  mocks: string;
  notes: string;
};

export const PR2_SURFACE_OWNERSHIP: readonly Pr2SurfaceOwnershipRow[] = [
  {
    surface: "Trading",
    route: "/trading",
    walletReads: "Express when SPA≠API (`useUserPositions`, `usePaperWalletBalance`)",
    catalogReads: "REST market snapshots via `useMarketSummaries` (12s poll)",
    mocks: "None on positions path",
    notes: "Canonical lifecycle board + oracle banner",
  },
  {
    surface: "Portfolio",
    route: "/portfolio",
    walletReads: "Express (`usePortfolioSummary`, `useUserPositions`, performance history)",
    catalogReads: "REST summaries 25s poll for MTM",
    mocks: "Demo mode only when disconnected",
    notes: "No full position list duplicate; exposure summary only",
  },
  {
    surface: "Wallet ledger",
    route: "/wallet/transactions",
    walletReads: "Express `useTransactionHistory`",
    catalogReads: "n/a",
    mocks: "None",
    notes: "Lifecycle semantic labels on rows",
  },
  {
    surface: "Copy trading",
    route: "/copy",
    walletReads: "tRPC follow/copy mutations; wallet-gated",
    catalogReads: "Analyst leaderboard tRPC (DB-backed)",
    mocks: "No seeded trade feed; empty states when quiet",
    notes: "Football filter when football focus enabled",
  },
  {
    surface: "Liquidity",
    route: "/liquidity",
    walletReads: "Express LP positions when canonical",
    catalogReads: "GET /api/markets curated catalog",
    mocks: "APY history may be sparse — no synthetic LP charts in PR2 scope",
    notes: "Invalidates portfolio on LP change",
  },
  {
    surface: "Market detail",
    route: "/markets/$id",
    walletReads: "TradingBox → Express place order",
    catalogReads: "REST fallback market detail",
    mocks: "No synthetic price chart; order book placeholder",
    notes: "Oracle status panel for stale Prematch",
  },
  {
    surface: "Settlement cron",
    route: "VPS `runGlobalPaperSettlementTick`",
    walletReads: "Postgres VPS",
    catalogReads: "Azuro GraphQL oracle",
    mocks: "None",
    notes: "Structured `settlement_diagnostic` logs per skipped market",
  },
];
