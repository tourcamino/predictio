import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useWallet } from '~/store/useWalletStore';
import { useDemoAccount } from '~/hooks/useDemoAccount';
import { EmptyTradingState } from '~/components/trading/EmptyTradingState';
import { PositionsList } from '~/components/trading/PositionsList';
import { PositionDetail } from '~/components/trading/PositionDetail';
import { OrderHistory } from '~/components/trading/OrderHistory';
import { useTradingStore } from '~/store/tradingStore';
import { Wallet, Users, Copy } from 'lucide-react';
import { useEffect } from 'react';

export const Route = createFileRoute('/trading/')({
  component: TradingPage,
});

function TradingPage() {
  const { isConnected, openWalletModal, balance, address } = useWallet();
  const { isActive: isDemoActive, positions: demoPositions, balance: demoBalance } = useDemoAccount();
  
  // Initialize mock positions for demo (in production, fetch from API)
  const positions = useTradingStore((state) => state.positions);
  const selectedPositionId = useTradingStore((state) => state.selectedPositionId);
  const setPositions = useTradingStore((state) => state.setPositions);
  const selectPosition = useTradingStore((state) => state.selectPosition);
  const navigate = useNavigate();

  // Use demo positions when wallet is not connected
  const displayPositions = isConnected ? positions : demoPositions.map((demoPos, index) => ({
    id: `demo-${index}`,
    marketId: demoPos.marketId,
    marketName: demoPos.marketTitle,
    outcome: `${demoPos.outcome} wins`,
    side: demoPos.outcome,
    shares: demoPos.shares,
    entryPrice: demoPos.avgPrice,
    costBasis: demoPos.shares * demoPos.avgPrice,
    currentValue: demoPos.shares * demoPos.currentPrice,
    unrealizedPnl: (demoPos.shares * demoPos.currentPrice) - (demoPos.shares * demoPos.avgPrice),
    unrealizedPnlPct: ((demoPos.currentPrice - demoPos.avgPrice) / demoPos.avgPrice) * 100,
    openedAt: new Date(demoPos.openedAt),
    status: 'live' as const,
    marketEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  }));

  const currentBalance = isConnected ? balance : demoBalance;

  // Initialize mock positions if none exist and wallet is connected
  useEffect(() => {
    if (positions.length === 0 && isConnected) {
      const mockPositions = [
        {
          id: 'pos-1',
          marketId: 'mkt-123',
          marketName: 'Inter Milan vs AC Milan',
          outcome: 'Inter Milan wins',
          side: 'YES' as const,
          shares: 500,
          entryPrice: 0.65,
          costBasis: 325,
          currentValue: 350,
          unrealizedPnl: 25,
          unrealizedPnlPct: 7.69,
          openedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          status: 'live' as const,
          marketEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        },
        {
          id: 'pos-2',
          marketId: 'mkt-456',
          marketName: 'Real Madrid vs Barcelona',
          outcome: 'Real Madrid wins',
          side: 'YES' as const,
          shares: 300,
          entryPrice: 0.55,
          costBasis: 165,
          currentValue: 150,
          unrealizedPnl: -15,
          unrealizedPnlPct: -9.09,
          openedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          status: 'live' as const,
          marketEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        },
      ];
      setPositions(mockPositions);
      selectPosition(mockPositions[0].id);
    }
    // setPositions / selectPosition are stable Zustand actions; omitting from deps avoids loops.
  }, [positions.length, isConnected]);

  const selectedPosition = displayPositions.find((p) => p.id === selectedPositionId);

  // Determine if we have positions
  const hasPositions = displayPositions.length > 0;

  // No positions - show empty state (but don't require wallet)
  if (!hasPositions) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <div className="pb-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="font-syne font-bold text-4xl mb-2">Trading</h1>
              <p className="text-gray-400">Manage your active positions</p>
              {!isConnected && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                  <span className="text-xs text-purple-400 font-semibold">
                    DEMO MODE · ${demoBalance.toFixed(0)} USDC virtual balance
                  </span>
                </div>
              )}
            </div>
            <EmptyTradingState />
          </div>
        </div>
      </div>
    );
  }

  // Has positions - show trading dashboard
  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Copy Trading Banner */}
          <div className="mb-6 px-6 py-4 bg-brand-green/10 border border-brand-green/30 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💡</span>
              <span className="text-sm sm:text-base text-gray-300">
                <span className="font-semibold text-white">New to trading?</span> Copy top traders automatically.
              </span>
            </div>
            <a
              href="/copy"
              className="text-brand-green font-semibold text-sm hover:text-brand-green/80 transition-colors whitespace-nowrap"
            >
              Explore Copy Trading →
            </a>
          </div>

          <div className="mb-8">
            <h1 className="font-syne font-bold text-4xl mb-2">Trading</h1>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Manage your active positions</p>
                {!isConnected && (
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                    <span className="text-xs text-purple-400 font-semibold">
                      DEMO MODE · Trading with virtual balance
                    </span>
                  </div>
                )}
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Balance: </span>
                <span className="font-mono font-semibold">${currentBalance.toFixed(2)} USDC</span>
                {!isConnected && (
                  <span className="ml-2 text-xs text-purple-400">(Virtual)</span>
                )}
              </div>
            </div>
          </div>

          {/* Desktop: Split View */}
          <div className="hidden lg:grid lg:grid-cols-[380px_1fr] lg:gap-6 lg:h-[calc(100vh-280px)]">
            {/* Left Column: Positions List */}
            <div className="overflow-hidden">
              <PositionsList />
            </div>

            {/* Right Column: Position Detail */}
            <div className="overflow-y-auto scrollbar-hide">
              {selectedPosition ? (
                <PositionDetail position={selectedPosition} />
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-lg p-6 flex items-center justify-center h-full">
                  <p className="text-gray-400">Select a position to view details</p>
                </div>
              )}
            </div>
          </div>

          {/* Mobile: List View */}
          <div className="lg:hidden space-y-4">
            {displayPositions.map((position) => {
              const pnlFormatted = position.unrealizedPnl >= 0 
                ? { text: `+$${position.unrealizedPnl.toFixed(2)}`, colorClass: 'text-brand-green' }
                : { text: `-$${Math.abs(position.unrealizedPnl).toFixed(2)}`, colorClass: 'text-red-500' };
              
              return (
                <button
                  key={position.id}
                  onClick={() => navigate({ to: '/trading/position/$id', params: { id: position.id } })}
                  className="w-full text-left bg-white/5 border border-white/10 rounded-lg p-4 hover:border-brand-green/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{position.marketName}</h3>
                      <p className="text-sm text-gray-400 truncate">{position.outcome}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Current Value</div>
                      <div className="font-mono font-semibold">${position.currentValue.toFixed(2)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 mb-1">Unrealized P&L</div>
                      <div className={`font-mono font-bold ${pnlFormatted.colorClass}`}>
                        {pnlFormatted.text}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Social Trading Section */}
          {hasPositions && (
            <div className="mt-8 bg-gradient-to-r from-brand-cyan/10 to-brand-green/10 border border-brand-cyan/30 rounded-xl p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-brand-cyan/20 rounded-full flex items-center justify-center">
                    <Users className="w-8 h-8 text-brand-cyan" />
                  </div>
                  <div>
                    <h3 className="font-syne font-bold text-2xl mb-2">
                      Discover Social Trading
                    </h3>
                    <p className="text-gray-400">
                      Follow top traders and automatically copy their strategies. Learn from the best while you trade.
                    </p>
                  </div>
                </div>
                <a
                  href="/copy"
                  className="px-8 py-4 bg-brand-cyan text-brand-bg font-bold rounded-lg hover:bg-brand-cyan/90 transition-colors whitespace-nowrap flex items-center gap-2"
                >
                  <Copy className="w-5 h-5" />
                  Explore Traders
                </a>
              </div>
            </div>
          )}

          {/* Order History Section */}
          {hasPositions && (
            <div className="mt-8">
              <OrderHistory walletAddress={isConnected ? (address || '') : 'demo'} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

