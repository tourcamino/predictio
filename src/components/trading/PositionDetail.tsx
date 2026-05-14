import { useState, useMemo } from 'react';
import { Clock, TrendingUp, Activity } from 'lucide-react';
import type { Position } from '~/store/tradingStore';
import { usePositionRealtime } from '~/hooks/usePositionRealtime';
import { useWallet } from '~/store/useWalletStore';
import { SellControls } from './SellControls';
import { AddToPositionControls } from './AddToPositionControls';
import { TradeConfirmationModal } from './TradeConfirmationModal';
import { OrderBook } from '~/components/markets/OrderBook';
import { RecentTradesFeed } from '~/components/markets/RecentTradesFeed';
import { formatPnL, formatPctChange } from '~/lib/trading/calculations';
import { deriveLivePositionFromQuote } from '~/lib/trading/deriveLivePositionFromQuote';
import { isLiveMode } from '~/config/chain';
import { useDemoAccount } from '~/hooks/useDemoAccount';
import { usePaperWalletBalance } from '~/hooks/usePaperWalletBalance';
import { executePlacePredictionWithDiagnostics } from '~/lib/executePlacePredictionWithDiagnostics';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC, useTRPCClient } from '~/trpc/react';
import { normalizeWalletForQuery } from '~/utils/walletQuery';
import { invalidateWalletPortfolioLpQueries } from '~/utils/invalidateWalletPortfolioLpQueries';
import {
  invalidateWalletNotifications,
} from '~/utils/invalidateWalletNotifications';

function positionDetailExecDevLog(phase: string, extra?: Record<string, unknown>) {
  if (!import.meta.env.DEV || import.meta.env.VITE_POSITION_EXEC_DEBUG !== '1') return;
  // eslint-disable-next-line no-console
  console.info('[position-detail-exec]', phase, extra ?? {});
}

interface PositionDetailProps {
  position: Position;
}

type TransactionState = 'review' | 'pending' | 'mining' | 'success' | 'error';
type TradeType = 'sell' | 'add';

export function PositionDetail({ position }: PositionDetailProps) {
  const { isConnected, address } = useWallet();
  const { cashUsdc: paperCashUsdc } = usePaperWalletBalance();
  const walletKey = normalizeWalletForQuery(address);
  const isDemoPosition = position.id.startsWith('demo-');
  /** Connected paper wallet + real order row — DB mutations only, no local portfolio store. */
  const usePaperRuntime = isConnected && !!walletKey && !isDemoPosition;

  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();
  const { executeDemoTrade, refreshState, balance: demoBalance } = useDemoAccount();

  const invalidatePaperQueries = () => {
    if (walletKey) {
      invalidateWalletPortfolioLpQueries(queryClient, trpc, walletKey);
      invalidateWalletNotifications(queryClient, trpc.getNotifications.queryKey, walletKey);
    }
    void queryClient.invalidateQueries({
      queryKey: trpc.getMarketDetail.queryKey({ marketId: position.marketId }),
    });
  };

  const closePositionMutation = useMutation(
    trpc.closePosition.mutationOptions({
      onSuccess: () => {
        invalidatePaperQueries();
      },
    }),
  );

  const placePredictionMutation = useMutation({
    mutationFn: (input: {
      marketId: string;
      outcome: string;
      amount: number;
      walletAddress: string;
      orderType: 'MARKET' | 'LIMIT';
      limitPrice?: number;
    }) =>
      executePlacePredictionWithDiagnostics(
        (i) => trpcClient.placePrediction.mutate(i),
        input,
      ),
    onSuccess: () => {
      invalidatePaperQueries();
    },
  });
  const { marketPrice, orderbook, recentTrades, wsStatus } = usePositionRealtime(position.marketId);

  const live = useMemo(
    () => deriveLivePositionFromQuote(position, marketPrice),
    [position, marketPrice],
  );
  const terminal = position.status === 'resolved' || position.status === 'cancelled' || position.status === 'refunded';
  const currentPrice = live.lastPrice;
  const headerPnl = terminal ? position.unrealizedPnl : live.unrealizedPnl;
  const headerPnlPct = terminal ? position.unrealizedPnlPct : live.unrealizedPnlPct;
  const headerCurrentValue = terminal ? position.currentValue : live.currentValue;

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalState, setModalState] = useState<TransactionState>('review');
  const [tradeType, setTradeType] = useState<TradeType>('sell');
  const [txHash, setTxHash] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  // Trade details
  const [tradeShares, setTradeShares] = useState(0);
  const [tradePrice, setTradePrice] = useState(0);
  const [tradeAmount, setTradeAmount] = useState(0);
  const [tradeProceeds, setTradeProceeds] = useState(0);
  const [tradeRealizedPnL, setTradeRealizedPnL] = useState(0);
  const [tradeRealizedPnLPct, setTradeRealizedPnLPct] = useState(0);
  const [tradeNewAvgEntry, setTradeNewAvgEntry] = useState(0);
  const [tradeTotalShares, setTradeTotalShares] = useState(0);
  const [tradeFee, setTradeFee] = useState(0);

  const pnlFormatted = formatPnL(headerPnl);
  const pctFormatted = formatPctChange(headerPnlPct);
  
  // Format time until market ends
  const timeUntilEnd = position.marketEndsAt.getTime() - Date.now();
  const daysUntilEnd = Math.floor(timeUntilEnd / (1000 * 60 * 60 * 24));
  const hoursUntilEnd = Math.floor((timeUntilEnd % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  const handleSellClick = (shares: number, proceeds: number, realizedPnL: number, realizedPnLPct: number) => {
    setTradeType('sell');
    setTradeShares(shares);
    setTradePrice(currentPrice);
    setTradeProceeds(proceeds);
    setTradeRealizedPnL(realizedPnL);
    setTradeRealizedPnLPct(realizedPnLPct);
    setModalState('review');
    setModalOpen(true);
  };

  const handleSellConfirm = async () => {
    setModalState('pending');
    setError('');

    try {
      if (usePaperRuntime) {
        positionDetailExecDevLog('sell.paper.closePosition', { orderId: position.id });
        const price = Math.max(currentPrice, 0.001);
        const data = await closePositionMutation.mutateAsync({
          orderId: position.id,
          walletAddress: walletKey,
          sharesToSell: tradeShares,
          currentPrice: price,
        });
        setTxHash('');
        setModalState('success');
        toast.success(data.message || 'Trade completed');
        return;
      }

      if (isDemoPosition) {
        positionDetailExecDevLog('sell.demo.executeDemoTrade', {
          marketId: position.marketId,
          proceeds: tradeProceeds,
        });
        const r = await executeDemoTrade({
          marketId: position.marketId,
          outcome: position.side,
          type: 'SELL',
          amount: tradeProceeds,
          price: currentPrice,
        });
        if (!r.success) {
          throw new Error(r.message);
        }
        refreshState();
        setTxHash('');
        setModalState('success');
        toast.success(r.message);
        return;
      }

      if (isLiveMode()) {
        setError('On-chain sell is not enabled yet.');
        setModalState('error');
        return;
      }

      setError('Connect your wallet or use guest demo to sell.');
      setModalState('error');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transaction failed. Please try again.';
      setError(msg);
      setModalState('error');
    }
  };

  const handleBuyClick = (amount: number, shares: number, newAvgEntry: number, totalShares: number, fee: number) => {
    setTradeType('add');
    setTradeAmount(amount);
    setTradeShares(shares);
    setTradePrice(currentPrice);
    setTradeNewAvgEntry(newAvgEntry);
    setTradeTotalShares(totalShares);
    setTradeFee(fee);
    setModalState('review');
    setModalOpen(true);
  };

  const handleBuyConfirm = async () => {
    setModalState('pending');
    setError('');

    try {
      if (usePaperRuntime) {
        positionDetailExecDevLog('buy.paper.placePrediction', {
          marketId: position.marketId,
          amount: tradeAmount,
        });
        const data = await placePredictionMutation.mutateAsync({
          marketId: position.marketId,
          outcome: position.side,
          amount: tradeAmount,
          walletAddress: walletKey!,
          orderType: 'MARKET',
        });
        setTxHash('');
        setModalState('success');
        toast.success(
          (data as { message?: string } | undefined)?.message ??
            `Added ${tradeShares.toLocaleString()} shares`,
        );
        return;
      }

      if (isDemoPosition) {
        positionDetailExecDevLog('buy.demo.executeDemoTrade', { marketId: position.marketId });
        const r = await executeDemoTrade({
          marketId: position.marketId,
          outcome: position.side,
          type: 'BUY',
          amount: tradeAmount,
          price: currentPrice,
        });
        if (!r.success) {
          throw new Error(r.message);
        }
        refreshState();
        setTxHash('');
        setModalState('success');
        toast.success(r.message);
        return;
      }

      if (isLiveMode()) {
        setError('On-chain buy is not enabled yet.');
        setModalState('error');
        return;
      }

      setError('Connect your wallet or use guest demo to add to this position.');
      setModalState('error');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transaction failed. Please try again.';
      setError(msg);
      setModalState('error');
    }
  };

  const handleModalClose = () => {
    if (modalState === 'success' && tradeType === 'sell' && position.shares === tradeShares) {
      // If we fully closed the position, don't allow reopening modal
      setModalOpen(false);
      return;
    }
    setModalOpen(false);
    setError('');
    setTxHash('');
  };

  const handleRetry = () => {
    setModalState('review');
    setError('');
  };

  // Generate mock price history for chart (memoized to avoid recalculating on every render)
  const priceHistory = useMemo(() => {
    const generatePriceHistory = () => {
      const points = 50;
      const history = [];
      const now = Date.now();
      const hourMs = 60 * 60 * 1000;
      
      for (let i = points - 1; i >= 0; i--) {
        const timestamp = new Date(now - i * hourMs);
        // Simulate price movement around current price
        const variance = (Math.random() - 0.5) * 0.1;
        const price = currentPrice * (1 + variance);
        history.push({ timestamp, price: Math.max(0.01, Math.min(0.99, price)) });
      }
      
      return history;
    };
    
    return generatePriceHistory();
  }, [Math.round(currentPrice * 100) / 100]); // Only regenerate when price changes by 1 cent
  
  // Calculate chart dimensions and scaling (memoized)
  const chartData = useMemo(() => {
    const prices = priceHistory.map(h => h.price);
    const minPrice = Math.max(0, Math.min(...prices) - 0.05);
    const maxPrice = Math.min(1, Math.max(...prices) + 0.05);
    const priceRange = maxPrice - minPrice;
    
    // Generate SVG path
    const generatePath = (data: number[]) => {
      if (data.length === 0) return '';
      const width = 100;
      const height = 100;
      const stepX = width / Math.max(data.length - 1, 1);
      
      return data
        .map((value, index) => {
          const x = index * stepX;
          const y = height - ((value - minPrice) / priceRange) * height;
          return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
        })
        .join(' ');
    };
    
    const pricePath = generatePath(prices);
    const entryY = 100 - ((position.entryPrice - minPrice) / priceRange) * 100;
    
    return { prices, minPrice, maxPrice, priceRange, pricePath, entryY };
  }, [priceHistory, position.entryPrice]);
  
  const { minPrice, maxPrice, pricePath, entryY } = chartData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="font-syne font-bold text-2xl mb-2">{position.marketName}</h2>
            <div className="flex items-center gap-3 text-sm">
              <span className="px-3 py-1 bg-brand-green/20 text-brand-green rounded-full font-semibold">
                {position.outcome}
              </span>
              <span className="text-gray-400">•</span>
              <div className="flex items-center gap-2 text-gray-400">
                <Clock className="w-4 h-4" />
                <span>
                  {daysUntilEnd > 0 ? `${daysUntilEnd}d ` : ''}{hoursUntilEnd}h remaining
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400 mb-1">Unrealized P&L</div>
            <div className={`text-2xl font-bold font-mono ${pnlFormatted.colorClass}`}>
              {pnlFormatted.text}
            </div>
            <div className={`text-sm ${pctFormatted.colorClass}`}>
              {pctFormatted.text}
            </div>
          </div>
        </div>
        
        {/* Position Stats */}
        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-white/10">
          <div>
            <div className="text-xs text-gray-400 mb-1">Shares</div>
            <div className="font-mono font-semibold">{position.shares.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Avg Entry</div>
            <div className="font-mono font-semibold">${position.entryPrice.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Current Price</div>
            <div className="font-mono font-semibold text-brand-green">${currentPrice.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Current Value</div>
            <div className="font-mono font-semibold">${headerCurrentValue.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Price Chart with Entry Line */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-syne font-bold text-xl">Price Chart</h3>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-brand-green' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500 font-mono">
              {wsStatus === 'connected' ? 'Live' : wsStatus === 'reconnecting' ? 'Reconnecting' : 'Offline'}
            </span>
          </div>
        </div>
        
        <div className="relative bg-brand-bg rounded-lg p-4" style={{ height: '300px' }}>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="0.2"
              />
            ))}
            
            {/* Entry line */}
            <line
              x1="0"
              y1={entryY}
              x2="100"
              y2={entryY}
              stroke="#FFB800"
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
            
            {/* Price line */}
            <path
              d={pricePath}
              fill="none"
              stroke="#00FF87"
              strokeWidth="2"
            />
          </svg>
          
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 font-mono pr-2">
            <span>${maxPrice.toFixed(2)}</span>
            <span>${((maxPrice + minPrice) / 2).toFixed(2)}</span>
            <span>${minPrice.toFixed(2)}</span>
          </div>
          
          {/* Entry price label */}
          <div
            className="absolute left-full ml-2 text-xs text-yellow-500 font-mono flex items-center gap-1"
            style={{ top: `${entryY}%`, transform: 'translateY(-50%)' }}
          >
            <span>Entry: ${position.entryPrice.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="flex justify-between mt-2 text-xs text-gray-500 font-mono">
          <span>24h ago</span>
          <span>Now</span>
        </div>
      </div>

      {/* Sell Controls */}
      <SellControls
        position={position}
        currentPrice={currentPrice}
        onSell={handleSellClick}
      />

      {/* Add to Position Controls */}
      <AddToPositionControls
        position={position}
        currentPrice={currentPrice}
        maxAmount={usePaperRuntime ? paperCashUsdc : demoBalance}
        onBuy={handleBuyClick}
      />

      {/* Order Book */}
      {orderbook ? (
        <OrderBook market={{
          id: position.marketId,
          teamA: position.marketName.split(' vs ')[0] || 'Team A',
          teamB: position.marketName.split(' vs ')[1] || 'Team B',
          yesPrice: currentPrice,
          noPrice: 1 - currentPrice,
        } as any} />
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h3 className="font-syne font-bold text-xl mb-4">Order Book</h3>
          <div className="text-center text-gray-400 py-8">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Connecting to order book...</p>
          </div>
        </div>
      )}

      {/* Recent Trades */}
      <RecentTradesFeed market={{
        id: position.marketId,
        teamA: position.marketName.split(' vs ')[0] || 'Team A',
        teamB: position.marketName.split(' vs ')[1] || 'Team B',
      } as any} />

      {/* Trade Confirmation Modal */}
      <TradeConfirmationModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        state={modalState}
        type={tradeType}
        marketName={position.marketName}
        outcome={position.outcome}
        side={position.side}
        shares={tradeShares}
        price={tradePrice}
        amount={tradeAmount}
        proceeds={tradeProceeds}
        realizedPnL={tradeRealizedPnL}
        realizedPnLPct={tradeRealizedPnLPct}
        newAvgEntry={tradeNewAvgEntry}
        totalShares={tradeTotalShares}
        fee={tradeFee}
        txHash={txHash}
        error={error}
        onConfirm={tradeType === 'sell' ? handleSellConfirm : handleBuyConfirm}
        onRetry={handleRetry}
      />
    </div>
  );
}
