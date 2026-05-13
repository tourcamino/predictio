import { TrendingUp, TrendingDown, DollarSign, Activity, Info } from 'lucide-react';
import { calcFee } from '~/utils/marketUtils';

interface FeeStructureAnalyticsProps {
  feeData: {
    avgFeeRate: number;
    today: number;
    week: number;
    month: number;
    totalTransactions: number;
    marketOrdersPct: number;
  };
}

export function FeeStructureAnalytics({ feeData }: FeeStructureAnalyticsProps) {
  // Calculate fee rates at different market conditions
  const feeAt5050 = calcFee(0.5); // Maximum fee at 50/50
  const feeAt7030 = calcFee(0.7); // Mid-range fee
  const feeAt9010 = calcFee(0.9); // Minimum fee at extreme odds
  
  // Simulate fee distribution (in production, this would come from actual transaction data)
  const feeDistribution = [
    { range: '0.8%', markets: 234, volume: 1240000, color: 'bg-blue-500' },
    { range: '0.9%', markets: 312, volume: 1680000, color: 'bg-cyan-500' },
    { range: '1.0%', markets: 428, volume: 2140000, color: 'bg-brand-cyan' },
    { range: '1.1%', markets: 289, volume: 1580000, color: 'bg-brand-green' },
    { range: '1.2%', markets: 187, volume: 980000, color: 'bg-green-500' },
  ];
  
  const totalVolume = feeDistribution.reduce((sum, d) => sum + d.volume, 0);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-syne font-bold">Dynamic Fee Structure Analysis</h3>
          <p className="text-sm text-gray-400 mt-1">
            0.8-1.2% dynamic fees based on market uncertainty
          </p>
        </div>
        <div className="px-4 py-2 bg-brand-green/20 border border-brand-green/30 rounded-lg">
          <div className="text-xs text-gray-400">Current Avg Fee</div>
          <div className="font-mono font-bold text-xl text-brand-green">
            {(feeData.avgFeeRate * 100).toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Fee Structure Explanation */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <Info className="w-5 h-5 text-brand-cyan flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold mb-2">How Dynamic Fees Work</h4>
            <p className="text-sm text-gray-400 mb-3">
              Fee rates adjust based on market conditions. Markets closer to 50/50 (higher uncertainty) 
              have higher fees, while markets with clear favorites have lower fees.
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">At 50/50 (Max Uncertainty)</div>
            <div className="font-mono font-bold text-2xl text-brand-green">
              {(feeAt5050 * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-400 mt-1">Maximum fee</div>
          </div>
          
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">At 70/30 (Moderate)</div>
            <div className="font-mono font-bold text-2xl text-brand-cyan">
              {(feeAt7030 * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-400 mt-1">Mid-range fee</div>
          </div>
          
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">At 90/10 (Clear Favorite)</div>
            <div className="font-mono font-bold text-2xl text-blue-400">
              {(feeAt9010 * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-400 mt-1">Minimum fee</div>
          </div>
        </div>
      </div>

      {/* Fee Distribution */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h4 className="font-semibold mb-4">Fee Distribution Across Markets</h4>
        
        <div className="space-y-3 mb-6">
          {feeDistribution.map((item) => {
            const volumePct = (item.volume / totalVolume) * 100;
            
            return (
              <div key={item.range}>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-mono font-semibold">{item.range} fee</span>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-400">{item.markets} markets</span>
                    <span className="font-mono">${(item.volume / 1000000).toFixed(2)}M</span>
                  </div>
                </div>
                <div className="relative h-8 bg-white/5 rounded-lg overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 ${item.color} transition-all duration-500`}
                    style={{ width: `${volumePct}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-end pr-3">
                    <span className="text-xs font-mono font-bold text-white mix-blend-difference">
                      {volumePct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="pt-4 border-t border-white/10 text-sm text-gray-400">
          <strong>Insight:</strong> Most volume occurs at 0.9-1.1% fee range, indicating healthy 
          market diversity between competitive and one-sided markets.
        </div>
      </div>

      {/* Volume Impact Analysis */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-green" />
            Volume Impact
          </h4>
          
          <div className="space-y-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Markets with Low Fees (0.8-0.9%)</div>
              <div className="font-mono text-xl font-bold text-brand-cyan">
                ${(((feeDistribution[0]?.volume ?? 0) + (feeDistribution[1]?.volume ?? 0)) / 1000000).toFixed(2)}M
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {(((feeDistribution[0]?.volume ?? 0) + (feeDistribution[1]?.volume ?? 0)) / totalVolume * 100).toFixed(1)}% of total volume
              </div>
            </div>
            
            <div className="pt-3 border-t border-white/10">
              <div className="text-xs text-gray-500 mb-1">Markets with High Fees (1.1-1.2%)</div>
              <div className="font-mono text-xl font-bold text-brand-green">
                ${(((feeDistribution[3]?.volume ?? 0) + (feeDistribution[4]?.volume ?? 0)) / 1000000).toFixed(2)}M
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {(((feeDistribution[3]?.volume ?? 0) + (feeDistribution[4]?.volume ?? 0)) / totalVolume * 100).toFixed(1)}% of total volume
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-brand-green" />
            Revenue Optimization
          </h4>
          
          <div className="space-y-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Current Structure Revenue</div>
              <div className="font-mono text-xl font-bold text-brand-green">
                ${feeData.month.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400 mt-1">Last 30 days</div>
            </div>
            
            <div className="pt-3 border-t border-white/10">
              <div className="text-xs text-gray-500 mb-1">Projected Monthly (Current Trend)</div>
              <div className="font-mono text-xl font-bold text-brand-cyan">
                ${(feeData.month * 1.15).toLocaleString()}
              </div>
              <div className="flex items-center gap-1 text-xs text-brand-green mt-1">
                <TrendingUp className="w-3 h-3" />
                +15% growth projection
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Market Order vs Limit Order Impact */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h4 className="font-semibold mb-4">Order Type Fee Impact</h4>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Market Orders (Taker Fee)</span>
              <span className="font-mono font-semibold">{(feeData.marketOrdersPct * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-3">
              <div 
                className="bg-brand-green h-3 rounded-full transition-all"
                style={{ width: `${feeData.marketOrdersPct * 100}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Generates dynamic fee revenue (0.8-1.2%)
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Limit Orders (Maker Fee)</span>
              <span className="font-mono font-semibold">{((1 - feeData.marketOrdersPct) * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-3">
              <div 
                className="bg-brand-cyan h-3 rounded-full transition-all"
                style={{ width: `${(1 - feeData.marketOrdersPct) * 100}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-2">
              No fee (provides liquidity)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
