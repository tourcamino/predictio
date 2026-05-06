import { useEffect, useRef, useState } from 'react';
import { Market } from '~/data/mockMarkets';

interface OrderBookVisualProps {
  market: Market;
}

interface TopPosition {
  rank: number;
  wallet: string;
  outcome: string;
  outcomeLabel: string;
  amount: number;
  status: string;
}

export function OrderBookVisual({ market }: OrderBookVisualProps) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  const pctA = market.percentA ?? 0;
  const pctB = market.percentB ?? 0;
  const pctDraw = market.percentDraw;

  const outcomes = [
    {
      id: 'teamA',
      label: `${market.teamA} Win`,
      percent: pctA,
      volume: market.volume * (pctA / 100),
      color: 'bg-brand-green',
    },
    ...(pctDraw != null
      ? [
          {
            id: 'draw',
            label: 'Draw',
            percent: pctDraw,
            volume: market.volume * (pctDraw / 100),
            color: 'bg-gray-400',
          },
        ]
      : []),
    {
      id: 'teamB',
      label: `${market.teamB} Win`,
      percent: pctB,
      volume: market.volume * (pctB / 100),
      color: 'bg-cyan-400',
    },
  ];

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(2)}M`;
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(1)}K`;
    }
    return `$${volume.toFixed(0)}`;
  };

  // Generate mock top positions
  const topPositions: TopPosition[] = generateTopPositions(market);

  return (
    <div ref={containerRef} className="bg-brand-bg border border-white/10 rounded-lg p-6">
      <h2 className="font-syne font-bold text-2xl mb-6">Prediction Distribution</h2>

      {/* Horizontal Bars */}
      <div className="space-y-4 mb-8">
        {outcomes.map((outcome) => (
          <div key={outcome.id}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">{outcome.label}</span>
              <div className="flex items-center gap-3 font-mono text-sm">
                <span className="text-gray-400">{outcome.percent.toFixed(1)}%</span>
                <span className="text-gray-400">·</span>
                <span className="font-semibold">{formatVolume(outcome.volume)}</span>
              </div>
            </div>
            <div className="h-8 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full ${outcome.color} transition-all duration-1200 ease-out`}
                style={{
                  width: isVisible ? `${outcome.percent}%` : '0%',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Top Positions Table */}
      <div>
        <h3 className="font-syne font-bold text-lg mb-4">Top 10 Positions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-2 font-semibold text-gray-400">Rank</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-400">Wallet</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-400">Outcome</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-400">Amount</th>
                <th className="text-center py-2 px-2 font-semibold text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {topPositions.map((position) => (
                <tr key={position.rank} className="border-b border-white/10 hover:bg-white/5">
                  <td className="py-3 px-2 font-mono text-gray-400">{position.rank}</td>
                  <td className="py-3 px-2 font-mono text-sm">{position.wallet}</td>
                  <td className="py-3 px-2">{position.outcomeLabel}</td>
                  <td className="py-3 px-2 text-right font-mono font-semibold text-brand-green">
                    ${position.amount.toLocaleString()}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="px-2 py-1 bg-brand-green/10 text-brand-green text-xs font-semibold rounded">
                      {position.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function generateTopPositions(market: Market): TopPosition[] {
  const outcomes = [
    { id: 'teamA', label: `${market.teamA}` },
    ...(market.percentDraw ? [{ id: 'draw', label: 'Draw' }] : []),
    { id: 'teamB', label: `${market.teamB}` },
  ];

  const positions: TopPosition[] = [];
  
  for (let i = 1; i <= 10; i++) {
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
    const amount = Math.floor(Math.random() * 10000) + 1000;
    
    positions.push({
      rank: i,
      wallet: generateWallet(),
      outcome: outcome.id,
      outcomeLabel: outcome.label,
      amount,
      status: 'Open',
    });
  }
  
  return positions.sort((a, b) => b.amount - a.amount).map((p, i) => ({ ...p, rank: i + 1 }));
}

function generateWallet(): string {
  const chars = '0123456789abcdef';
  let wallet = '0x';
  for (let i = 0; i < 4; i++) {
    wallet += chars[Math.floor(Math.random() * chars.length)];
  }
  wallet += '...';
  for (let i = 0; i < 4; i++) {
    wallet += chars[Math.floor(Math.random() * chars.length)];
  }
  return wallet;
}
