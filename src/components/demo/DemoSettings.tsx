import { useState } from 'react';
import { useDemoAccount } from '~/hooks/useDemoAccount';
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react';
import toast from 'react-hot-toast';

export function DemoSettings() {
  const { stats, resetDemo, balance } = useDemoAccount();
  const [showConfirm, setShowConfirm] = useState(false);
  
  const handleReset = () => {
    resetDemo();
    setShowConfirm(false);
    toast.success('Demo account reset! You now have $1,000 virtual USDC.');
  };
  
  return (
    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-syne text-xl font-bold text-purple-400">Demo Settings</h3>
        <span className="px-3 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded font-bold text-sm">
          DEMO MODE
        </span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <Target className="w-4 h-4" />
            <span>Total Trades</span>
          </div>
          <div className="font-mono text-2xl font-bold">{stats.totalTrades}</div>
        </div>
        
        <div className="bg-white/5 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <DollarSign className="w-4 h-4" />
            <span>Total P&L</span>
          </div>
          <div className={`font-mono text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
            {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(0)}
          </div>
        </div>
        
        <div className="bg-white/5 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <TrendingUp className="w-4 h-4" />
            <span>Win Rate</span>
          </div>
          <div className="font-mono text-2xl font-bold">{stats.winRate.toFixed(0)}%</div>
        </div>
        
        <div className="bg-white/5 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <DollarSign className="w-4 h-4" />
            <span>Balance</span>
          </div>
          <div className="font-mono text-2xl font-bold text-purple-400">${balance.toFixed(0)}</div>
        </div>
      </div>
      
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="font-semibold">Reset Demo Account</span>
        </button>
      ) : (
        <div className="space-y-3">
          <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <p className="text-sm text-orange-400">
              This will erase all demo positions and reset balance to $1,000. This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 py-2 border border-white/20 rounded hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleReset}
              className="flex-1 py-2 bg-orange-500 text-white font-bold rounded hover:bg-orange-600 transition-colors"
            >
              Confirm Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
