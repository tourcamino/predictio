import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useWalletStore } from "~/store/useWalletStore";
import {
  resolveMockTrader,
  getTraderOpenTrades,
  MockTrader,
  MockOpenTrade
} from "~/data/mockData";
import { TraderPerformanceCharts } from "~/components/analyst/TraderPerformanceCharts";
import { buildDemoTraderPerformance } from "~/utils/demoTraderPerformance";
import {
  TrendingUp,
  Users,
  Target,
  Award,
  Copy,
  Share2,
  CheckCircle,
  XCircle,
  X,
  Send
} from "lucide-react";
import toast from "react-hot-toast";
import { 
  generateTraderPerformanceShareText,
  getTwitterShareUrl,
  getTelegramShareUrl,
} from "~/utils/shareUtils";
import { useTRPC } from "~/trpc/react";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/trader/$wallet/")({
  component: TraderProfilePage,
});

function TraderProfilePage() {
  const { wallet } = Route.useParams();
  const trpc = useTRPC();
  const { isConnected, openWalletModal } = useWalletStore();
  const [activeTab, setActiveTab] = useState<'positions' | 'history' | 'copiers'>('positions');
  const [perfRange, setPerfRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('90d');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showSharePerformanceModal, setShowSharePerformanceModal] = useState(false);

  const walletNormalized = wallet.trim().toLowerCase();

  // TODO CURSOR C1: replace with real API call to /api/trader/{wallet}
  const trader = resolveMockTrader(wallet);

  const performanceQuery = useQuery({
    ...trpc.getTraderPerformanceHistory.queryOptions({
      walletAddress: walletNormalized,
      timeRange: perfRange,
    }),
    enabled: !!trader,
  });

  const performanceCharts = useMemo(() => {
    if (!trader) return null;
    const api = performanceQuery.data;
    if (api && api.pnlHistory.length > 0) {
      return { payload: api, isLive: true as const };
    }
    return {
      payload: buildDemoTraderPerformance(trader, perfRange),
      isLive: false as const,
    };
  }, [trader, performanceQuery.data, perfRange]);

  // TODO CURSOR C1: replace with real API call to /api/trades/open?trader={wallet}
  const openTrades = trader ? getTraderOpenTrades(trader.wallet) : [];

  const handleCopyClick = () => {
    if (!isConnected) {
      openWalletModal();
      return;
    }
    setShowCopyModal(true);
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!trader) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <div className="pb-20 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Trader Not Found</h1>
            <p className="text-gray-400 mb-6">
              The trader you're looking for doesn't exist.
            </p>
            <Link
              to="/copy"
              className="inline-block px-6 py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors"
            >
              Browse All Traders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Profile Header */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-8 mb-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              {/* Trader Info */}
              <div>
                <h1 className="font-mono font-bold text-3xl mb-2">{trader.wallet}</h1>
                <p className="text-gray-400">
                  Member since {new Date(trader.memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCopyClick}
                  className="px-8 py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy This Trader
                </button>
                <button
                  onClick={() => setShowSharePerformanceModal(true)}
                  className="px-6 py-3 bg-brand-green/20 border border-brand-green text-brand-green font-bold rounded-lg hover:bg-brand-green/30 transition-colors flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share Stats
                </button>
                <button
                  onClick={handleShare}
                  className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                >
                  {copiedLink ? <CheckCircle className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={TrendingUp}
              label="Win Rate"
              value={`${trader.winRate}%`}
              color="text-brand-green"
            />
            <StatCard
              icon={Target}
              label="Total Volume"
              value={`$${(trader.totalVolume / 1000).toFixed(1)}K`}
              color="text-brand-cyan"
            />
            <StatCard
              icon={Award}
              label="Total Trades"
              value={trader.totalTrades.toString()}
              color="text-white"
            />
            <StatCard
              icon={Users}
              label="Active Copiers"
              value={trader.activeCopiers.toString()}
              color="text-white"
            />
          </div>

          {/* Performance charts — DB history when available; otherwise demo series from profile stats */}
          {performanceCharts && (
            <div className="mb-8 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="font-syne font-bold text-2xl text-white">Performance</h2>
                  {!performanceCharts.isLive && (
                    <p className="text-sm text-gray-500 mt-1">
                      Projected from public stats until resolved trade history is synced.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["7d", "7D"],
                      ["30d", "30D"],
                      ["90d", "90D"],
                      ["1y", "1Y"],
                      ["all", "All"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPerfRange(key)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                        perfRange === key
                          ? "bg-brand-green text-brand-bg"
                          : "bg-white/5 text-gray-400 hover:text-white border border-white/10"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {performanceQuery.isFetching && performanceCharts.isLive && (
                <p className="text-xs text-gray-500">Updating chart data…</p>
              )}
              <TraderPerformanceCharts
                pnlHistory={performanceCharts.payload.pnlHistory}
                winRateHistory={performanceCharts.payload.winRateHistory}
                roiHistory={performanceCharts.payload.roiHistory}
                volumeHistory={performanceCharts.payload.volumeHistory}
                profitDistribution={performanceCharts.payload.profitDistribution}
              />
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
            {/* Tab Headers */}
            <div className="flex border-b border-white/10">
              <button
                onClick={() => setActiveTab('positions')}
                className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                  activeTab === 'positions'
                    ? 'bg-brand-green/10 text-brand-green border-b-2 border-brand-green'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Open Positions ({openTrades.length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                  activeTab === 'history'
                    ? 'bg-brand-green/10 text-brand-green border-b-2 border-brand-green'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                History
              </button>
              <button
                onClick={() => setActiveTab('copiers')}
                className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                  activeTab === 'copiers'
                    ? 'bg-brand-green/10 text-brand-green border-b-2 border-brand-green'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Copiers ({trader.activeCopiers})
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'positions' && <OpenPositionsTab trades={openTrades} />}
              {activeTab === 'history' && <HistoryTab trader={trader} />}
              {activeTab === 'copiers' && <CopiersTab count={trader.activeCopiers} />}
            </div>
          </div>
        </div>
      </div>


      {/* Copy Modal */}
      {showCopyModal && (
        <SimpleCopyModal
          traderWallet={trader.wallet}
          onClose={() => setShowCopyModal(false)}
        />
      )}

      {trader && showSharePerformanceModal && (
        <SharePerformanceModal
          isOpen={showSharePerformanceModal}
          onClose={() => setShowSharePerformanceModal(false)}
          traderData={{
            displayName: trader.wallet,
            wallet: trader.wallet,
            totalPnl: trader.totalPnl || 0,
            roi: trader.roi || 0,
            winRate: trader.winRate,
            totalTrades: trader.totalTrades,
            totalVolume: trader.totalVolume,
            isVerified: false, // Regular traders aren't verified
            verificationTier: undefined,
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
      <div className="flex items-center gap-2 text-gray-400 mb-2">
        <Icon className="w-5 h-5" />
        <span className="text-sm">{label}</span>
      </div>
      <div className={`font-mono font-bold text-3xl ${color}`}>{value}</div>
    </div>
  );
}

function OpenPositionsTab({ trades }: { trades: MockOpenTrade[] }) {
  if (trades.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No open positions</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Market</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Side</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Amount</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Entry Price</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Current P&L</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => {
            return (
              <tr key={trade.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="py-3 px-4 font-semibold">{trade.market}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    trade.direction === 'YES'
                      ? 'bg-brand-green/20 text-brand-green'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {trade.direction}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono">${trade.amount}</td>
                <td className="py-3 px-4 font-mono">{trade.entry_price.toFixed(2)}</td>
                <td className={`py-3 px-4 font-mono font-bold ${
                  trade.pnl >= 0 ? 'text-brand-green' : 'text-red-400'
                }`}>
                  {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)} ({trade.pnl_pct >= 0 ? '+' : ''}{trade.pnl_pct.toFixed(1)}%)
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function HistoryTab({ trader }: { trader: MockTrader }) {
  // TODO CURSOR C1: replace with real API call to /api/trades/history?trader={wallet}
  const mockHistory = [
    {
      id: '1',
      market: 'Real Madrid vs Barcelona',
      outcome: 'Won',
      profit: 45,
      date: Date.now() - 2 * 24 * 60 * 60 * 1000
    },
    {
      id: '2',
      market: 'Lakers vs Celtics',
      outcome: 'Lost',
      profit: -25,
      date: Date.now() - 5 * 24 * 60 * 60 * 1000
    }
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Market</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Result</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">P&L</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Date</th>
          </tr>
        </thead>
        <tbody>
          {mockHistory.map((trade) => (
            <tr key={trade.id} className="border-b border-white/5 hover:bg-white/5">
              <td className="py-3 px-4 font-semibold">{trade.market}</td>
              <td className="py-3 px-4">
                {trade.outcome === 'Won' ? (
                  <span className="flex items-center gap-1 text-brand-green">
                    <CheckCircle className="w-4 h-4" />
                    Won
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-400">
                    <XCircle className="w-4 h-4" />
                    Lost
                  </span>
                )}
              </td>
              <td className={`py-3 px-4 font-mono font-bold ${
                trade.profit > 0 ? 'text-brand-green' : 'text-red-400'
              }`}>
                {trade.profit > 0 ? '+' : ''}${trade.profit}
              </td>
              <td className="py-3 px-4 text-gray-400 text-sm">
                {new Date(trade.date).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CopiersTab({ count }: { count: number }) {
  // TODO CURSOR C1: replace with real API call to /api/copiers?trader={wallet}
  const mockCopiers = Array.from({ length: Math.min(count, 10) }, (_, i) => ({
    wallet: `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`,
    since: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
  }));

  return (
    <div>
      <p className="text-gray-400 mb-6">
        {count} {count === 1 ? 'trader is' : 'traders are'} currently copying this strategy
      </p>
      <div className="space-y-3">
        {mockCopiers.map((copier, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-4 bg-white/5 rounded-lg"
          >
            <span className="font-mono">{copier.wallet}</span>
            <span className="text-sm text-gray-500">
              Since {new Date(copier.since).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimpleCopyModal({ traderWallet, onClose }: { traderWallet: string; onClose: () => void }) {
  const [allocation, setAllocation] = useState(50);

  const handleConfirm = () => {
    // TODO CURSOR C1: replace with real API call to /api/copy/start
    toast.success(`You're now copying ${traderWallet}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-brand-bg border border-white/10 rounded-xl max-w-md w-full p-6">
        <h3 className="font-syne font-bold text-2xl mb-4">Copy {traderWallet}</h3>
        
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">Max allocation per trade</label>
          <input
            type="number"
            value={allocation}
            onChange={(e) => setAllocation(Number(e.target.value))}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-brand-green focus:outline-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-white/5 border border-white/10 font-semibold rounded-lg hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function SharePerformanceModal({
  isOpen,
  onClose,
  traderData,
}: {
  isOpen: boolean;
  onClose: () => void;
  traderData: any;
}) {
  const trpc = useTRPC();
  const [copied, setCopied] = useState(false);
  
  // Generate OG image
  const ogImageQuery = useQuery({
    ...trpc.generateTraderOGImage.queryOptions({
      walletAddress: traderData.wallet,
    }),
    enabled: isOpen,
  });

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = generateTraderPerformanceShareText(traderData);

  const handleTwitterShare = () => {
    const twitterUrl = getTwitterShareUrl(shareText, shareUrl);
    window.open(twitterUrl, '_blank', 'width=550,height=420');
    toast.success('Opening X (Twitter)...');
  };

  const handleTelegramShare = () => {
    const telegramUrl = getTelegramShareUrl(shareText, shareUrl);
    window.open(telegramUrl, '_blank', 'width=550,height=420');
    toast.success('Opening Telegram...');
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
      setCopied(true);
      toast.success('Text copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy text');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-brand-bg border border-white/10 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-syne font-bold text-2xl">Share Your Performance</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Preview Card */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-2xl">
              👤
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{traderData.displayName}</span>
              </div>
              <span className="text-sm text-gray-400">@Predictio</span>
            </div>
          </div>
          
          <div className="whitespace-pre-wrap text-sm mb-4">{shareText}</div>
          
          {ogImageQuery.data?.url && (
            <img 
              src={ogImageQuery.data.url} 
              alt="Performance preview"
              className="w-full rounded-lg border border-white/10"
            />
          )}
        </div>

        {/* Share Buttons */}
        <div className="space-y-3 mb-6">
          <button
            onClick={handleTwitterShare}
            className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-brand-green/30 transition-all group"
          >
            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <X className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold">Share on X (Twitter)</span>
          </button>

          <button
            onClick={handleTelegramShare}
            className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-brand-green/30 transition-all group"
          >
            <div className="w-10 h-10 bg-[#0088cc] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Send className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold">Share on Telegram</span>
          </button>
        </div>

        {/* Copy Text */}
        <button
          onClick={handleCopyText}
          className={`w-full px-4 py-3 rounded-lg font-semibold transition-all ${
            copied
              ? 'bg-brand-green text-brand-bg'
              : 'bg-white/5 border border-white/10 hover:bg-white/10'
          }`}
        >
          {copied ? '✓ Copied!' : 'Copy Share Text'}
        </button>
      </div>
    </div>
  );
}

