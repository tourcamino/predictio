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
import { TradingModalShell } from "~/components/ui/TradingModalShell";
import {
  formatRoiPct,
  formatWinRatePct,
  shortenWallet,
} from "~/utils/formatCopyTrading";
import { mockAnalysts, getCopySeedPredictionHistoryRows } from "~/data/mockAffiliates";
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

  const seedAnalystProfile = mockAnalysts.find(
    (a) => a.wallet.toLowerCase() === walletNormalized,
  );

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
          <div className="mb-8 flex flex-col gap-6 rounded-lg border border-white/10 bg-white/5 p-6 md:flex-row md:items-start md:justify-between">
              {/* Trader Info */}
              <div className="min-w-0 flex-1">
                <h1 className="mb-1 font-syne text-2xl font-bold text-white md:text-3xl">
                  {seedAnalystProfile?.displayName ?? shortenWallet(trader.wallet, 8, 6)}
                </h1>
                <p
                  className="mb-2 font-mono text-xs text-gray-400 sm:text-sm"
                  title={trader.wallet}
                >
                  {shortenWallet(trader.wallet, 12, 8)}
                </p>
                <p className="text-sm text-gray-400">
                  Member since{" "}
                  {new Date(trader.memberSince).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex w-full flex-shrink-0 flex-wrap gap-2 md:w-auto md:justify-end">
                <button
                  onClick={handleCopyClick}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-brand-green px-4 py-2.5 text-sm font-bold text-brand-bg transition-colors hover:bg-brand-green/90 sm:flex-initial sm:px-8 sm:py-3 sm:text-base"
                >
                  <Copy className="h-4 w-4 shrink-0" />
                  Copy This Trader
                </button>
                <button
                  onClick={() => setShowSharePerformanceModal(true)}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg border border-brand-green bg-brand-green/20 px-4 py-2.5 text-sm font-bold text-brand-green transition-colors hover:bg-brand-green/30 sm:flex-initial sm:px-6 sm:py-3 sm:text-base"
                >
                  <Share2 className="h-4 w-4 shrink-0" />
                  Share Stats
                </button>
                <button
                  onClick={handleShare}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 sm:h-[52px] sm:w-[52px]"
                  aria-label="Copy link"
                >
                  {copiedLink ? <CheckCircle className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
                </button>
              </div>
          </div>

          {/* Stats Grid */}
          <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <StatCard
              icon={TrendingUp}
              label="Win Rate"
              value={formatWinRatePct(trader.winRate)}
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
              {activeTab === 'history' && (
                <HistoryTab
                  walletLookup={walletNormalized}
                  seedSports={seedAnalystProfile?.sport}
                />
              )}
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
            displayName: seedAnalystProfile?.displayName ?? shortenWallet(trader.wallet, 6, 4),
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
    <div className="min-w-0 rounded-lg border border-white/10 bg-white/5 p-4 sm:p-6">
      <div className="mb-2 flex items-center gap-2 text-gray-400">
        <Icon className="h-5 w-5 shrink-0" />
        <span className="truncate text-sm">{label}</span>
      </div>
      <div className={`font-mono font-bold ${color} text-2xl tabular-nums sm:text-3xl`}>
        {value}
      </div>
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

function HistoryTab({
  walletLookup,
  seedSports,
}: {
  walletLookup: string;
  seedSports?: string[];
}) {
  const seedRows = getCopySeedPredictionHistoryRows(
    walletLookup,
    seedSports?.[0] ?? "Football",
  );

  const rows =
    seedRows.length > 0
      ? seedRows.map((r) => ({
          id: r.id,
          market: r.event,
          outcome: r.outcome,
          profit: r.profit,
          date: r.timestamp,
          sport: r.sport,
        }))
      : [
          {
            id: "1",
            market: "Real Madrid vs Barcelona",
            outcome: "Won" as const,
            profit: 45,
            date: Date.now() - 2 * 24 * 60 * 60 * 1000,
            sport: "Football",
          },
          {
            id: "2",
            market: "Bayern Munich vs Borussia Dortmund",
            outcome: "Lost" as const,
            profit: -25,
            date: Date.now() - 5 * 24 * 60 * 60 * 1000,
            sport: "Football",
          },
        ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px]">
        <thead>
          <tr className="border-b border-white/10">
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Market</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Sport</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Result</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">P&L</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((trade) => (
            <tr key={trade.id} className="border-b border-white/5 hover:bg-white/5">
              <td className="max-w-[220px] truncate px-4 py-3 font-semibold" title={trade.market}>
                {trade.market}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-400">{trade.sport}</td>
              <td className="px-4 py-3">
                {trade.outcome === "Won" ? (
                  <span className="flex items-center gap-1 text-brand-green">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    Won
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-400">
                    <XCircle className="h-4 w-4 shrink-0" />
                    Lost
                  </span>
                )}
              </td>
              <td
                className={`px-4 py-3 font-mono text-sm font-bold ${
                  trade.profit > 0 ? "text-brand-green" : "text-red-400"
                }`}
              >
                {trade.profit > 0 ? "+" : ""}${Math.round(trade.profit)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-400">
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
    wallet: shortenWallet(
      `0x${((i + 1) * 1103515245).toString(16).padStart(36, "0").slice(0, 40)}`,
      6,
      4,
    ),
    since: Date.now() - ((i * 3 + 1) % 28) * 24 * 60 * 60 * 1000,
  }));

  return (
    <div>
      <p className="mb-6 text-gray-400">
        {count} {count === 1 ? "trader is" : "traders are"} currently copying this strategy
      </p>
      <div className="space-y-3">
        {mockCopiers.map((copier, index) => (
          <div
            key={index}
            className="flex flex-col gap-1 rounded-lg bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="truncate font-mono text-sm" title={copier.wallet}>
              {copier.wallet}
            </span>
            <span className="shrink-0 text-sm text-gray-500">
              Since{" "}
              {new Date(copier.since).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}
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
    toast.success(`You're now copying ${shortenWallet(traderWallet, 6, 4)}`);
    onClose();
  };

  return (
    <TradingModalShell
      isOpen
      onClose={onClose}
      title="Copy this trader"
      description={`Wallet ${shortenWallet(traderWallet, 8, 6)} · max USDC per mirrored trade`}
    >
      <div className="mb-6">
        <label className="mb-2 block text-sm font-semibold">Max allocation per trade</label>
        <input
          type="number"
          value={allocation}
          onChange={(e) => setAllocation(Number(e.target.value))}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-mono focus:border-brand-green focus:outline-none"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 py-3 font-semibold transition-colors hover:bg-white/10"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="flex-1 rounded-lg bg-brand-green py-3 font-bold text-brand-bg transition-colors hover:bg-brand-green/90"
        >
          Confirm
        </button>
      </div>
    </TradingModalShell>
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

  return (
    <TradingModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Share performance"
      description="Preview and share this trader card."
      size="lg"
    >
        <div className="mb-6 rounded-lg border border-white/10 bg-white/5 p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-2xl">
              👤
            </div>
            <div className="min-w-0">
              <div className="truncate font-bold">{traderData.displayName}</div>
              <span className="text-sm text-gray-400">@Predictio</span>
            </div>
          </div>

          <div className="mb-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-200">
            {shareText}
          </div>

          {ogImageQuery.data?.url && (
            <img
              src={ogImageQuery.data.url}
              alt="Performance preview"
              className="max-h-48 w-full rounded-lg border border-white/10 object-contain sm:max-h-56"
            />
          )}
        </div>

        <div className="mb-4 space-y-2">
          <button
            type="button"
            onClick={handleTwitterShare}
            className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 transition-all hover:border-brand-green/30 hover:bg-white/10"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black">
              <X className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold">Share on X</span>
          </button>

          <button
            type="button"
            onClick={handleTelegramShare}
            className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 transition-all hover:border-brand-green/30 hover:bg-white/10"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0088cc]">
              <Send className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold">Share on Telegram</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleCopyText}
          className={`w-full rounded-lg px-4 py-3 font-semibold transition-all ${
            copied
              ? "bg-brand-green text-brand-bg"
              : "border border-white/10 bg-white/5 hover:bg-white/10"
          }`}
        >
          {copied ? "Copied" : "Copy share text"}
        </button>
    </TradingModalShell>
  );
}

