import { createFileRoute, Link } from '@tanstack/react-router';
import { useWallet } from '~/store/useWalletStore';
import { useDemoAccount } from '~/hooks/useDemoAccount';
import { EmptyTradingState } from '~/components/trading/EmptyTradingState';
import { useMemo } from 'react';
import { useMarketSummaries } from '~/hooks/useMarketSummaries';
import { normalizeWalletForQuery } from '~/utils/walletQuery';
import { useUserPositions } from '~/hooks/useUserPositions';
import { usePaperWalletBalance } from '~/hooks/usePaperWalletBalance';
import { PositionLifecycleBoard } from '~/components/positions/PositionLifecycleBoard';
import { SettlementOracleBanner } from '~/components/protocol/SettlementOracleBanner';
import { formatPaperCashDisplay } from '~/lib/formatPaperCash';

export const Route = createFileRoute('/trading/')({
  component: TradingPage,
});

function TradingPage() {
  const { isConnected, address } = useWallet();
  const { cashUsdc: paperCash, isBalanceLoading } = usePaperWalletBalance();
  const { balance: demoBalance } = useDemoAccount();
  const walletKey = normalizeWalletForQuery(address);

  const positionsQuery = useUserPositions({
    status: 'all',
    enabled: !!walletKey && isConnected,
    refetchInterval: 12_000,
  });

  const orders = positionsQuery.data?.positions ?? [];
  const openOrders = useMemo(
    () => orders.filter((o) => o.status === 'open'),
    [orders],
  );

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
  const currentBalance = isConnected ? paperCash : demoBalance;
  const positionsLoading = isConnected && !!walletKey && positionsQuery.isLoading;
  const hasAnyPosition = orders.length > 0;

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <div className="pb-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="font-syne font-bold text-4xl mb-2">Trading</h1>
              <p className="text-gray-400">Connect your wallet to view positions and settlement state.</p>
            </div>
            <EmptyTradingState />
          </div>
        </div>
      </div>
    );
  }

  if (positionsLoading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4">
        <p className="text-gray-400">Loading positions…</p>
      </div>
    );
  }

  if (!hasAnyPosition) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <div className="pb-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="font-syne font-bold text-4xl mb-2">Trading</h1>
              <p className="text-gray-400">Your canonical position & lifecycle surface</p>
            </div>
            {positionsQuery.isError && (
              <p className="mb-4 text-sm text-red-400">Could not load positions. Try again shortly.</p>
            )}
            <EmptyTradingState />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-syne font-bold text-4xl mb-2">Trading</h1>
              <p className="text-gray-400">
                All positions, lifecycle, and settlement state — prices refresh ~15s on this page.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Paper trading · {openOrders.length} open · {orders.length - openOrders.length} resolved
              </p>
            </div>
            <div className="text-right">
              <span className="text-gray-500 text-sm">Balance </span>
              <span className="font-mono font-semibold text-brand-green">
                ${formatPaperCashDisplay(currentBalance, isBalanceLoading)}
              </span>
            </div>
          </div>

          <SettlementOracleBanner positions={openOrders} marketById={marketById} />

          <PositionLifecycleBoard positions={orders} marketById={marketById} />

          <div className="mt-8 flex flex-wrap gap-4 text-sm">
            <Link
              to="/wallet/transactions"
              className="text-brand-green hover:text-brand-green/80 font-semibold"
            >
              Full activity ledger →
            </Link>
            <Link to="/portfolio" className="text-gray-400 hover:text-white">
              Portfolio & PnL →
            </Link>
            <Link to="/markets" className="text-gray-400 hover:text-white">
              Browse markets →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
