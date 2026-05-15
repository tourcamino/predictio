import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Header } from '~/components/Header';
import { Droplet, TrendingUp, Shield } from 'lucide-react';
import { useTRPC } from '~/trpc/react';
import { useQuery } from '@tanstack/react-query';
import { ProtocolVaultDepositModal } from '~/components/liquidity/ProtocolVaultDepositModal';
import { ProtocolVaultWithdrawModal } from '~/components/liquidity/ProtocolVaultWithdrawModal';
import { LPEarningsHistoryDashboard } from '~/components/liquidity/LPEarningsHistoryDashboard';
import { LiquidityLiveBook } from '~/components/liquidity/LiquidityLiveBook';
import { useWallet } from '~/store/useWalletStore';
import { useWalletGate } from '~/hooks/useWalletGate';
import { WalletGateModal } from '~/components/WalletGateModal';
import { normalizeWalletForQuery } from '~/utils/walletQuery';
import { fetchCuratedMarketsFromApi } from '~/utils/curatedMarketsApi';
import { mirrorLiquidityRowsFromMarkets } from '~/lib/curatedLiquidityMirror';
import type { CanonicalMarketLiquidityRow } from '~/server/services/canonicalLiquidityAllocation';
import {
  LP_SEEDED_EXPLAINER,
  LP_SEEDED_SHORT,
  getProtocolLiquidityConfigClient,
} from '~/lib/economySurface';
import {
  liquidityBottomCta,
  liquidityDepositPanel,
  liquidityFaq,
  liquidityHowItWorks,
  liquidityPageHero,
  liquidityStats,
  liquidityValueProp,
} from '~/copy/liquidityPremium';

export const Route = createFileRoute('/liquidity/')({
  component: LiquidityPage,
});

function vaultAllocationsToCanonical(
  alloc: Array<{
    marketId: string;
    marketName: string;
    league: string;
    sport: string;
    allocation: number;
    percentage: number;
    volume?: number;
    appealScore?: number;
  }>,
): CanonicalMarketLiquidityRow[] {
  return alloc
    .filter((a) => a.allocation > 0)
    .map((a) => ({
      marketId: a.marketId,
      gameId: a.marketId.replace(/^azuro-/i, ''),
      marketName: a.marketName,
      league: a.league,
      sport: a.sport,
      appealScore: a.appealScore ?? 0,
      volume: a.volume ?? 0,
      allocation: a.allocation,
      percentage: a.percentage,
      normalizedWeight: 0,
      weightSource: 'curated-appeal' as const,
    }));
}

function LiquidityPage() {
  const trpc = useTRPC();
  const { isConnected, address } = useWallet();
  const walletKey = normalizeWalletForQuery(address);
  const { requireWalletAndChain, showGateModal, closeGateModal } = useWalletGate();
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  // Fetch Protocol Vault stats
  const vaultQuery = useQuery({
    ...trpc.getProtocolVaultStats.queryOptions({}),
    staleTime: 0,
    refetchInterval: 30_000,
  });

  const vaultStats = vaultQuery.data;
  const liquidityMode = getProtocolLiquidityConfigClient();
  const isPreTestnet = liquidityMode.mode === 'PRE_TESTNET';
  const simulatedPool =
    vaultStats?.totalSimulatedLiquidity ?? liquidityMode.simulatedLiquidityUsdc;

  const curatedQuery = useQuery({
    queryKey: ['curatedMarkets', 'liquidity-sync'],
    queryFn: fetchCuratedMarketsFromApi,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const totalBudget =
    vaultStats?.totalLiquidity && vaultStats.totalLiquidity > 0
      ? vaultStats.totalLiquidity
      : simulatedPool;

  const { liquidityDisplayRows, liquidityDataSource, liquidityUpdatedAtMs } = useMemo(() => {
    const markets = curatedQuery.data?.markets ?? [];
    const mirror = mirrorLiquidityRowsFromMarkets(markets, totalBudget);
    const updated =
      Math.max(curatedQuery.dataUpdatedAt ?? 0, vaultQuery.dataUpdatedAt ?? 0) || Date.now();
    if (mirror.length > 0) {
      return {
        liquidityDisplayRows: mirror,
        liquidityDataSource: 'live-feed' as const,
        liquidityUpdatedAtMs: updated,
      };
    }
    const v = vaultStats?.marketAllocations?.filter((a) => a.allocation > 0) ?? [];
    if (v.length > 0) {
      return {
        liquidityDisplayRows: vaultAllocationsToCanonical(v),
        liquidityDataSource: 'vault' as const,
        liquidityUpdatedAtMs: updated,
      };
    }
    return {
      liquidityDisplayRows: [] as CanonicalMarketLiquidityRow[],
      liquidityDataSource: 'live-feed' as const,
      liquidityUpdatedAtMs: updated,
    };
  }, [
    curatedQuery.data?.markets,
    curatedQuery.dataUpdatedAt,
    vaultQuery.dataUpdatedAt,
    vaultStats?.marketAllocations,
    totalBudget,
  ]);

  // Fetch user's Protocol Vault position
  const userPositionQuery = useQuery({
    ...trpc.getProtocolVaultPosition.queryOptions({
      walletAddress: walletKey,
    }),
    enabled: !!walletKey && isConnected,
  });

  const handleDepositSuccess = () => {
    vaultQuery.refetch();
    curatedQuery.refetch();
    if (isConnected) {
      userPositionQuery.refetch();
    }
  };

  const handleWithdrawSuccess = () => {
    vaultQuery.refetch();
    curatedQuery.refetch();
    if (isConnected) {
      userPositionQuery.refetch();
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg">
      <Header />
      
      <div className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="font-syne font-bold text-5xl mb-4">
              {isPreTestnet ? liquidityPageHero.preTestnetTitle : liquidityPageHero.liveTitle}
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-snug">
              {isPreTestnet ? liquidityPageHero.preTestnetSub : liquidityPageHero.liveSub}
            </p>
            <p className="mt-4 max-w-2xl mx-auto text-xs text-gray-500 leading-relaxed border border-emerald-500/20 rounded-lg px-4 py-3 bg-emerald-500/[0.04]">
              {isPreTestnet ? (
                <span className="text-gray-300">{liquidityPageHero.microPre}</span>
              ) : (
                LP_SEEDED_EXPLAINER
              )}
            </p>
          </div>

          {/* Vault Stats Card */}
          <div className="mb-8 p-8 bg-white/5 border border-white/10 rounded-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
              {/* Total Liquidity */}
              <div>
                <div className="text-sm text-gray-400 mb-2">
                  {isPreTestnet ? liquidityStats.poolLabelPractice : liquidityStats.poolLabelLive}
                </div>
                <div className="font-mono font-bold text-4xl text-brand-green mb-1">
                  {isPreTestnet
                    ? `${simulatedPool.toLocaleString()} USDC`
                    : `$${(vaultStats?.totalLiquidity ?? simulatedPool).toLocaleString()}`}
                </div>
                <div className="text-sm text-gray-500">
                  {isPreTestnet ? liquidityStats.poolHintPractice : LP_SEEDED_SHORT}
                </div>
              </div>

              {/* Vault APY */}
              <div>
                <div className="text-sm text-gray-400 mb-2">
                  {isPreTestnet ? liquidityStats.apyPracticeTitle : liquidityStats.apyWhenLive}
                </div>
                {isPreTestnet ? (
                  <>
                    <div className="font-mono font-bold text-4xl text-gray-500">—</div>
                    <div className="text-sm text-gray-500">{liquidityStats.apyPracticeBody}</div>
                  </>
                ) : vaultStats && vaultStats.vaultAPY !== null ? (
                  <>
                    <div className="font-mono font-bold text-4xl text-brand-green">
                      {vaultStats.vaultAPY.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-500">Last 30 days</div>
                  </>
                ) : (
                  <>
                    <div className="font-mono font-bold text-4xl text-gray-500">
                      —
                    </div>
                    <div className="text-sm text-gray-500">Calculating...</div>
                  </>
                )}
              </div>

              {/* Markets Active */}
              <div>
                <div className="text-sm text-gray-400 mb-2">{liquidityStats.marketsOpen}</div>
                <div className="font-mono font-bold text-4xl">
                  {liquidityDisplayRows.length > 0
                    ? liquidityDisplayRows.length
                    : vaultStats?.marketsActive || 0}
                </div>
                <div className="text-sm text-gray-500">{liquidityStats.marketsOpenHint}</div>
              </div>
            </div>

            {/* Add Liquidity Button */}
            <div className="mb-6">
              <button
                type="button"
                onClick={() => {
                  if (!requireWalletAndChain()) return;
                  setIsDepositModalOpen(true);
                }}
                className="w-full py-4 bg-gradient-to-r from-brand-green to-brand-cyan text-brand-bg font-bold text-lg rounded-lg hover:opacity-90 transition-all shadow-xl shadow-brand-green/20 flex items-center justify-center gap-2"
              >
                <Droplet className="w-5 h-5" />
                {liquidityDepositPanel.cta}
              </button>
            </div>

            {/* Phase 1 Active Banner */}
            {vaultStats && vaultStats.externalLPs > 0 && (
              <div className="mb-8 p-4 bg-brand-green/10 border border-brand-green/30 rounded-lg flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-brand-green flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-brand-green font-semibold mb-1">External LPs on the book</p>
                  <p className="text-sm text-gray-300">
                    {vaultStats.externalLPs} provider{vaultStats.externalLPs !== 1 ? 's' : ''} · $
                    {vaultStats.externalLPTotal.toFixed(2)} USDC live in vault
                  </p>
                </div>
              </div>
            )}

            {/* Info Banner for New LPs */}
            <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-start gap-3 mb-4">
                <Droplet className="w-6 h-6 text-brand-cyan flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">{liquidityDepositPanel.title}</h3>
                  <p className="text-gray-400 text-sm">{liquidityDepositPanel.body}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {liquidityDepositPanel.bullets.map((b) => (
                  <div key={b} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-brand-green" />
                    <span className="text-gray-300">{b}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trust & Security Badges */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg flex items-center gap-3">
              <div className="w-12 h-12 bg-brand-green/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-brand-green" />
              </div>
              <div>
                <div className="font-semibold text-sm">Audited Smart Contracts</div>
                <div className="text-xs text-gray-400">Sigma Prime & Chainsafe</div>
              </div>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg flex items-center gap-3">
              <div className="w-12 h-12 bg-brand-cyan/20 rounded-full flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-brand-cyan" />
              </div>
              <div>
                <div className="font-semibold text-sm">Proven Returns</div>
                <div className="text-xs text-gray-400">
                  {vaultStats?.vaultAPY ? `${vaultStats.vaultAPY.toFixed(1)}% APY` : 'Calculating APY...'}
                </div>
              </div>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-400/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Droplet className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <div className="font-semibold text-sm">Instant Withdrawals</div>
                <div className="text-xs text-gray-400">No lock-up period</div>
              </div>
            </div>
          </div>

          {/* Value Proposition */}
          <div className="mb-8 p-8 bg-gradient-to-br from-brand-green/10 to-brand-cyan/10 border-2 border-brand-green/30 rounded-xl">
            <div className="text-center mb-6">
              <h2 className="font-syne font-bold text-3xl mb-3">{liquidityValueProp.title}</h2>
              <p className="text-gray-200 text-lg max-w-2xl mx-auto">{liquidityValueProp.sub}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {liquidityValueProp.cards.map((card, i) => {
                const Icon = i % 4 === 0 ? TrendingUp : i % 4 === 1 ? Droplet : i % 4 === 2 ? Shield : TrendingUp;
                const hue =
                  i % 4 === 0
                    ? 'bg-brand-green/20 text-brand-green'
                    : i % 4 === 1
                      ? 'bg-brand-cyan/20 text-brand-cyan'
                      : i % 4 === 2
                        ? 'bg-purple-400/20 text-purple-400'
                        : 'bg-amber-400/20 text-amber-300';
                return (
                  <div key={card.title} className="p-6 bg-white/5 rounded-lg ring-1 ring-white/[0.06]">
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${hue}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{card.title}</h3>
                        <p className="text-sm text-gray-400 leading-relaxed">{card.body}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  if (!requireWalletAndChain()) return;
                  setIsDepositModalOpen(true);
                }}
                className="px-8 py-4 bg-brand-green text-brand-bg font-bold text-lg rounded-lg hover:opacity-90 transition-all shadow-xl shadow-brand-green/20"
              >
                {liquidityDepositPanel.cta} →
              </button>
            </div>
          </div>

          {/* User's Protocol Vault Position */}
          {isConnected && userPositionQuery.data && (
            <div className="mb-8 p-6 bg-gradient-to-br from-brand-green/10 to-brand-cyan/10 border border-brand-green/30 rounded-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-syne font-bold text-xl mb-1">Your Protocol Vault Position</h3>
                  <p className="text-sm text-gray-400">Earning fees across all markets</p>
                </div>
                <button
                  onClick={() => setIsWithdrawModalOpen(true)}
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition-colors font-semibold text-sm"
                >
                  Withdraw
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-white/10 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Deposited</div>
                  <div className="font-mono font-bold text-lg">${userPositionQuery.data.deposited.toFixed(2)}</div>
                </div>
                <div className="p-4 bg-white/10 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Current Value</div>
                  <div className="font-mono font-bold text-lg">${userPositionQuery.data.currentValue.toFixed(2)}</div>
                  <div className={`text-xs mt-1 ${userPositionQuery.data.pnl >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
                    {userPositionQuery.data.pnl >= 0 ? '+' : ''}${userPositionQuery.data.pnl.toFixed(2)} ({userPositionQuery.data.pnl >= 0 ? '+' : ''}{userPositionQuery.data.pnlPct.toFixed(1)}%)
                  </div>
                </div>
                <div className="p-4 bg-white/10 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Fees Earned</div>
                  <div className="font-mono font-bold text-lg text-brand-green">${userPositionQuery.data.feesEarned.toFixed(2)}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    ${userPositionQuery.data.feesPending.toFixed(2)} pending
                  </div>
                </div>
                <div className="p-4 bg-white/10 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Your APY</div>
                  <div className="font-mono font-bold text-lg text-brand-cyan">{userPositionQuery.data.apy.toFixed(1)}%</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {((userPositionQuery.data.poolShare || 0) * 100).toFixed(3)}% of vault
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-400">
                Position open since {new Date(userPositionQuery.data.openSince).toLocaleDateString()}
              </div>
            </div>
          )}

          {/* LP Earnings History Dashboard */}
          {isConnected && address && (
            <div className="mb-12">
              <LPEarningsHistoryDashboard walletAddress={address} />
            </div>
          )}

          {/* Estimated Returns Table — testnet only (no fake APY in pre-testnet) */}
          {!isPreTestnet && (
          <div className="mb-12">
            <h2 className="font-syne font-bold text-3xl mb-6 text-center">Estimated Returns</h2>
            <p className="text-center text-gray-400 mb-8">
              Based on 50% of trading fees going to liquidity providers
            </p>
            
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5 border-b border-white/10">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Vault TVL</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Daily Volume</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Vault Fees (50%)</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Monthly</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Annual APY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    <tr className="hover:bg-white/5">
                      <td className="px-6 py-4 font-mono">$10,000</td>
                      <td className="px-6 py-4 font-mono">$10,000</td>
                      <td className="px-6 py-4 font-mono text-brand-green">$50/day</td>
                      <td className="px-6 py-4 font-mono text-brand-green">~$1,500</td>
                      <td className="px-6 py-4 font-mono font-bold text-brand-cyan">180%</td>
                    </tr>
                    <tr className="hover:bg-white/5">
                      <td className="px-6 py-4 font-mono">$50,000</td>
                      <td className="px-6 py-4 font-mono">$50,000</td>
                      <td className="px-6 py-4 font-mono text-brand-green">$250/day</td>
                      <td className="px-6 py-4 font-mono text-brand-green">~$7,500</td>
                      <td className="px-6 py-4 font-mono font-bold text-brand-cyan">180%</td>
                    </tr>
                    <tr className="hover:bg-white/5">
                      <td className="px-6 py-4 font-mono">$100,000</td>
                      <td className="px-6 py-4 font-mono">$200,000</td>
                      <td className="px-6 py-4 font-mono text-brand-green">$1,000/day</td>
                      <td className="px-6 py-4 font-mono text-brand-green">~$30,000</td>
                      <td className="px-6 py-4 font-mono font-bold text-brand-cyan">360%</td>
                    </tr>
                    <tr className="hover:bg-white/5">
                      <td className="px-6 py-4 font-mono">$500,000</td>
                      <td className="px-6 py-4 font-mono">$1,000,000</td>
                      <td className="px-6 py-4 font-mono text-brand-green">$5,000/day</td>
                      <td className="px-6 py-4 font-mono text-brand-green">~$150,000</td>
                      <td className="px-6 py-4 font-mono font-bold text-brand-cyan">360%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="px-6 py-4 bg-white/5 border-t border-white/10 text-xs text-gray-500">
                Formula: Daily Volume × 1% fee × 50% LP share = Daily vault fees. 
                APY calculated as (Monthly fees × 12) / TVL × 100.
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-gray-300 leading-relaxed">
                <span className="font-semibold text-yellow-500">Disclaimer:</span> Returns are variable and depend entirely on real trading volume. No returns are guaranteed. Liquidity provision involves risk including smart contract risk and potential loss of funds. This is not financial advice.
              </p>
            </div>
          </div>
          )}

          {/* Live allocation — synced with homepage book when feed is live */}
          <div className="mb-12">
            <h2 className="font-syne font-bold text-3xl mb-1">Where the pool is leaning right now</h2>
            <p className="text-sm text-gray-400 mb-6 max-w-3xl">
              Capital weights track the same OPEN markets you can trade — updates as the book changes. Hotter lines pull more
              size automatically.
            </p>
            {isPreTestnet && vaultStats?.allocationCoherent === false && (
              <p className="text-xs text-amber-400/90 mb-4">
                Still syncing vault math with the board — refresh in a moment.
              </p>
            )}
            <LiquidityLiveBook
              rows={liquidityDisplayRows}
              isPreTestnet={isPreTestnet}
              dataSource={liquidityDataSource}
              updatedAtMs={liquidityUpdatedAtMs}
            />
          </div>

          {/* How It Works Section */}
          <div className="mb-12">
            <h2 className="font-syne font-bold text-3xl mb-6">{liquidityHowItWorks.title}</h2>
            <div className="bg-white/5 border border-white/10 rounded-xl p-8 space-y-6">
              {liquidityHowItWorks.steps.map((step, idx) => {
                const accent =
                  idx === 0
                    ? 'bg-brand-green/20 text-brand-green'
                    : idx === 1
                      ? 'bg-brand-cyan/20 text-brand-cyan'
                      : 'bg-purple-400/20 text-purple-400';
                return (
                  <div key={step.title} className="flex gap-4">
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${accent}`}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                      <p className="text-gray-400">{step.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mb-12">
            <h2 className="font-syne font-bold text-3xl mb-6 text-center">{liquidityFaq.title}</h2>
            <div className="space-y-4 max-w-3xl mx-auto">
              <details className="p-6 bg-white/5 border border-white/10 rounded-lg group">
                <summary className="font-semibold cursor-pointer list-none flex items-center justify-between">
                  <span>How do I earn fees as a liquidity provider?</span>
                  <span className="transform group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-4 text-gray-400 text-sm leading-relaxed">
                  When traders place bets on prediction markets, they pay a 1% taker fee. 50% of these fees are distributed proportionally to all liquidity providers based on their share of the vault. The more liquidity you provide, the larger your share of fees. The other 50% is split between analysts (35%) and referrals (15%).
                </p>
              </details>

              <details className="p-6 bg-white/5 border border-white/10 rounded-lg group">
                <summary className="font-semibold cursor-pointer list-none flex items-center justify-between">
                  <span>What are the risks?</span>
                  <span className="transform group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-4 text-gray-400 text-sm leading-relaxed">
                  As a liquidity provider, you're essentially taking the opposite side of traders' positions. If traders win more than they lose, your liquidity may decrease. However, the protocol's fee structure and algorithm are designed to ensure long-term profitability for LPs. The vault diversifies across multiple markets to minimize risk.
                </p>
              </details>

              <details className="p-6 bg-white/5 border border-white/10 rounded-lg group">
                <summary className="font-semibold cursor-pointer list-none flex items-center justify-between">
                  <span>Can I withdraw my liquidity anytime?</span>
                  <span className="transform group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-4 text-gray-400 text-sm leading-relaxed">
                  Yes! There are no lock-up periods. You can withdraw your liquidity at any time. Your share of accumulated fees will be included in your withdrawal. Note that your liquidity might be actively deployed in open markets, so the exact amount you receive depends on current market conditions.
                </p>
              </details>

              <details className="p-6 bg-white/5 border border-white/10 rounded-lg group">
                <summary className="font-semibold cursor-pointer list-none flex items-center justify-between">
                  <span>How is the APY calculated?</span>
                  <span className="transform group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-4 text-gray-400 text-sm leading-relaxed">
                  APY is calculated based on the total fees earned by the vault over the past 30 days, extrapolated to an annual rate. It's a trailing indicator and actual future returns may vary based on trading volume and market conditions. Historical APY does not guarantee future performance.
                </p>
              </details>

              <details className="p-6 bg-white/5 border border-white/10 rounded-lg group">
                <summary className="font-semibold cursor-pointer list-none flex items-center justify-between">
                  <span>What's the minimum deposit?</span>
                  <span className="transform group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-4 text-gray-400 text-sm leading-relaxed">
                  The minimum deposit is $10 USDC. There is no maximum limit. Larger deposits earn a proportionally larger share of fees, but all LPs earn the same APY regardless of deposit size.
                </p>
              </details>
            </div>
          </div>

          {/* Browse Markets CTA */}
          <div className="p-8 bg-gradient-to-br from-brand-green/10 to-brand-cyan/10 border border-brand-green/30 rounded-xl text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-brand-green" />
            <h3 className="font-syne font-bold text-2xl mb-3">{liquidityBottomCta.title}</h3>
            <p className="text-gray-400 mb-6 max-w-2xl mx-auto">{liquidityBottomCta.sub}</p>
            <a
              href="/markets"
              className="inline-block px-8 py-4 bg-brand-green text-brand-bg font-bold text-lg rounded-lg hover:bg-brand-green/90 transition-all shadow-xl shadow-brand-green/20"
            >
              {liquidityBottomCta.button} →
            </a>
          </div>
        </div>
      </div>

      {/* Protocol Vault Deposit Modal */}
      <ProtocolVaultDepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        vaultStats={vaultStats}
        onSuccess={handleDepositSuccess}
      />

      {/* Protocol Vault Withdraw Modal */}
      {isConnected && userPositionQuery.data && (
        <ProtocolVaultWithdrawModal
          isOpen={isWithdrawModalOpen}
          onClose={() => setIsWithdrawModalOpen(false)}
          position={userPositionQuery.data}
          onSuccess={handleWithdrawSuccess}
        />
      )}


      <WalletGateModal isOpen={showGateModal} onClose={closeGateModal} />
    </div>
  );
}

