import { useState, useMemo } from 'react';
import { ChevronDown, Clock, Activity, Radio } from 'lucide-react';
import { ProbabilityDepthBar } from './ProbabilityDepthBar';
import { ProtocolStatePanel } from '~/components/protocol/ProtocolStatePanel';
import { priceMovementLabel } from '~/lib/market/marketProtocolStatus';
import type { Position } from '~/store/tradingStore';
import { usePositionRealtime } from '~/hooks/usePositionRealtime';
import { useWallet } from '~/store/useWalletStore';
import { SellControls } from './SellControls';
import { AddToPositionControls } from './AddToPositionControls';
import { TradeConfirmationModal } from './TradeConfirmationModal';
import { OrderBook } from '~/components/markets/OrderBook';
import { RecentTradesFeed } from '~/components/markets/RecentTradesFeed';
import { formatPnL, formatPctChange } from '~/lib/trading/calculations';
import {
  deriveLivePositionFromQuote,
  sideAwareQuoteFromMarket,
} from '~/lib/trading/deriveLivePositionFromQuote';
import { isLiveMode } from '~/config/chain';
import { useDemoAccount } from '~/hooks/useDemoAccount';
import { usePaperWalletBalance } from '~/hooks/usePaperWalletBalance';
import { executePlacePredictionWithDiagnostics } from '~/lib/executePlacePredictionWithDiagnostics';
import { executeClosePositionWithDiagnostics } from '~/lib/executeClosePositionWithDiagnostics';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC, useTRPCClient } from '~/trpc/react';
import { normalizeWalletForQuery } from '~/utils/walletQuery';
import { refetchCanonicalPositionReads } from '~/utils/refetchCanonicalPositionReads';
import {
  invalidateWalletNotifications,
} from '~/utils/invalidateWalletNotifications';
import { useMarketSummaries } from '~/hooks/useMarketSummaries';
import { ProtocolLifecycleInsight } from '~/components/protocol/ProtocolLifecycleInsight';
import { PositionMotionPanel } from '~/components/protocol/PositionMotionPanel';
import { SettlementTimelineSection } from '~/components/protocol/SettlementTimelineSection';
import { ProtocolActivityTimeline } from '~/components/protocol/ProtocolActivityTimeline';
import { mapTradingPositionToOrderRow } from '~/lib/trading/mapTradingPositionToOrderRow';
import { buildTraderDeskRow } from '~/lib/trading/traderPositionDesk';
import { TraderSellDecisionPanel } from './TraderSellDecisionPanel';

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
      refetchCanonicalPositionReads(queryClient, trpc, walletKey, position.marketId);
      invalidateWalletNotifications(queryClient, trpc.getNotifications.queryKey, walletKey);
    }
  };

  const closePositionMutation = useMutation({
    mutationFn: (input: {
      orderId: string;
      walletAddress: string;
      sharesToSell: number;
      currentPrice: number;
    }) =>
      executeClosePositionWithDiagnostics(
        (payload) => trpcClient.closePosition.mutate(payload),
        input,
      ),
    onSuccess: () => {
      invalidatePaperQueries();
    },
  });

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

  const marketSummariesQuery = useMarketSummaries({
    marketIds: [position.marketId],
    enabled: !!position.marketId,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
  const marketRow = marketSummariesQuery.data?.[position.marketId] ?? null;
  const orderRow = useMemo(() => mapTradingPositionToOrderRow(position), [position]);
  const deskRow = useMemo(
    () => buildTraderDeskRow(position, marketRow, orderRow, marketPrice ?? undefined),
    [position, marketRow, orderRow, marketPrice],
  );
  const [protocolOpen, setProtocolOpen] = useState(false);

  const live = useMemo(() => {
    const quote = marketRow ? sideAwareQuoteFromMarket(position, marketRow) : marketPrice;
    return deriveLivePositionFromQuote(position, quote);
  }, [position, marketRow, marketPrice]);
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

  const yesPct = Math.round(currentPrice * 100);
  const noPct = Math.round((1 - currentPrice) * 100);
  const movement = priceMovementLabel(position.entryPrice, currentPrice);
  const panelShell =
    'relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] shadow-[0_24px_60px_rgba(0,0,0,0.35)]';

  return (
    <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">
      <div className={`${panelShell} p-4 sm:p-6`}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-green/35 to-transparent" aria-hidden />
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <p className="mb-2 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-green">
              <Radio className="h-3 w-3 animate-pulse" /> Execution panel
            </p>
            <h2 className="font-syne font-bold text-2xl tracking-tight mb-2">{position.marketName}</h2>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full border border-brand-green/30 bg-brand-green/15 px-3 py-1 font-mono text-xs font-bold text-brand-green">
                {position.outcome}
              </span>
              <span className="flex items-center gap-1.5 text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                {daysUntilEnd > 0 ? `${daysUntilEnd}d ` : ''}{hoursUntilEnd}h left
              </span>
              <span className="text-xs text-gray-600">{deskRow.psychology.convictionLabel}</span>
            </div>
          </div>
          <div className="text-right shrink-0 ml-4">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Unrealized</p>
            <p className={`text-2xl font-bold font-mono ${pnlFormatted.colorClass}`}>{pnlFormatted.text}</p>
            <p className={`text-sm font-mono ${pctFormatted.colorClass}`}>{pctFormatted.text}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10">
          {[
            ['Shares', position.shares.toLocaleString()],
            ['Avg entry', '$' + position.entryPrice.toFixed(2)],
            ['Mark', '$' + currentPrice.toFixed(2)],
            ['Value', '$' + headerCurrentValue.toFixed(2)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">{k}</p>
              <p className="font-mono font-semibold text-white">{v}</p>
            </div>
          ))}
        </div>
      </div>

      <TraderSellDecisionPanel psychology={deskRow.psychology} />

      <div className={`${panelShell} p-4 sm:p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-syne font-bold text-lg">Probability intelligence</h3>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${wsStatus === 'connected' ? 'bg-brand-green animate-pulse' : 'bg-red-500'}`} />
            <span className="text-[10px] font-mono uppercase text-gray-500">
              {wsStatus === 'connected' ? 'Live quote' : wsStatus === 'reconnecting' ? 'Reconnecting' : 'Offline'}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">YES</p>
            <p className="font-mono text-3xl font-bold text-brand-green">{yesPct}¢</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">NO</p>
            <p className="font-mono text-3xl font-bold text-red-400">{noPct}¢</p>
          </div>
        </div>
        <ProbabilityDepthBar entry={position.entryPrice} current={currentPrice} side={position.side} className="mb-6" />
        <ProtocolStatePanel
          variant="neutral"
          compact
          title="Probability tape pending"
          message="No synthetic history — live mark-to-market from protocol quotes only."
          icon={<Activity className="h-7 w-7 text-brand-cyan" />}
        />
      </div>

      <SellControls
        position={position}
        currentPrice={currentPrice}
        onSell={handleSellClick}
      />

      <button
        type="button"
        onClick={() => setProtocolOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-left text-sm font-semibold text-gray-400 hover:border-white/20"
      >
        Protocol depth & settlement
        <ChevronDown className={`h-4 w-4 transition-transform ${protocolOpen ? 'rotate-180' : ''}`} />
      </button>
      {protocolOpen ? (
        <div className="space-y-4">
          <ProtocolLifecycleInsight order={orderRow} market={marketRow} />
          <PositionMotionPanel order={orderRow} market={marketRow} />
          <SettlementTimelineSection
            marketId={position.marketId}
            market={marketRow}
            order={orderRow}
          />
          <ProtocolActivityTimeline marketId={position.marketId} compact />
        </div>
      ) : null}

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
        <ProtocolStatePanel
          variant="loading"
          compact
          title="Order book syncing"
          message="Connecting to protocol depth feed for this market."
        />
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
