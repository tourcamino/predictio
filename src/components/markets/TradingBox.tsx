import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2, Lock, CheckCircle, ChevronDown, TrendingUp, TrendingDown, HelpCircle, AlertTriangle } from 'lucide-react';
import { useTRPC, useTRPCClient } from '~/trpc/react';
import { Market } from '~/data/mockMarkets';
import { useWallet } from '~/store/useWalletStore';
import { TransactionModal } from '../TransactionModal';
import { calcFee, calcPriceImpact, calculateOrderFee, getOrderRole } from '~/utils/marketUtils';
import { useDemoAccount } from '~/hooks/useDemoAccount';
import { usePaperWalletBalance } from '~/hooks/usePaperWalletBalance';
import { DemoBadge } from '~/components/demo/DemoBadge';
import { FeeBreakdownCard } from '~/components/FeeBreakdownCard';
import { getMarketStatus, isMarketTradeable } from '~/utils/marketLifecycle';
import {
  invalidateWalletNotifications,
} from '~/utils/invalidateWalletNotifications';
import { useWalletGate } from '~/hooks/useWalletGate';
import { useWalletRuntimeState } from '~/hooks/useWalletRuntimeState';
import { WalletGateModal } from '~/components/WalletGateModal';
import { normalizeWalletForQuery } from '~/utils/walletQuery';
import { invalidateWalletPortfolioLpQueries } from '~/utils/invalidateWalletPortfolioLpQueries';
import { executePlacePredictionWithDiagnostics } from '~/lib/executePlacePredictionWithDiagnostics';
import { executeClosePositionWithDiagnostics } from '~/lib/executeClosePositionWithDiagnostics';
import { useUserPositions } from '~/hooks/useUserPositions';
import { predictionBalanceFootnote } from '~/lib/economySurface';
import { PAPER_ROUTING_IMPACT_POOL_USDC } from '~/lib/curatedMarketPresentation';
import {
  logPurchaseFlowClient,
  logPurchaseFlowClientError,
  newClientPurchaseRequestId,
} from '~/lib/purchaseFlowDiagnosticClient';

interface TradingBoxProps {
  market: Market;
  /** Syncs buy-side selection when user picks a team in DecisionBlock */
  initialOutcome?: OutcomeType;
}

type TabType = 'buy' | 'sell';
type OutcomeType = 'YES' | 'NO' | 'DRAW';

const buySchema = z.object({
  amount: z
    .number()
    .positive('Amount must be positive')
    .min(1, 'Minimum amount is $1')
    .max(10000, 'Maximum amount is $10,000'),
});

const sellSchema = z.object({
  shares: z
    .number()
    .positive('Shares must be positive')
    .min(0.01, 'Minimum is 0.01 shares'),
});

type BuyFormData = z.infer<typeof buySchema>;
type SellFormData = z.infer<typeof sellSchema>;

// Mock user position data - in production, this would come from the backend
interface UserPosition {
  id?: string;
  outcome: OutcomeType;
  shares: number;
  avgPrice: number;
}

function normalizePositionOutcome(raw: string): OutcomeType {
  const u = raw.toUpperCase();
  if (u === 'DRAW') return 'DRAW';
  if (u === 'NO') return 'NO';
  return 'YES';
}

function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  const [show, setShow] = useState(false);
  
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-flex items-center"
      >
        {children}
      </button>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 border border-white/20 rounded-lg text-xs text-gray-300 leading-relaxed shadow-xl">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

function outcomeTeamLabel(
  outcome: OutcomeType,
  market: Market,
): string {
  if (outcome === 'YES') return market.teamA;
  if (outcome === 'DRAW') return 'Draw';
  return market.teamB;
}

export function TradingBox({ market, initialOutcome }: TradingBoxProps) {
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();
  const { isConnected: isWalletConnected, address: walletAddress, chainId } = useWallet();
  const { cashUsdc: paperCashUsdc } = usePaperWalletBalance();
  const walletRt = useWalletRuntimeState();
  const {
    isActive: isDemoActive,
    executeDemoTrade,
    balance: demoBalance,
    positions: demoPositions,
  } = useDemoAccount();
  const chainActionsBlocked =
    isWalletConnected && !isDemoActive && walletRt.runtime !== "connected-correct-chain";
  const walletKey = normalizeWalletForQuery(walletAddress);
  const { requireWalletAndChain, showGateModal, closeGateModal } = useWalletGate();
  
  // Demo: `demoStorage`; paper: `getPaperWalletBalance` (tRPC), not the wallet Zustand slice.
  const currentBalance = isDemoActive ? demoBalance : isWalletConnected ? paperCashUsdc : demoBalance;
  
  const [activeTab, setActiveTab] = useState<TabType>('buy');
  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeType>(
    initialOutcome ?? 'YES',
  );

  useEffect(() => {
    if (initialOutcome) setSelectedOutcome(initialOutcome);
  }, [initialOutcome]);
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [txModalState, setTxModalState] = useState<'review' | 'pending' | 'mining' | 'success' | 'error'>('review');
  const [txError, setTxError] = useState<string | undefined>(undefined);
  const [showTxModal, setShowTxModal] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const buyFlowCorrelationRef = useRef<string | null>(null);

  const positionsQuery = useUserPositions({
    status: 'open',
    enabled: !!walletKey && isWalletConnected && !isDemoActive,
  });

  const apiUserPositions: UserPosition[] = useMemo(
    () =>
      (positionsQuery.data?.positions || [])
        .filter((p) => p.marketId === market.id)
        .map((p) => ({
          id: p.id,
          outcome: normalizePositionOutcome(p.outcome),
          shares: p.shares || 0,
          avgPrice: p.avgPrice || 0,
        })),
    [positionsQuery.data?.positions, market.id],
  );

  const demoUserPositions: UserPosition[] = useMemo(
    () =>
      demoPositions
        .filter((p) => p.marketId === market.id)
        .map((p) => ({
          id: `demo-${p.marketId}-${p.outcome}`,
          outcome: p.outcome,
          shares: p.shares,
          avgPrice: p.avgPrice,
        })),
    [demoPositions, market.id],
  );

  const userPositions: UserPosition[] = isDemoActive ? demoUserPositions : apiUserPositions;

  const userPosition = userPositions.find(p => p.outcome === selectedOutcome);
  const hasPosition = !!userPosition;

  const buyForm = useForm<BuyFormData>({
    resolver: zodResolver(buySchema),
    defaultValues: { amount: 100 },
  });

  const sellForm = useForm<SellFormData>({
    resolver: zodResolver(sellSchema),
    defaultValues: { shares: 0 },
  });

  // Update sell form when position or selected outcome changes
  useEffect(() => {
    if (userPosition) {
      sellForm.setValue('shares', userPosition.shares);
    } else {
      sellForm.setValue('shares', 0);
    }
  }, [userPosition, sellForm]);

  const buyAmount = buyForm.watch('amount') || 0;
  const sellShares = sellForm.watch('shares') || 0;

  const hasDraw = market.percentDraw != null && market.percentDraw > 0;
  const drawPrice = hasDraw ? market.percentDraw! / 100 : undefined;
  const drawDecimalOdds =
    market.drawOdds ??
    (drawPrice != null && drawPrice > 0 ? (1 / drawPrice).toFixed(2) : undefined);

  // Get current prices (1X2 when draw is active)
  const currentPrice =
    selectedOutcome === 'YES'
      ? market.yesPrice
      : selectedOutcome === 'DRAW' && drawPrice != null
        ? drawPrice
        : market.noPrice;
  const oppositePrice =
    selectedOutcome === 'YES'
      ? market.noPrice
      : selectedOutcome === 'DRAW'
        ? market.yesPrice
        : market.yesPrice;

  // Buy calculations
  const sharesFromBuy = buyAmount > 0 ? buyAmount / currentPrice : 0;
  const potentialReturn = sharesFromBuy * 1.0; // Each winning share = $1
  const potentialProfit = potentialReturn - buyAmount;
  const estProbability = currentPrice * 100;

  // Calculate trading costs
  const liquidity = market.liquidity;
  const bidPrice = liquidity?.bidPrice || currentPrice - 0.01;
  const askPrice = liquidity?.askPrice || currentPrice + 0.01;
  const spread = askPrice - bidPrice;
  const spreadPct = (spread / bidPrice) * 100;
  
  // Dynamic fee calculation based on order type
  const feeAmount = calculateOrderFee(orderType, buyAmount);
  const orderRole = getOrderRole(orderType);
  const dynamicFeePct = orderType === 'LIMIT' ? 0 : calcFee(currentPrice) * 100;
  
  // Price impact calculation
  const poolSize =
    (liquidity?.totalPool && liquidity.totalPool > 0
      ? liquidity.totalPool
      : null) ??
    (typeof market.importanceScore === "number" && Number.isFinite(market.importanceScore)
      ? PAPER_ROUTING_IMPACT_POOL_USDC
      : PAPER_ROUTING_IMPACT_POOL_USDC);
  const priceImpact = calcPriceImpact(buyAmount, poolSize);
  const priceImpactPct = priceImpact * 100;
  
  // Total cost
  const totalCost = buyAmount + feeAmount;
  const sharesReceived = buyAmount / (currentPrice * (1 + priceImpact));

  // Sell calculations
  const proceedsFromSell = sellShares * currentPrice;
  const costBasis = userPosition ? sellShares * userPosition.avgPrice : 0;
  const profitFromSell = proceedsFromSell - costBasis;
  const profitPct = costBasis > 0 ? (profitFromSell / costBasis) * 100 : 0;

  // Current position value
  const positionValue = userPosition ? userPosition.shares * currentPrice : 0;
  const positionCost = userPosition ? userPosition.shares * userPosition.avgPrice : 0;
  const positionPnL = positionValue - positionCost;
  const positionPnLPct = positionCost > 0 ? (positionPnL / positionCost) * 100 : 0;

  const placeTradeMutation = useMutation({
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
        { flowCorrelationId: buyFlowCorrelationRef.current },
      ),
    onSuccess: (data) => {
      // #region agent log
      const fid = buyFlowCorrelationRef.current;
      logPurchaseFlowClient({
        requestId: fid ?? newClientPurchaseRequestId(),
        userId: walletKey,
        flowCorrelationId: fid,
        location: 'TradingBox.tsx:placeTradeMutation.onSuccess',
        phase: 'tradingbox.place_trade.success',
        apiResponse: data,
      });
      // #endregion
      setTxError(undefined);
      setTxModalState('success');

      const side = outcomeTeamLabel(selectedOutcome, market);
      toast.success(`Paper prediction placed on ${side}.`, {
        duration: 5000,
        icon: '✅',
      });

      queryClient.invalidateQueries({
        queryKey: trpc.getMarketDetail.queryKey({ marketId: market.id }),
      });
      if (walletKey) {
        invalidateWalletPortfolioLpQueries(queryClient, trpc, walletKey);
        invalidateWalletNotifications(queryClient, trpc.getNotifications.queryKey, walletKey);
      }
    },
    onError: (error: Error) => {
      // #region agent log
      const fid = buyFlowCorrelationRef.current;
      logPurchaseFlowClientError(
        {
          requestId: fid ?? newClientPurchaseRequestId(),
          userId: walletKey,
          location: 'TradingBox.tsx:placeTradeMutation.onError',
          flowCorrelationId: fid,
        },
        'tradingbox.place_trade.error',
        error,
      );
      // #endregion
      let errorMessage = 'Trade failed. Please try again.';

      if (error.message.includes('insufficient')) {
        errorMessage = 'Insufficient balance. Please reduce your trade amount.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message.includes('market closed')) {
        errorMessage = 'This market is now closed for trading.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setTxError(errorMessage);
      setTxModalState('error');

      toast.error(errorMessage, {
        duration: 5000,
        icon: '❌',
      });
    },
  });

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
    onSuccess: (data) => {
        setTxError(undefined);
        setTxModalState('success');
        
        toast.success(data.message || 'Position closed successfully!', {
          duration: 4000,
          icon: '✅',
        });
        
        setTimeout(() => {
          setShowTxModal(false);
          sellForm.reset();
        }, 2000);
        
        if (walletKey) {
          invalidateWalletPortfolioLpQueries(queryClient, trpc, walletKey);
          invalidateWalletNotifications(queryClient, trpc.getNotifications.queryKey, walletKey);
        }
      },
      onError: (error) => {
        let errorMessage = 'Failed to close position. Please try again.';
        
        if (error.message.includes('not found')) {
          errorMessage = 'Position not found. It may have already been closed.';
        } else if (error.message.includes('insufficient shares')) {
          errorMessage = 'Insufficient shares to sell.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        setTxError(errorMessage);
        setTxModalState('error');
        
        toast.error(errorMessage, {
          duration: 5000,
          icon: '❌',
        });
      },
  });

  const onBuySubmit = async (data: BuyFormData) => {
    const flowId = newClientPurchaseRequestId();
    buyFlowCorrelationRef.current = flowId;

    // #region agent log
    logPurchaseFlowClient({
      requestId: flowId,
      userId: walletKey,
      flowCorrelationId: flowId,
      location: 'TradingBox.tsx:onBuySubmit',
      phase: 'tradingbox.buy_submit.enter',
      payloadReceived: {
        formAmount: data.amount,
        marketId: market.id,
        selectedOutcome,
        orderType,
        isDemoActive,
        isWalletConnected,
        isMarketTradeable: isMarketTradeable(market),
        marketStatus: getMarketStatus(market),
        start_time: market.start_time?.toISOString?.() ?? market.start_time,
      },
    });
    // #endregion

    // TODO CURSOR C1: validate trade lock server-side before execution
    // Frontend protection: check if market is still open for trading
    if (!isMarketTradeable(market)) {
      const status = getMarketStatus(market);
      // #region agent log
      logPurchaseFlowClient({
        requestId: flowId,
        userId: walletKey,
        flowCorrelationId: flowId,
        location: 'TradingBox.tsx:onBuySubmit',
        phase: 'tradingbox.buy_submit.exit_early',
        payloadReceived: { reason: 'market_not_tradeable', status },
      });
      // #endregion
      buyFlowCorrelationRef.current = null;
      if (status === 'locked') {
        toast.error('Trading is closed for this market. Match has started.');
        return;
      } else if (status === 'resolved') {
        toast.error('This market has been resolved. Trading is no longer available.');
        return;
      }
    }
    
    if (isDemoActive) {
      const result = await executeDemoTrade({
        marketId: market.id,
        outcome: selectedOutcome,
        type: 'BUY',
        amount: data.amount,
        price: currentPrice,
        marketSnapshot: market,
      });

      // #region agent log
      logPurchaseFlowClient({
        requestId: flowId,
        userId: walletKey,
        flowCorrelationId: flowId,
        location: 'TradingBox.tsx:onBuySubmit',
        phase: 'tradingbox.buy_submit.demo_execute_demo_trade_done',
        payloadReceived: { demoAmount: data.amount },
        apiResponse: result,
      });
      // #endregion

      if (result.success) {
        toast.success(result.message);
        buyForm.reset();
      } else {
        toast.error(result.message);
      }
      buyFlowCorrelationRef.current = null;
      return;
    }

    if (!requireWalletAndChain()) {
      buyFlowCorrelationRef.current = null;
      return;
    }

    setTxError(undefined);
    setTxModalState('review');
    setShowTxModal(true);

    // #region agent log
    logPurchaseFlowClient({
      requestId: flowId,
      userId: walletKey,
      flowCorrelationId: flowId,
      location: 'TradingBox.tsx:onBuySubmit',
      phase: 'tradingbox.buy_submit.modal_opened_review',
      payloadReceived: {
        nextStep: 'user_clicks_confirm_in_TransactionModal',
        formAmount: data.amount,
        buyAmountWatch: buyAmount,
      },
    });
    // #endregion
  };

  const onSellSubmit = async (data: SellFormData) => {
    if (!userPosition || data.shares > userPosition.shares) {
      toast.error('Insufficient shares');
      return;
    }
    
    if (isDemoActive) {
      const result = await executeDemoTrade({
        marketId: market.id,
        outcome: selectedOutcome,
        type: 'SELL',
        amount: data.shares * currentPrice,
        price: currentPrice,
        marketSnapshot: market,
      });

      if (result.success) {
        toast.success(result.message);
        sellForm.reset();
      } else {
        toast.error(result.message);
      }
      return;
    }

    if (!requireWalletAndChain()) return;

    setTxError(undefined);
    setTxModalState('review');
    setShowTxModal(true);
  };

  const handleConfirmTransaction = () => {
    if (!isDemoActive && !requireWalletAndChain()) {
      setShowTxModal(false);
      return;
    }
    const flowId = buyFlowCorrelationRef.current;
    // #region agent log
    logPurchaseFlowClient({
      requestId: flowId ?? newClientPurchaseRequestId(),
      userId: walletKey,
      flowCorrelationId: flowId,
      location: 'TradingBox.tsx:handleConfirmTransaction',
      phase: 'tradingbox.confirm.enter',
      payloadReceived: { activeTab, orderType, buyAmount, walletKey, willDelayMs: 1500 },
    });
    // #endregion

    setTxError(undefined);
    setTxModalState('mining');

    if (activeTab === 'buy') {
        // Get limit price if it's a limit order
        const limitPriceInput = document.getElementById('limitPrice') as HTMLInputElement;
        const limitPrice = orderType === 'LIMIT' && limitPriceInput ? parseFloat(limitPriceInput.value) : undefined;
        
        const mutatePayload = {
          marketId: market.id,
          outcome: selectedOutcome.toLowerCase(),
          amount: buyAmount,
          walletAddress: walletKey,
          orderType,
          limitPrice,
        };

        // #region agent log
        logPurchaseFlowClient({
          requestId: flowId ?? newClientPurchaseRequestId(),
          userId: walletKey,
          flowCorrelationId: flowId,
          location: 'TradingBox.tsx:handleConfirmTransaction',
          phase: 'tradingbox.confirm.place_trade_mutate_call',
          payloadReceived: mutatePayload,
        });
        // #endregion

      placeTradeMutation.mutate(mutatePayload);
    } else if (userPosition?.id) {
      closePositionMutation.mutate({
        orderId: userPosition.id,
        walletAddress: walletKey,
        sharesToSell: sellShares,
        currentPrice,
      });
    } else {
      setTxError('Position not found');
      setTxModalState('error');
      toast.error('Position not found');
    }
  };

  const askMarketAiMutation = useMutation(trpc.askMarketAi.mutationOptions());

  const handleAskAI = async () => {
    const q = aiQuestion.trim();
    if (!q || askMarketAiMutation.isPending) return;
    setIsAIThinking(true);
    setAiResponse('');
    try {
      const lifecycle = getMarketStatus(market);
      const lifecycleParam =
        lifecycle === 'open' || lifecycle === 'locked' || lifecycle === 'resolved'
          ? lifecycle
          : undefined;
      const data = await askMarketAiMutation.mutateAsync({
        marketId: market.id,
        teamA: market.teamA,
        teamB: market.teamB,
        league: market.league,
        sport: market.sport,
        question: q,
        yesPrice: market.yesPrice,
        noPrice: market.noPrice,
        kickoffIso:
          market.start_time instanceof Date
            ? market.start_time.toISOString()
            : undefined,
        lifecycle: lifecycleParam,
        status: market.status,
      });
      setAiResponse(data.response);
    } catch {
      toast.error('AI assistant unavailable — try again shortly.');
    } finally {
      setIsAIThinking(false);
    }
  };

  const quickAmounts = [10, 50, 100, 500];

  return (
    <div className="lg:static lg:transform-none fixed bottom-0 left-0 right-0 z-40 lg:z-auto pb-safe">
      <div className="bg-brand-bg border border-brand-green/30 rounded-t-lg lg:rounded-lg p-4 sm:p-6 shadow-2xl lg:shadow-lg max-h-[85vh] lg:max-h-none overflow-y-auto">
        <div className="flex items-center justify-between mb-4 max-lg:mt-[1cm] lg:mt-0">
          <div>
            <h2 className="font-syne font-bold text-xl">Place prediction</h2>
            <p className="text-xs text-gray-500 mt-0.5">Pre-testnet · paper USDC</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isDemoActive && <DemoBadge size="sm" />}
            <span className="text-sm text-gray-300 font-mono">
              ${currentBalance.toFixed(0)}{' '}
              <span className="text-gray-500 text-xs">paper</span>
            </span>
          </div>
        </div>
        {!isWalletConnected && (
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            {predictionBalanceFootnote()}
          </p>
        )}

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-6 bg-white/5 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('buy')}
            className={`flex-1 py-3 sm:py-2.5 px-4 rounded-md font-semibold transition-all text-base sm:text-sm ${
              activeTab === 'buy'
                ? 'bg-brand-green text-brand-bg'
                : 'text-gray-400 hover:text-white active:scale-95'
            }`}
          >
            Buy
          </button>
          <button
            onClick={() => setActiveTab('sell')}
            disabled={!hasPosition}
            className={`flex-1 py-3 sm:py-2.5 px-4 rounded-md font-semibold transition-all text-base sm:text-sm ${
              activeTab === 'sell'
                ? 'bg-orange-500 text-white'
                : hasPosition
                ? 'text-gray-400 hover:text-white active:scale-95'
                : 'text-gray-600 cursor-not-allowed'
            }`}
          >
            Sell {hasPosition && `(${userPosition.shares})`}
          </button>
        </div>

        {/* BUY TAB */}
        {activeTab === 'buy' && (
          <div>
            {/* Order Type Toggle */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Order type
              </label>
              <div className="flex gap-2 p-1 bg-white/5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setOrderType('MARKET')}
                  className={`flex-1 py-3 sm:py-2 px-4 rounded-md font-semibold transition-all text-base sm:text-sm ${
                    orderType === 'MARKET'
                      ? 'bg-brand-green text-brand-bg'
                      : 'text-gray-400 hover:text-white active:scale-95'
                  }`}
                >
                  Market ●
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('LIMIT')}
                  className={`flex-1 py-3 sm:py-2 px-4 rounded-md font-semibold transition-all text-base sm:text-sm ${
                    orderType === 'LIMIT'
                      ? 'bg-brand-cyan text-brand-bg'
                      : 'text-gray-400 hover:text-white active:scale-95'
                  }`}
                >
                  Limit
                </button>
              </div>
            </div>

            {/* Outcome Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                You're buying
              </label>
              <div
                className={`grid gap-3 ${hasDraw ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedOutcome('YES')}
                  className={`p-5 sm:p-4 rounded-lg border-2 transition-all min-h-[120px] sm:min-h-0 ${
                    selectedOutcome === 'YES'
                      ? 'border-green-500 bg-green-500/20 shadow-lg shadow-green-500/20'
                      : 'border-white/10 bg-white/5 hover:border-green-500/50 hover:bg-green-500/10 active:scale-95'
                  }`}
                >
                  <div className="font-bold text-xl sm:text-lg mb-1 text-green-500">{market.teamA}</div>
                  <div className="text-sm sm:text-xs text-gray-400 mb-2">Wins</div>
                  <div className="font-mono text-3xl sm:text-2xl text-green-500 font-bold">
                    ${market.yesPrice.toFixed(2)}
                  </div>
                  <div className="text-sm sm:text-xs text-gray-400 mt-1">
                    {(market.yesPrice * 100).toFixed(0)}% probability
                  </div>
                </button>
                {hasDraw && drawPrice != null && (
                  <button
                    type="button"
                    onClick={() => setSelectedOutcome('DRAW')}
                    className={`p-5 sm:p-4 rounded-lg border-2 transition-all min-h-[120px] sm:min-h-0 ${
                      selectedOutcome === 'DRAW'
                        ? 'border-gray-400 bg-gray-500/20 shadow-lg shadow-gray-500/20'
                        : 'border-white/10 bg-white/5 hover:border-gray-500/50 hover:bg-gray-500/10 active:scale-95'
                    }`}
                  >
                    <div className="font-bold text-xl sm:text-lg mb-1 text-gray-300">Draw</div>
                    <div className="text-sm sm:text-xs text-gray-400 mb-2">X</div>
                    <div className="font-mono text-3xl sm:text-2xl text-gray-200 font-bold">
                      {drawDecimalOdds != null ? `${drawDecimalOdds}x` : `$${drawPrice.toFixed(2)}`}
                    </div>
                    <div className="text-sm sm:text-xs text-gray-400 mt-1">
                      {(drawPrice * 100).toFixed(0)}% probability
                    </div>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedOutcome('NO')}
                  className={`p-5 sm:p-4 rounded-lg border-2 transition-all min-h-[120px] sm:min-h-0 ${
                    selectedOutcome === 'NO'
                      ? 'border-cyan-500 bg-cyan-500/20 shadow-lg shadow-cyan-500/20'
                      : 'border-white/10 bg-white/5 hover:border-cyan-500/50 hover:bg-cyan-500/10 active:scale-95'
                  }`}
                >
                  <div className="font-bold text-xl sm:text-lg mb-1 text-cyan-500">{market.teamB}</div>
                  <div className="text-sm sm:text-xs text-gray-400 mb-2">Wins</div>
                  <div className="font-mono text-3xl sm:text-2xl text-cyan-500 font-bold">
                    ${market.noPrice.toFixed(2)}
                  </div>
                  <div className="text-sm sm:text-xs text-gray-400 mt-1">
                    {(market.noPrice * 100).toFixed(0)}% probability
                  </div>
                </button>
              </div>
            </div>

            {/* Limit Price Input (only shown for limit orders) */}
            {orderType === 'LIMIT' && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <label htmlFor="limitPrice" className="text-sm font-medium text-gray-300">
                    Limit price
                  </label>
                  <Tooltip content="A limit order lets you set the exact price you want to buy or sell at. Your order sits in the book until someone matches it. No fee charged.">
                    <HelpCircle className="w-3 h-3 text-gray-500" />
                  </Tooltip>
                </div>
                <div className="relative">
                  <span className="absolute left-4 sm:left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    $
                  </span>
                  <input
                    id="limitPrice"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="0.99"
                    defaultValue={currentPrice.toFixed(2)}
                    className="w-full pl-10 sm:pl-8 pr-28 sm:pr-24 py-4 sm:py-3 bg-white/5 border border-white/10 rounded-lg text-white font-mono placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                    placeholder="0.65"
                  />
                  <span className="absolute right-4 sm:right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    per share
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-400 space-y-1">
                  <div>Current price: ${currentPrice.toFixed(2)}</div>
                  <div>Order will fill if price reaches your limit</div>
                  <div className="text-brand-cyan font-semibold">Estimated wait: unknown</div>
                </div>
              </div>
            )}

            <form onSubmit={buyForm.handleSubmit(onBuySubmit)} className="space-y-4">
              {/* Amount Input */}
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-2">
                  Amount (paper USDC)
                </label>
                <div className="relative">
                  <span className="absolute left-4 sm:left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl sm:text-lg">
                    $
                  </span>
                  <input
                    id="amount"
                    type="number"
                    step="0.01"
                    {...buyForm.register('amount', { valueAsNumber: true })}
                    className="w-full pl-10 sm:pl-8 pr-4 sm:pr-3 py-4 sm:py-3 bg-white/5 border border-white/10 rounded-lg text-white text-xl sm:text-lg font-mono placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
                    placeholder="100.00"
                  />
                </div>
                {buyForm.formState.errors.amount && (
                  <p className="mt-1 text-sm text-red-500">{buyForm.formState.errors.amount.message}</p>
                )}
                
                {/* Quick Amount Buttons */}
                <div className="space-y-2 mt-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-gray-400 mr-1 self-center">% of balance:</span>
                    {[10, 25, 50, 100].map((percentage) => {
                      const amount = (currentBalance * percentage) / 100;
                      return (
                        <button
                          key={`pct-${percentage}`}
                          type="button"
                          onClick={() => buyForm.setValue('amount', Math.floor(amount * 100) / 100)}
                          className="px-4 py-2 sm:px-3 sm:py-1 text-sm sm:text-xs font-semibold bg-brand-green/10 border border-brand-green/30 rounded hover:border-brand-green hover:bg-brand-green/20 transition-all active:scale-95"
                        >
                          {percentage}%
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-gray-400 mr-1 self-center">Quick:</span>
                    {quickAmounts.map((quickAmount) => (
                      <button
                        key={quickAmount}
                        type="button"
                        onClick={() => buyForm.setValue('amount', quickAmount)}
                        className="px-4 py-2 sm:px-3 sm:py-1 text-sm sm:text-xs font-semibold bg-white/5 border border-white/10 rounded hover:border-brand-green hover:bg-brand-green/10 transition-all active:scale-95"
                      >
                        ${quickAmount}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Profit Calculator Display */}
              {buyAmount > 0 && (
                <div className="mb-4 p-6 sm:p-5 bg-gradient-to-br from-brand-green/20 to-brand-green/5 border-2 border-brand-green/40 rounded-lg">
                  <div className="text-center mb-4">
                    <div className="text-sm text-gray-300 mb-2">💰 Potential Return</div>
                    <div className="text-4xl sm:text-3xl font-bold text-brand-green mb-2 sm:mb-1">
                      ${potentialReturn.toFixed(2)}
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed px-2">
                      Stake <span className="font-semibold text-white">${totalCost.toFixed(2)} paper USDC</span>
                      {' '}→ if {outcomeTeamLabel(selectedOutcome, market)} wins, payout{' '}
                      <span className="font-semibold text-brand-green">${potentialReturn.toFixed(2)}</span>
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 sm:gap-3 pt-4 sm:pt-3 border-t border-white/10">
                    <div className="text-center">
                      <div className="text-xs text-gray-400 mb-1">Net Profit</div>
                      <div className="text-2xl sm:text-xl font-bold text-brand-green">
                        +${potentialProfit.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-400 mb-1">ROI</div>
                      <div className="text-2xl sm:text-xl font-bold text-brand-green">
                        +{((potentialProfit / totalCost) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Essential Summary - Always Visible */}
              {buyAmount > 0 && (
                <div className="space-y-2 p-4 bg-white/5 border border-white/10 rounded-lg text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">You pay</span>
                    <span className="font-mono font-bold text-brand-green">
                      ${totalCost.toFixed(2)} paper USDC
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Shares received</span>
                    <span className="font-mono font-semibold">
                      {sharesReceived.toFixed(1)}{' '}
                      {selectedOutcome === 'YES'
                        ? market.teamA
                        : selectedOutcome === 'DRAW'
                          ? 'Draw'
                          : market.teamB}
                    </span>
                  </div>
                </div>
              )}

              {/* Advanced Details Toggle */}
              {buyAmount > 0 && (
                <div className="border-t border-white/10 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-between text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    <span>Advanced details</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showAdvanced && (
                    <div className="space-y-2 p-4 bg-white/5 border border-white/10 rounded-lg text-sm mt-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Bid / Ask</span>
                        <span className="font-mono font-semibold">
                          ${bidPrice.toFixed(2)} / ${askPrice.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">Spread</span>
                          <Tooltip content="Spread is the difference between the best buy and sell price. A tighter spread means better liquidity and lower trading costs.">
                            <HelpCircle className="w-3 h-3 text-gray-500" />
                          </Tooltip>
                        </div>
                        <span className="font-mono font-semibold">
                          ${spread.toFixed(2)} ({spreadPct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">
                            {orderType === 'LIMIT' ? 'Maker fee' : 'Taker fee'}
                          </span>
                          <Tooltip content={orderType === 'LIMIT' 
                            ? "Makers add liquidity to the order book and pay 0% fee. Your limit order will sit in the book until filled."
                            : "Fee varies between 0.8% and 1.2% based on market uncertainty. Markets closer to 50/50 have higher fees. Makers (limit orders) pay 0% fee."
                          }>
                            <HelpCircle className="w-3 h-3 text-gray-500" />
                          </Tooltip>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold">
                            ${feeAmount.toFixed(2)} ({dynamicFeePct.toFixed(2)}%)
                          </span>
                          {orderType === 'LIMIT' && (
                            <span className="px-2 py-0.5 bg-brand-cyan/20 text-brand-cyan rounded text-xs font-semibold">
                              🟢 Maker
                            </span>
                          )}
                        </div>
                      </div>
                      {orderType === 'MARKET' && (
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400">Price impact</span>
                            <Tooltip content="Your trade moves the market price slightly. Larger orders have more impact.">
                              <HelpCircle className="w-3 h-3 text-gray-500" />
                            </Tooltip>
                          </div>
                          <span className={`font-mono font-semibold ${priceImpactPct > 5 ? 'text-red-500' : priceImpactPct > 2 ? 'text-orange-500' : ''}`}>
                            ~{priceImpactPct.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Fee Breakdown - Show how fees are distributed */}
              {buyAmount > 0 && orderType === 'MARKET' && (
                <div className="border-t border-white/10 pt-4">
                  <FeeBreakdownCard 
                    feeAmount={feeAmount} 
                    variant="compact"
                    className="mb-0"
                  />
                </div>
              )}

              {/* Price Impact Warnings */}
              {buyAmount > 0 && orderType === 'MARKET' && priceImpactPct > 2 && (
                <div className={`p-3 rounded-lg border flex items-start gap-2 ${
                  priceImpactPct > 5 
                    ? 'bg-red-500/10 border-red-500/30' 
                    : 'bg-orange-500/10 border-orange-500/30'
                }`}>
                  <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                    priceImpactPct > 5 ? 'text-red-500' : 'text-orange-500'
                  }`} />
                  <div className="text-xs leading-relaxed">
                    {priceImpactPct > 5 ? (
                      <>
                        <span className="font-semibold text-red-500">⚠ Very high price impact.</span>
                        <span className="text-gray-300"> Low liquidity in this market.</span>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-orange-500">⚠ High price impact.</span>
                        <span className="text-gray-300"> Consider splitting your order into smaller trades.</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={buyAmount <= 0 || (chainActionsBlocked)}
                className={`w-full py-5 sm:py-4 font-bold text-xl sm:text-lg rounded-lg transition-all disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95 ${
                  selectedOutcome === 'YES'
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : selectedOutcome === 'DRAW'
                      ? 'bg-gray-500 text-white hover:bg-gray-600'
                      : 'bg-cyan-500 text-white hover:bg-cyan-600'
                }`}
              >
                {buyAmount <= 0
                  ? 'Enter Amount'
                  : chainActionsBlocked
                    ? 'Switch network to trade'
                  : orderType === 'LIMIT'
                  ? `Place limit order · 0% fee`
                  : !isWalletConnected
                  ? `Buy ${
                      selectedOutcome === 'YES'
                        ? `${market.teamA} Wins`
                        : selectedOutcome === 'DRAW'
                          ? 'Draw (X)'
                          : `${market.teamB} Wins`
                    } (Demo)`
                  : isDemoActive
                  ? `Buy ${
                      selectedOutcome === 'YES'
                        ? `${market.teamA} Wins`
                        : selectedOutcome === 'DRAW'
                          ? 'Draw (X)'
                          : `${market.teamB} Wins`
                    } (DEMO)`
                  : `Buy ${
                      selectedOutcome === 'YES'
                        ? `${market.teamA} Wins`
                        : selectedOutcome === 'DRAW'
                          ? 'Draw (X)'
                          : `${market.teamB} Wins`
                    }`}
              </button>
              
              {/* Demo Mode Info */}
              {!isWalletConnected && (
                <div className="mt-2 text-center text-xs text-gray-400">
                  {predictionBalanceFootnote()} Connect a wallet to sync your paper account.
                </div>
              )}

              {orderType === 'LIMIT' && buyAmount > 0 && (
                <div className="mt-2 text-center text-xs text-gray-400">
                  No fees on limit orders · Order sits in book until filled
                </div>
              )}
            </form>
          </div>
        )}

        {/* SELL TAB */}
        {activeTab === 'sell' && (
          <div>
            {userPosition ? (
              <>
                {/* Position Info */}
                <div className="mb-4 p-4 bg-brand-green/10 border border-brand-green/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-gray-400">You own</div>
                    <div className={`flex items-center gap-1 text-sm ${positionPnL >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
                      {positionPnL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {positionPnL >= 0 ? '+' : ''}{positionPnLPct.toFixed(1)}%
                    </div>
                  </div>
                  <div className="font-mono text-2xl font-bold mb-1">
                    {userPosition.shares} {outcomeTeamLabel(userPosition.outcome, market)} shares
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Avg price: ${userPosition.avgPrice.toFixed(2)}</span>
                    <span className="text-gray-400">Current: ${currentPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-white/10">
                    <span className="text-gray-400">Value:</span>
                    <span className="font-mono font-semibold">${positionValue.toFixed(2)}</span>
                  </div>
                </div>

                {/* Outcome Selector for Sell */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select position to sell
                  </label>
                  <div
                    className={`grid gap-3 ${
                      hasDraw && userPositions.length > 2
                        ? 'grid-cols-1 sm:grid-cols-3'
                        : 'grid-cols-1 sm:grid-cols-2'
                    }`}
                  >
                    {userPositions.map((pos) => (
                      <button
                        key={pos.outcome}
                        onClick={() => {
                          setSelectedOutcome(pos.outcome);
                          sellForm.setValue('shares', pos.shares);
                        }}
                        className={`p-4 sm:p-3 rounded-lg border-2 transition-all min-h-[100px] sm:min-h-0 active:scale-95 ${
                          selectedOutcome === pos.outcome
                            ? 'border-orange-500 bg-orange-500/10'
                            : 'border-white/10 bg-white/5 hover:border-orange-500/50'
                        }`}
                      >
                        <div className="font-bold text-base sm:text-sm">
                          {outcomeTeamLabel(pos.outcome, market)}
                        </div>
                        <div className="font-mono text-xl sm:text-lg">{pos.shares} shares</div>
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={sellForm.handleSubmit(onSellSubmit)} className="space-y-4">
                  {/* Shares Input */}
                  <div>
                    <label htmlFor="shares" className="block text-sm font-medium text-gray-300 mb-2">
                      Shares to sell (max: {userPosition.shares})
                    </label>
                    <input
                      id="shares"
                      type="number"
                      step="0.01"
                      max={userPosition.shares}
                      {...sellForm.register('shares', { valueAsNumber: true })}
                      className="w-full px-4 sm:px-3 py-4 sm:py-3 bg-white/5 border border-white/10 rounded-lg text-white text-xl sm:text-lg font-mono placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                    {sellForm.formState.errors.shares && (
                      <p className="mt-1 text-sm text-red-500">{sellForm.formState.errors.shares.message}</p>
                    )}
                    
                    {/* Quick Sell Buttons */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="text-xs text-gray-400 mr-1 self-center">Quick:</span>
                      {[0.25, 0.5, 0.75, 1].map((fraction) => (
                        <button
                          key={fraction}
                          type="button"
                          onClick={() => sellForm.setValue('shares', userPosition.shares * fraction)}
                          className="px-4 py-2 sm:px-3 sm:py-1 text-sm sm:text-xs font-semibold bg-white/5 border border-white/10 rounded hover:border-orange-500 hover:bg-orange-500/10 transition-all active:scale-95"
                        >
                          {fraction === 1 ? 'Max' : `${fraction * 100}%`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sell Calculations */}
                  {sellShares > 0 && (
                    <div className="space-y-2 p-4 bg-white/5 border border-white/10 rounded-lg text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current price</span>
                        <span className="font-mono font-semibold">${currentPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">You receive</span>
                        <span className="font-mono font-semibold">${proceedsFromSell.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-white/10">
                        <span className="text-gray-400">Profit/Loss</span>
                        <span className={`font-mono font-bold ${profitFromSell >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
                          {profitFromSell >= 0 ? '+' : ''}${profitFromSell.toFixed(2)} ({profitFromSell >= 0 ? '+' : ''}{profitPct.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={
                      sellShares <= 0 ||
                      sellShares > userPosition.shares ||
                      (chainActionsBlocked)
                    }
                    className="w-full py-5 sm:py-4 bg-orange-500 text-white font-bold text-xl sm:text-lg rounded-lg hover:bg-orange-600 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
                  >
                    {sellShares <= 0
                      ? 'Enter Shares'
                      : chainActionsBlocked
                        ? 'Switch network to trade'
                      : !isWalletConnected
                      ? `Sell ${
                          selectedOutcome === 'YES'
                            ? `${market.teamA} Wins`
                            : selectedOutcome === 'DRAW'
                              ? 'Draw (X)'
                              : `${market.teamB} Wins`
                        } (Demo)`
                      : isDemoActive
                      ? `Sell ${
                          selectedOutcome === 'YES'
                            ? `${market.teamA} Wins`
                            : selectedOutcome === 'DRAW'
                              ? 'Draw (X)'
                              : `${market.teamB} Wins`
                        } (DEMO)`
                      : `Sell ${
                          selectedOutcome === 'YES'
                            ? `${market.teamA} Wins`
                            : selectedOutcome === 'DRAW'
                              ? 'Draw (X)'
                              : `${market.teamB} Wins`
                        }`}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">
                  You don&apos;t have any {outcomeTeamLabel(selectedOutcome, market)} shares in this market.
                </p>
                <button
                  onClick={() => setActiveTab('buy')}
                  className="px-6 py-3 bg-brand-green text-brand-bg font-semibold rounded-lg hover:bg-brand-green/90 transition-all"
                >
                  Buy {outcomeTeamLabel(selectedOutcome, market)}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-6 pt-4 border-t border-white/10 text-center text-xs text-gray-400">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-brand-green" />
            <span>Resolves automatically · Powered by Azuro oracle</span>
          </div>
        </div>

        {/* AI Assistant */}
        <div className="mt-6 border-t border-white/10 pt-6">
          <button
            onClick={() => setShowAIAssistant(!showAIAssistant)}
            className="w-full flex items-center justify-between p-4 bg-brand-cyan/5 border border-brand-cyan/30 rounded-lg hover:bg-brand-cyan/10 transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="text-brand-cyan text-lg">🤖</span>
              <span className="font-semibold text-brand-cyan">Ask AI about this market</span>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-brand-cyan transition-transform ${
                showAIAssistant ? 'rotate-180' : ''
              }`}
            />
          </button>

          {showAIAssistant && (
            <div className="mt-4 space-y-4 animate-slide-down">
              <div>
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder="Ask anything about this market..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                />
                <button
                  type="button"
                  onClick={() => void handleAskAI()}
                  disabled={isAIThinking || askMarketAiMutation.isPending}
                  className="mt-2 w-full py-2 bg-brand-cyan text-brand-bg font-semibold rounded-lg hover:bg-brand-cyan/90 transition-all disabled:opacity-50 text-sm"
                >
                  {isAIThinking || askMarketAiMutation.isPending
                    ? 'AI is thinking...'
                    : 'Ask AI →'}
                </button>
              </div>

              {aiResponse && (
                <div className="p-4 bg-brand-cyan/10 border border-brand-cyan/30 rounded-lg">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-brand-cyan text-lg">🤖</span>
                    <span className="font-semibold text-brand-cyan text-sm">AI Analysis:</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{aiResponse}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <WalletGateModal isOpen={showGateModal} onClose={closeGateModal} />

      <TransactionModal
        isOpen={showTxModal}
        onClose={() => {
          setShowTxModal(false);
          setTxError(undefined);
          setTxModalState('review');
        }}
        state={txModalState}
        type="bet"
        paperTrade
        marketName={market.teamA + ' vs ' + market.teamB}
        marketId={market.id}
        outcome={outcomeTeamLabel(selectedOutcome, market)}
        amount={activeTab === 'buy' ? buyAmount : proceedsFromSell}
        potentialWin={activeTab === 'buy' ? potentialReturn : proceedsFromSell}
        fee={0}
        netProfit={activeTab === 'buy' ? potentialProfit : profitFromSell}
        error={txError}
        onConfirm={handleConfirmTransaction}
        onRetry={() => {
          setTxError(undefined);
          setTxModalState('review');
        }}
        sportEmoji={market.sportEmoji}
        league={market.league}
        teamA={market.teamA}
        teamB={market.teamB}
        odds={1 / currentPrice}
      />
    </div>
  );
}
