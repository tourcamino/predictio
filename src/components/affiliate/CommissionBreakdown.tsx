import { TIER_FEE_SHARE, TIER_COLORS } from '~/systems/rewardEngine';
import { TrendingUp, DollarSign, Info } from 'lucide-react';

interface CommissionBreakdownProps {
  currentTier: 'bronze' | 'silver' | 'gold' | 'elite';
  totalEarned: number;
  volumeGenerated: number;
  earningsHistory: Array<{ date: number; earnings: number }>;
}

export function CommissionBreakdown({
  currentTier,
  totalEarned,
  volumeGenerated,
  earningsHistory,
}: CommissionBreakdownProps) {
  const currentRate = TIER_FEE_SHARE[currentTier];
  
  // Calculate earnings breakdown by period
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  
  const last7Days = earningsHistory.filter(e => e.date >= now - 7 * day);
  const last30Days = earningsHistory.filter(e => e.date >= now - 30 * day);
  
  const earnings7d = last7Days.reduce((sum, e) => sum + e.earnings, 0);
  const earnings30d = last30Days.reduce((sum, e) => sum + e.earnings, 0);
  
  // Calculate average platform fee (assume ~1% average)
  const avgPlatformFee = 0.01;
  const estimatedFeeGenerated = volumeGenerated * avgPlatformFee;
  const yourCommission = estimatedFeeGenerated * currentRate;
  
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-syne font-bold text-xl">Commission Breakdown</h3>
        <div className="text-sm text-gray-400 flex items-center gap-2">
          <Info className="w-4 h-4" />
          <span>Updated commission structure</span>
        </div>
      </div>

      {/* Current Rate Highlight */}
      <div className="bg-gradient-to-br from-brand-green/20 to-brand-cyan/20 border border-brand-green/30 rounded-lg p-6">
        <div className="text-sm text-gray-400 mb-2">Your Current Commission Rate</div>
        <div className="flex items-center gap-4">
          <div className="font-mono font-bold text-5xl text-brand-green">
            {(currentRate * 100).toFixed(0)}%
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-300 mb-1">
              Tier: <span className="font-semibold capitalize">{currentTier}</span>
            </div>
            <div className="text-xs text-gray-400">
              You earn {(currentRate * 100).toFixed(0)}% of platform fees from your referrals' trades
            </div>
          </div>
        </div>
      </div>

      {/* Tier Comparison */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-gray-400">Commission by Tier</h4>
        <div className="grid grid-cols-4 gap-3">
          {(['bronze', 'silver', 'gold', 'elite'] as const).map((tier) => {
            const rate = TIER_FEE_SHARE[tier];
            const isCurrent = tier === currentTier;
            
            return (
              <div
                key={tier}
                className={`p-4 rounded-lg border ${
                  isCurrent
                    ? 'bg-brand-green/10 border-brand-green'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="text-xs text-gray-500 mb-1 capitalize">{tier}</div>
                <div className={`font-mono font-bold text-2xl ${
                  isCurrent ? 'text-brand-green' : ''
                }`}>
                  {(rate * 100).toFixed(0)}%
                </div>
                {isCurrent && (
                  <div className="text-xs text-brand-green mt-1">Current</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Earnings Breakdown */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-gray-400">Earnings Summary</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">Last 7 Days</div>
            <div className="font-mono font-bold text-xl text-brand-cyan">
              ${earnings7d.toFixed(2)}
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">Last 30 Days</div>
            <div className="font-mono font-bold text-xl text-brand-cyan">
              ${earnings30d.toFixed(2)}
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">All Time</div>
            <div className="font-mono font-bold text-xl text-brand-green">
              ${totalEarned.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Commission Calculator */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand-green" />
          Commission Calculation
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Referral Volume Generated</span>
            <span className="font-mono font-semibold">${volumeGenerated.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Avg Platform Fee (~1%)</span>
            <span className="font-mono font-semibold">${estimatedFeeGenerated.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <span className="text-gray-400">Your Commission ({(currentRate * 100).toFixed(0)}%)</span>
            <span className="font-mono font-bold text-brand-green">${yourCommission.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Info Note */}
      <div className="text-xs text-gray-500 bg-blue-500/10 border border-blue-500/20 rounded p-3">
        <strong className="text-blue-400">Note:</strong> Commission rates increased from previous structure. 
        Bronze: 15%→30%, Silver: 20%→35%, Gold: 25%→40%, Elite: 30%→50%
      </div>
    </div>
  );
}
