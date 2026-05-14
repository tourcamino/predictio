import { Link } from '@tanstack/react-router';
import { TrendingUp, Zap } from 'lucide-react';
import { useDemoAccount } from '~/hooks/useDemoAccount';
import { useWallet } from '~/store/useWalletStore';
import { usePaperWalletBalance } from '~/hooks/usePaperWalletBalance';

export function EmptyTradingState() {
  const { balance: demoBalance } = useDemoAccount();
  const { isConnected } = useWallet();
  const { cashUsdc: paperCash } = usePaperWalletBalance();
  
  const currentBalance = isConnected ? paperCash : demoBalance;
  const isDemo = !isConnected;
  
  return (
    <div className="flex items-center justify-center min-h-[600px]">
      <div className="text-center max-w-md">
        {/* Illustration */}
        <div className="mb-8 flex justify-center">
          <div className="w-32 h-32 bg-white/5 border border-white/10 rounded-full flex items-center justify-center">
            <TrendingUp className="w-16 h-16 text-gray-500" />
          </div>
        </div>

        {/* Heading */}
        <h2 className="font-syne font-bold text-3xl mb-4">
          No active positions yet
        </h2>

        {/* Description */}
        <p className="text-gray-400 text-lg mb-8">
          {isDemo 
            ? "You have $1,000 virtual USDC ready to trade. Start predicting on sports events!"
            : "Browse prediction markets and start trading on sports events you follow."}
        </p>

        {/* CTAs */}
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/markets"
            className="px-6 py-3 bg-brand-green text-brand-bg font-semibold rounded-lg hover:bg-brand-green/90 transition-all inline-flex items-center gap-2"
          >
            Browse Markets
            <TrendingUp className="w-4 h-4" />
          </Link>
          
          <Link
            to="/markets"
            search={{ sport: 'Soccer' }}
            className="px-6 py-3 bg-white/5 border border-white/10 text-white font-semibold rounded-lg hover:bg-white/10 transition-all inline-flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Popular Markets
          </Link>
        </div>

        {/* Balance Display */}
        <div className="mt-8 pt-8 border-t border-white/10">
          <p className="text-sm text-gray-500 mb-2">Available Balance</p>
          <div className="flex items-center justify-center gap-2">
            <p className="font-mono text-2xl font-bold">${currentBalance.toFixed(0)} USDC</p>
            {isDemo && (
              <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs font-semibold rounded">
                DEMO
              </span>
            )}
          </div>
        </div>

        {/* Hint */}
        <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded-lg">
          <p className="text-sm text-gray-400">
            {isDemo 
              ? "💡 Trading with virtual funds. Your positions will appear here once you place your first trade."
              : "Once you open positions, they'll appear here in real-time."}
          </p>
        </div>
      </div>
    </div>
  );
}
