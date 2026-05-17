import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useWallet } from '~/store/useWalletStore';
import { useDemoAccount } from '~/hooks/useDemoAccount';
import { EmptyTradingState } from '~/components/trading/EmptyTradingState';
import { useEffect, useMemo } from 'react';
import { useMarketSummaries } from '~/hooks/useMarketSummaries';
import { normalizeWalletForQuery } from '~/utils/walletQuery';
import { useUserPositions } from '~/hooks/useUserPositions';
import { usePaperWalletBalance } from '~/hooks/usePaperWalletBalance';
import { PositionLifecycleBoard } from '~/components/positions/PositionLifecycleBoard';
import { SettlementOracleBanner } from '~/components/protocol/SettlementOracleBanner';
import { formatPaperCashDisplay } from '~/lib/formatPaperCash';
import { TradingTerminalShell } from '~/components/trading/TradingTerminalShell';
import { PositionsList } from '~/components/trading/PositionsList';
import { PositionDetail } from '~/components/trading/PositionDetail';
import { useTradingStore } from '~/store/tradingStore';
import {
  mapDbOrdersToTradingPositions,
  mapDemoPositionToTradingPosition,
} from '~/lib/trading/mapDbOrderToTradingPosition';
import { deriveLivePositionFromQuote } from '~/lib/trading/deriveLivePositionFromQuote';
import {
  countAwaitingOracleSettlement,
  toCanonicalTradingBucket,
  derivePositionLifecycle,
} from '~/lib/position/derivePositionLifecycle';
import { Users } from 'lucide-react';
import { ProtocolSurfaceWayfinder } from '~/components/protocol/ProtocolSurfaceWayfinder';
import { SettlementTimelineSection } from '~/components/protocol/SettlementTimelineSection';

export const Route = createFileRoute('/trading/')({
  component: TradingPage,
});

function TradingPage() {
  const { isConnected, address } = useWallet();
  const { cashUsdc: paperCash, isBalanceLoading } = usePaperWalletBalance();
  const { balance: demoBalance, positions: demoPositions } = useDemoAccount();
  const walletKey = normalizeWalletForQuery(address);
  const navigate = useNavigate();

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

  const settlingCount = useMemo(
    () => countAwaitingOracleSettlement(openOrders, marketById),
    [openOrders, marketById],
  );

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
    } else if (!selectedPositionId && displayOpenPositions.length > 0) {
      selectPosition(displayOpenPositions[0]!.id);
    }
  }, [isConnected, walletKey, displayOpenPositions, selectedPositionId, selectPosition]);

  const selectedPosition = displayOpenPositions.find((p) => p.id === selectedPositionId);

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
        subtitle="Your command center for open risk, mark-to-market, and protocol settlement state."
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
    <TradingTerminalShell
      title="Trading"
      subtitle="Professional mark-to-market · select a position for depth, order context, and execution."
      balanceLabel="Paper USDC"
      balanceValue={`$${formatPaperCashDisplay(currentBalance, isBalanceLoading)}`}
      openCount={openOrders.length}
      settlingCount={settlingCount}
    >
      <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-brand-green/20 bg-gradient-to-r from-brand-green/10 to-transparent px-5 py-4">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-brand-green" />
          <p className="text-sm text-gray-300">
            <span className="font-semibold text-white">Copy conviction.</span> Mirror top traders on
            the protocol.
          </p>
        </div>
        <Link to="/copy" className="shrink-0 text-sm font-semibold text-brand-green hover:text-brand-green/80">
          Explore copy trading →
        </Link>
      </div>

      <SettlementOracleBanner positions={openOrders} marketById={marketById} />

      {selectedPosition && (
        <div className="mb-6 lg:hidden">
          <SettlementTimelineSection
            marketId={selectedPosition.marketId}
            market={marketById[selectedPosition.marketId] ?? null}
            order={openOrders.find((o) => o.id === selectedPosition.id) ?? undefined}
            compact
          />
        </div>
      )}

      <div className="hidden lg:grid lg:h-[calc(100vh-340px)] lg:grid-cols-[380px_1fr] lg:gap-6">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <PositionsList positions={displayOpenPositions} />
        </div>
        <div className="overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] shadow-[0_24px_60px_rgba(0,0,0,0.4)] scrollbar-hide">
          {selectedPosition ? (
            <PositionDetail position={selectedPosition} />
          ) : (
            <div className="flex h-full min-h-[320px] items-center justify-center p-8 text-center">
              <p className="text-gray-500">Select an open position for the full trading panel</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 space-y-3 lg:hidden">
        {displayOpenPositions.map((position) => {
          const live = deriveLivePositionFromQuote(position, marketPrices[position.marketId]);
          const terminal =
            position.status === 'resolved' ||
            position.status === 'cancelled' ||
            position.status === 'refunded';
          const displayPnl = terminal ? position.unrealizedPnl : live.unrealizedPnl;
          const pnlClass = displayPnl >= 0 ? 'text-brand-green' : 'text-red-400';
          return (
            <button
              key={position.id}
              type="button"
              onClick={() => navigate({ to: '/trading/position/$id', params: { id: position.id } })}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition-all hover:border-brand-green/40 hover:shadow-[0_0_24px_rgba(0,255,135,0.08)]"
            >
              <h3 className="truncate font-semibold">{position.marketName}</h3>
              <p className="text-sm text-gray-500">{position.outcome}</p>
              <p className={`mt-2 font-mono font-bold ${pnlClass}`}>
                {displayPnl >= 0 ? '+' : ''}${displayPnl.toFixed(2)}
              </p>
            </button>
          );
        })}
      </div>

      {lifecycleTailOrders.length > 0 && (
        <div className="mt-10 border-t border-white/10 pt-10">
          <PositionLifecycleBoard
            positions={lifecycleTailOrders}
            marketById={marketById}
            premium
            hideCanonicalHelp
          />
        </div>
      )}

      <ProtocolSurfaceWayfinder current="/trading" />

      <div className="mt-8 flex flex-wrap gap-4 border-t border-white/10 pt-8 text-sm">
        <Link to="/wallet/transactions" className="font-semibold text-brand-green hover:text-brand-green/80">
          Activity ledger →
        </Link>
        <Link to="/portfolio" className="text-gray-400 hover:text-white">
          Portfolio & PnL →
        </Link>
        <Link to="/markets" className="text-gray-400 hover:text-white">
          Markets →
        </Link>
      </div>
    </TradingTerminalShell>
  );
}
