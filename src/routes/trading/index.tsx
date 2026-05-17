import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useWallet } from '~/store/useWalletStore';
import { useDemoAccount } from '~/hooks/useDemoAccount';
import { EmptyTradingState } from '~/components/trading/EmptyTradingState';
import { useEffect, useMemo } from 'react';
import { useMarketSummaries } from '~/hooks/useMarketSummaries';
import { normalizeWalletForQuery } from '~/utils/walletQuery';
import { useUserPositions } from '~/hooks/useUserPositions';
import { usePaperWalletBalance } from '~/hooks/usePaperWalletBalance';
import { formatPaperCashDisplay } from '~/lib/formatPaperCash';
import { TradingTerminalShell } from '~/components/trading/TradingTerminalShell';
import { PositionDetail } from '~/components/trading/PositionDetail';
import { useTradingStore } from '~/store/tradingStore';
import {
  mapDbOrdersToTradingPositions,
  mapDemoPositionToTradingPosition,
} from '~/lib/trading/mapDbOrderToTradingPosition';
import {
  toCanonicalTradingBucket,
  derivePositionLifecycle,
} from '~/lib/position/derivePositionLifecycle';
import { useCanonicalProtocolRefetch } from '~/hooks/useCanonicalProtocolRefetch';
import { TradingDeskHeader } from '~/components/trading/TradingDeskHeader';
import {
  TraderPositionsBoard,
  aggregateDeskStats,
} from '~/components/trading/TraderPositionsBoard';
import { buildTraderDeskRow } from '~/lib/trading/traderPositionDesk';
import { TradingOpsCollapsible } from '~/components/trading/TradingOpsCollapsible';
import { X } from 'lucide-react';

export const Route = createFileRoute('/trading/')({
  component: TradingPage,
});

function TradingPage() {
  const { isConnected, address } = useWallet();
  const { cashUsdc: paperCash, isBalanceLoading } = usePaperWalletBalance();
  const { balance: demoBalance, positions: demoPositions } = useDemoAccount();
  const walletKey = normalizeWalletForQuery(address);
  const navigate = useNavigate();
  useCanonicalProtocolRefetch(walletKey);

  const selectedPositionId = useTradingStore((s) => s.selectedPositionId);
  const selectPosition = useTradingStore((s) => s.selectPosition);
  const updateMarketPrice = useTradingStore((s) => s.updateMarketPrice);
  const marketPrices = useTradingStore((s) => s.marketPrices);

  const positionsQuery = useUserPositions({
    status: 'all',
    enabled: !!walletKey && isConnected,
    refetchInterval: 12_000,
  });

  const orders = positionsQuery.data?.positions ?? [];
  const openOrders = useMemo(() => orders.filter((o) => o.status === 'open'), [orders]);

  const positionMarketIds = useMemo(
    () => [...new Set(orders.map((o) => o.marketId))],
    [orders],
  );

  const marketSummariesQuery = useMarketSummaries({
    marketIds: positionMarketIds,
    enabled: !!walletKey && isConnected && positionMarketIds.length > 0,
    staleTime: 10_000,
    refetchInterval: 12_000,
  });

  const marketById = marketSummariesQuery.data ?? {};

  const activeTradingOrders = useMemo(
    () =>
      orders.filter((o) => {
        const market = marketById[o.marketId] ?? null;
        const bucket = toCanonicalTradingBucket(
          derivePositionLifecycle(o, market).bucket,
          o.status,
        );
        return bucket === 'OPEN';
      }),
    [orders, marketById],
  );

  const currentBalance = isConnected ? paperCash : demoBalance;
  const positionsLoading = isConnected && !!walletKey && positionsQuery.isLoading;
  const hasAnyPosition = orders.length > 0;

  const dbTradingOpen = useMemo(
    () => mapDbOrdersToTradingPositions(activeTradingOrders, marketById),
    [activeTradingOrders, marketById],
  );

  const demoTradingPositions = useMemo(
    () => demoPositions.map((p, i) => mapDemoPositionToTradingPosition(p, i)),
    [demoPositions],
  );

  const displayOpenPositions = isConnected ? dbTradingOpen : demoTradingPositions;

  const deskRows = useMemo(
    () =>
      displayOpenPositions.map((p) =>
        buildTraderDeskRow(
          p,
          marketById[p.marketId] ?? null,
          openOrders.find((o) => o.id === p.id) ?? orders.find((o) => o.id === p.id) ?? null,
          marketPrices[p.marketId],
        ),
      ),
    [displayOpenPositions, marketById, openOrders, orders, marketPrices],
  );

  const deskStats = useMemo(() => aggregateDeskStats(deskRows), [deskRows]);

  const lifecycleTailOrders = useMemo(
    () =>
      orders.filter((o) => {
        const market = marketById[o.marketId] ?? null;
        const bucket = toCanonicalTradingBucket(
          derivePositionLifecycle(o, market).bucket,
          o.status,
        );
        return bucket === 'SETTLING' || bucket === 'RESOLVED';
      }),
    [orders, marketById],
  );

  useEffect(() => {
    if (!marketSummariesQuery.data) return;
    for (const [marketId, market] of Object.entries(marketSummariesQuery.data)) {
      if (!market) continue;
      updateMarketPrice(marketId, {
        marketId,
        last: market.yesPrice,
        change24h: 0,
        changePct24h: 0,
        volume24h: market.volume ?? 0,
        timestamp: Date.now(),
      });
    }
  }, [marketSummariesQuery.data, updateMarketPrice]);

  useEffect(() => {
    if (!isConnected || !walletKey) return;
    const ids = new Set(displayOpenPositions.map((p) => p.id));
    if (selectedPositionId && !ids.has(selectedPositionId)) {
      selectPosition(displayOpenPositions[0]?.id ?? null);
    }
  }, [isConnected, walletKey, displayOpenPositions, selectedPositionId, selectPosition]);

  const selectedPosition = displayOpenPositions.find((p) => p.id === selectedPositionId);

  const openDetail = (id: string) => {
    selectPosition(id);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      navigate({ to: '/trading/position/$id', params: { id } });
    }
  };

  const openSell = (id: string) => {
    selectPosition(id);
    navigate({ to: '/trading/position/$id', params: { id } });
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <div className="px-4 pb-20">
          <div className="mx-auto max-w-7xl pt-8">
            <h1 className="font-syne mb-2 text-4xl font-bold">Trading</h1>
            <p className="mb-8 text-gray-400">Connect your wallet to open the live trading terminal.</p>
            <EmptyTradingState />
          </div>
        </div>
      </div>
    );
  }

  if (positionsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4">
        <p className="font-mono text-sm text-gray-400">Syncing positions…</p>
      </div>
    );
  }

  if (!hasAnyPosition) {
    return (
      <TradingTerminalShell
        title="Trading"
        subtitle="Your open positions and mark-to-market P&L."
        balanceValue={`$${formatPaperCashDisplay(currentBalance, isBalanceLoading)}`}
      >
        {positionsQuery.isError && (
          <p className="mb-4 text-sm text-red-400">Could not load positions. Try again shortly.</p>
        )}
        <EmptyTradingState />
      </TradingTerminalShell>
    );
  }

  return (
    <TradingTerminalShell title="" subtitle="" traderFirst>
      <TradingDeskHeader
        totalOpenPnl={deskStats.totalPnl}
        totalOpenPnlPct={deskStats.totalPnlPct}
        openCount={deskStats.openCount}
        liveCount={deskStats.liveCount}
        settlingCount={deskStats.settlingCount}
        balanceLabel="Paper USDC"
        balanceValue={`$${formatPaperCashDisplay(currentBalance, isBalanceLoading)}`}
      />

      <TraderPositionsBoard
        positions={displayOpenPositions}
        orders={orders}
        marketById={marketById}
        selectedPositionId={selectedPositionId}
        onSelect={openDetail}
        onSell={openSell}
      />

      {selectedPosition ? (
        <aside className="fixed inset-y-0 right-0 z-50 hidden w-full max-w-md border-l border-white/10 bg-brand-bg shadow-[-24px_0_80px_rgba(0,0,0,0.6)] lg:block">
          <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
            <p className="font-mono text-xs uppercase tracking-wider text-gray-500">Position desk</p>
            <button
              type="button"
              onClick={() => selectPosition(null)}
              className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"
              aria-label="Close panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="h-[calc(100vh-3.5rem)] overflow-y-auto scrollbar-hide">
            <PositionDetail position={selectedPosition} />
          </div>
        </aside>
      ) : null}

      <TradingOpsCollapsible
        openOrders={openOrders}
        marketById={marketById}
        lifecycleTailOrders={lifecycleTailOrders}
      />
    </TradingTerminalShell>
  );
}
