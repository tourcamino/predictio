import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2, Lock, CheckCircle, ChevronDown, TrendingUp, TrendingDown, HelpCircle, AlertTriangle } from 'lucide-react';
import { useTRPC } from '~/trpc/react';
import { Market } from '~/data/mockMarkets';
import { useWallet } from '~/store/useWalletStore';
import { TransactionModal } from '../TransactionModal';
import { calcFee, calcPriceImpact, calculateOrderFee, getOrderRole } from '~/utils/marketUtils';
import { useDemoAccount } from '~/hooks/useDemoAccount';
import { DemoBadge } from '~/components/demo/DemoBadge';
import { FeeBreakdownCard } from '~/components/FeeBreakdownCard';
import { getMarketStatus, isMarketTradeable } from '~/utils/marketLifecycle';

interface TradingBoxProps {
  market: Market;
}

type TabType = 'buy' | 'sell';
type OutcomeType = 'YES' | 'NO';

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

export function TradingBox({ market }: TradingBoxProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { isConnected: isWalletConnected, openWalletModal, address: walletAddress, updateBalance, balance: walletBalance } = useWallet();
  const { isActive: isDemoActive, executeDemoTrade, balance: demoBalance, activateDemo } = useDemoAccount();
  
  // Use demo balance when wallet is not connected
  const currentBalance = isWalletConnected ? walletBalance : demoBalance;
  
  const [activeTab, setActiveTab] = useState<TabType>('buy');
  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeType>('YES');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [txModalState, setTxModalState] = useState<'review' | 'pending' | 'mining' | 'success' | 'error'>('review');
  const [showTxModal, setShowTxModal] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch user positions for this market
  const positionsQuery = useQuery({
    ...trpc.getUserPositions.queryOptions({
      walletAddress: walletAddress || '',
      status: 'open',
    }),
    enabled: !!walletAddress && isWalletConnected,
  });

  // Filter positions for the current market and map to UserPosition format
  const userPositions: UserPosition[] = (positionsQuery.data?.positions || [])
    .filter(p => p.marketId === market.id)
    .map(p => ({
      id: p.id,
      outcome: p.outcome.toUpperCase() as OutcomeType,
      shares: p.shares || 0,
      avgPrice: p.avgPrice || 0,
    }));

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

  // Get current prices
  const currentPrice = selectedOutcome === 'YES' ? market.yesPrice : market.noPrice;
  const oppositePrice = selectedOutcome === 'YES' ? market.noPrice : market.yesPrice;

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
  const poolSize = liquidity?.totalPool || 50000;
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

  const placeTradeMutation = useMutation(
    trpc.placePrediction.mutationOptions({
      onSuccess: (data) => {
        setTxModalState('success');
        
        // Update wallet balance
        if (data.newBalance !== undefined) {
          updateBalance(data.newBalance);
        }
        
        toast.success(`Trade executed successfully! ${selectedOutcome} shares purchased.`, {
          duration: 4000,
          icon: '✅',
        });
        
        setTimeout(() => {
          setShowTxModal(false);
          buyForm.reset();
        }, 2000);
        
        queryClient.invalidateQueries({
          queryKey: trpc.getMarketDetail.queryKey({ marketId: market.id }),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.getUserPositions.queryKey({ walletAddress: walletAddress || '', status: 'all' }),
        });
      },
      onError: (error) => {
        setTxModalState('error');
        
        // Provide user-friendly error messages
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
        
        toast.error(errorMessage, {
          duration: 5000,
          icon: '❌',
        });
      },
    })
  );

  const closePositionMutation = useMutation(
    trpc.closePosition.mutationOptions({
      onSuccess: (data) => {
        setTxModalState('success');
        
        // Update wallet balance
        if (data.newBalance !== undefined) {
          updateBalance(data.newBalance);
        }
        
        toast.success(data.message || 'Position closed successfully!', {
          duration: 4000,
          icon: '✅',
        });
        
        setTimeout(() => {
          setShowTxModal(false);
          sellForm.reset();
        }, 2000);
        
        queryClient.invalidateQueries({
          queryKey: trpc.getUserPositions.queryKey({ walletAddress: walletAddress || '', status: 'all' }),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.getPortfolioSummary.queryKey({ walletAddress: walletAddress || '' }),
        });
      },
      onError: (error) => {
        setTxModalState('error');
        
        let errorMessage = 'Failed to close position. Please try again.';
        
        if (error.message.includes('not found')) {
          errorMessage = 'Position not found. It may have already been closed.';
        } else if (error.message.includes('insufficient shares')) {
          errorMessage = 'Insufficient shares to sell.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        toast.error(errorMessage, {
          duration: 5000,
          icon: '❌',
        });
      },
    })
  );

  const onBuySubmit = async (data: BuyFormData) => {
    // TODO CURSOR C1: validate trade lock server-side before execution
    // Frontend protection: check if market is still open for trading
    if (!isMarketTradeable(market)) {
      const status = getMarketStatus(market);
      if (status === 'locked') {
        toast.error('Trading is closed for this market. Match has started.');
        return;
      } else if (status === 'resolved') {
        toast.error('This market has been resolved. Trading is no longer available.');
        return;
      }
    }
    
    // Additional time-based check
    if (new Date() >= market.start_time) {
      toast.error('Trading closed at kickoff.');
      return;
    }
    
    // Always use demo mode if wallet is not connected
    if (!isWalletConnected) {
      const result = await executeDemoTrade({
        marketId: market.id,
        outcome: selectedOutcome,
        type: 'BUY',
        amount: data.amount,
        price: currentPrice,
      });
      
      if (result.success) {
        toast.success(result.message);
        buyForm.reset();
      } else {
        toast.error(result.message);
      }
      return;
    }
    
    // If wallet is connected and demo is active, use demo trade
    if (isDemoActive) {
      const result = await executeDemoTrade({
        marketId: market.id,
        outcome: selectedOutcome,
        type: 'BUY',
        amount: data.amount,
        price: currentPrice,
      });
      
      if (result.success) {
        toast.success(result.message);
        buyForm.reset();
      } else {
        toast.error(result.message);
      }
      return;
    }
    
    // Only show transaction modal for real wallet trades
    setTxModalState('review');
    setShowTxModal(true);
  };

  const onSellSubmit = async (data: SellFormData) => {
    if (!userPosition || data.shares > userPosition.shares) {
      toast.error('Insufficient shares');
      return;
    }
    
    // Always use demo mode if wallet is not connected
    if (!isWalletConnected) {
      const result = await executeDemoTrade({
        marketId: market.id,
        outcome: selectedOutcome,
        type: 'SELL',
        amount: data.shares * currentPrice,
        price: currentPrice,
      });
      
      if (result.success) {
        toast.success(result.message);
        sellForm.reset();
      } else {
        toast.error(result.message);
      }
      return;
    }
    
    // If wallet is connected and demo is active, use demo trade
    if (isDemoActive) {
      const result = await executeDemoTrade({
        marketId: market.id,
        outcome: selectedOutcome,
        type: 'SELL',
        amount: data.shares * currentPrice,
        price: currentPrice,
      });
      
      if (result.success) {
        toast.success(result.message);
        sellForm.reset();
      } else {
        toast.error(result.message);
      }
      return;
    }
    
    // Only show transaction modal for real wallet trades
    setTxModalState('review');
    setShowTxModal(true);
  };

  const handleConfirmTransaction = () => {
    setTxModalState('pending');
    setTimeout(() => {
      setTxModalState('mining');
      
      if (activeTab === 'buy') {
        // Get limit price if it's a limit order
        const limitPriceInput = document.getElementById('limitPrice') as HTMLInputElement;
        const limitPrice = orderType === 'LIMIT' && limitPriceInput ? parseFloat(limitPriceInput.value) : undefined;
        
        placeTradeMutation.mutate({
          marketId: market.id,
          outcome: selectedOutcome.toLowerCase(),
          amount: buyAmount,
          walletAddress: walletAddress || '',
          orderType,
          limitPrice,
        });
      } else {
        // Sell flow
        if (userPosition && userPosition.id) {
          closePositionMutation.mutate({
            orderId: userPosition.id,
            walletAddress: walletAddress || '',
            sharesToSell: sellShares,
            currentPrice,
          });
        } else {
          setTxModalState('error');
          toast.error('Position not found');
        }
      }
    }, 1500);
  };

  const handleAskAI = () => {
    if (!aiQuestion.trim()) return;
    setIsAIThinking(true);
    setTimeout(() => {
      setAiResponse(
        `Based on current market dynamics, the ${selectedOutcome} token at $${currentPrice.toFixed(2)} represents a ${estProbability.toFixed(0)}% implied probability. Trading volume of $${market.volume.toLocaleString()} with ${market.traders} traders suggests strong market confidence. Historical data shows similar matchups with comparable odds have resolved favorably ${Math.floor(Math.random() * 20 + 60)}% of the time.`
      );
      setIsAIThinking(false);
    }, 2000);
  };

  const quickAmounts = [10, 50, 100, 500];

  return (
    <div className="lg:static lg:transform-none fixed bottom-0 left-0 right-0 z-40 lg:z-auto pb-safe">
      <div className="bg-brand-bg border-2 border-brand-green/30 rounded-t-lg lg:rounded-lg p-4 sm:p-6 shadow-2xl lg:shadow-lg max-h-[85vh] lg:max-h-none overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-syne font-bold text-xl">Trade Shares</h2>
          {(isDemoActive || !isWalletConnected) && (
            <div className="flex items-center gap-2">
              <DemoBadge size="sm" />
              <span className="text-sm text-purple-400 font-mono">${currentBalance.toFixed(0)}</span>
            </div>
          )}
        </div>

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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
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
                <button
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
                  Amount (USDC)
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
                    <div className="text-sm text-gray-400 leading-relaxed px-2">
                      If you deposit <span className="font-semibold text-white">${totalCost.toFixed(2)}</span>, you will win <span className="font-semibold text-brand-green">${potentialReturn.toFixed(2)}</span>
                    </div>
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
                      ${totalCost.toFixed(2)} USDC
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Shares received</span>
                    <span className="font-mono font-semibold">
                      {sharesReceived.toFixed(1)} {selectedOutcome === 'YES' ? market.teamA : market.teamB}
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
                disabled={buyAmount <= 0}
                className={`w-full py-5 sm:py-4 font-bold text-xl sm:text-lg rounded-lg transition-all disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95 ${
                  selectedOutcome === 'YES'
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-cyan-500 text-white hover:bg-cyan-600'
                }`}
              >
                {buyAmount <= 0
                  ? 'Enter Amount'
                  : orderType === 'LIMIT'
                  ? `Place limit order · 0% fee`
                  : !isWalletConnected
                  ? `Buy ${selectedOutcome === 'YES' ? market.teamA : market.teamB} Wins (Demo)`
                  : isDemoActive
                  ? `Buy ${selectedOutcome === 'YES' ? market.teamA : market.teamB} Wins (DEMO)`
                  : `Buy ${selectedOutcome === 'YES' ? market.teamA : market.teamB} Wins`}
              </button>
              
              {/* Demo Mode Info */}
              {!isWalletConnected && (
                <div className="mt-2 text-center text-xs text-gray-400">
                  Trading with virtual $1,000 USDC · Connect wallet for real trading
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
                    {userPosition.shares} {selectedOutcome} shares
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        <div className="font-bold text-base sm:text-sm">{pos.outcome}</div>
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
                    disabled={sellShares <= 0 || sellShares > userPosition.shares}
                    className="w-full py-5 sm:py-4 bg-orange-500 text-white font-bold text-xl sm:text-lg rounded-lg hover:bg-orange-600 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
                  >
                    {sellShares <= 0
                      ? 'Enter Shares'
                      : !isWalletConnected
                      ? `Sell ${selectedOutcome === 'YES' ? market.teamA : market.teamB} Wins (Demo)`
                      : isDemoActive
                      ? `Sell ${selectedOutcome === 'YES' ? market.teamA : market.teamB} Wins (DEMO)`
                      : `Sell ${selectedOutcome === 'YES' ? market.teamA : market.teamB} Wins`}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">You don't have any {selectedOutcome} shares in this market.</p>
                <button
                  onClick={() => setActiveTab('buy')}
                  className="px-6 py-3 bg-brand-green text-brand-bg font-semibold rounded-lg hover:bg-brand-green/90 transition-all"
                >
                  Buy {selectedOutcome} shares
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
                  onClick={handleAskAI}
                  disabled={isAIThinking}
                  className="mt-2 w-full py-2 bg-brand-cyan text-brand-bg font-semibold rounded-lg hover:bg-brand-cyan/90 transition-all disabled:opacity-50 text-sm"
                >
                  {isAIThinking ? 'AI is thinking...' : 'Ask AI →'}
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

      <TransactionModal
        isOpen={showTxModal}
        onClose={() => setShowTxModal(false)}
        state={txModalState}
        type="bet"
        marketName={market.teamA + ' vs ' + market.teamB}
        marketId={market.id}
        outcome={selectedOutcome}
        amount={activeTab === 'buy' ? buyAmount : proceedsFromSell}
        potentialWin={activeTab === 'buy' ? potentialReturn : proceedsFromSell}
        fee={0}
        netProfit={activeTab === 'buy' ? potentialProfit : profitFromSell}
        txHash="0x1234567890abcdef"
        onConfirm={handleConfirmTransaction}
        onRetry={() => setTxModalState('review')}
        sportEmoji={market.sportEmoji}
        league={market.league}
        teamA={market.teamA}
        teamB={market.teamB}
        odds={1 / currentPrice}
      />
    </div>
  );
}
