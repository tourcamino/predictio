import { createFileRoute } from '@tanstack/react-router';
import { Plus, TrendingUp, Wrench, AlertTriangle } from 'lucide-react';
import { Header } from '~/components/Header';
import { Footer } from '~/components/Footer';

export const Route = createFileRoute('/developers/changelog/')({
  component: ChangelogPage,
});

interface ChangelogEntry {
  date: string;
  changes: Array<{
    type: 'NEW' | 'IMPROVED' | 'FIXED' | 'BREAKING';
    description: string;
  }>;
}

const changelog: ChangelogEntry[] = [
  {
    date: 'April 30, 2026',
    changes: [
      {
        type: 'NEW',
        description: 'Added /v1/feeds/liquidity-gaps endpoint for identifying low-liquidity opportunities',
      },
      {
        type: 'NEW',
        description: 'WebSocket channel `spreads` now available for real-time cross-market arbitrage signals',
      },
      {
        type: 'IMPROVED',
        description: 'Orderbook latency reduced from 180ms to 75ms average',
      },
      {
        type: 'FIXED',
        description: 'Rate limit headers now accurate after burst traffic',
      },
    ],
  },
  {
    date: 'April 15, 2026',
    changes: [
      {
        type: 'NEW',
        description: 'Paper mode added to Python and TypeScript SDKs for backtesting strategies',
      },
      {
        type: 'IMPROVED',
        description: 'Error messages now include doc_url field pointing to relevant documentation',
      },
      {
        type: 'FIXED',
        description: 'WebSocket reconnection logic now handles network interruptions gracefully',
      },
    ],
  },
  {
    date: 'March 28, 2026',
    changes: [
      {
        type: 'NEW',
        description: 'Rust SDK (predictio-rs) now available on crates.io',
      },
      {
        type: 'IMPROVED',
        description: 'API key generation flow now completes in under 5 seconds',
      },
      {
        type: 'BREAKING',
        description: 'Deprecated /v1/markets/legacy endpoint removed. Use /v1/markets instead',
      },
    ],
  },
  {
    date: 'March 10, 2026',
    changes: [
      {
        type: 'NEW',
        description: 'Developer leaderboard launched showing top API trading wallets',
      },
      {
        type: 'IMPROVED',
        description: 'Rate limiting now returns accurate Retry-After headers',
      },
      {
        type: 'FIXED',
        description: 'Order creation now properly validates market status before submission',
      },
    ],
  },
];

function ChangelogPage() {
  const getTagColor = (type: string) => {
    switch (type) {
      case 'NEW':
        return 'bg-[#00D97E]/20 text-[#00D97E] border-[#00D97E]/30';
      case 'IMPROVED':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'FIXED':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'BREAKING':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getTagIcon = (type: string) => {
    switch (type) {
      case 'NEW':
        return <Plus className="w-3 h-3" />;
      case 'IMPROVED':
        return <TrendingUp className="w-3 h-3" />;
      case 'FIXED':
        return <Wrench className="w-3 h-3" />;
      case 'BREAKING':
        return <AlertTriangle className="w-3 h-3" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E5E5E5]">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">API Changelog</h1>
          <p className="text-[#999999]">
            Stay updated with the latest changes, improvements, and fixes to the Predictio API.
          </p>
        </div>

        <div className="space-y-12">
          {changelog.map((entry, index) => (
            <div key={index} className="border-l-2 border-[#00D97E]/20 pl-8 relative">
              <div className="absolute -left-2 top-0 w-4 h-4 bg-[#00D97E] rounded-full" />
              
              <div className="mb-4">
                <h2 className="text-xl font-bold">{entry.date}</h2>
              </div>

              <div className="space-y-3">
                {entry.changes.map((change, changeIndex) => (
                  <div
                    key={changeIndex}
                    className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-4 hover:bg-[#00D97E]/5 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono border ${getTagColor(change.type)}`}
                      >
                        {getTagIcon(change.type)}
                        {change.type}
                      </span>
                      <p className="flex-1 text-[#E5E5E5]">{change.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* RSS Feed */}
        <div className="mt-12 text-center">
          <a
            href="/developers/changelog.rss"
            className="inline-flex items-center gap-2 text-sm text-[#999999] hover:text-[#00D97E] transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1z" />
            </svg>
            Subscribe to RSS feed
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
}
