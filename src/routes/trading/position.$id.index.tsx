import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Header } from '~/components/Header';
import { PositionDetail } from '~/components/trading/PositionDetail';
import { useWallet } from '~/store/useWalletStore';
import { useDemoAccount } from '~/hooks/useDemoAccount';
import { ArrowLeft } from 'lucide-react';
import { useMemo } from 'react';
import { useTRPC } from '~/trpc/react';
import { useQuery } from '@tanstack/react-query';
import { normalizeWalletForQuery, clientChainScopeForTrpc } from '~/utils/walletQuery';
import {
  mapDbOrderToTradingPosition,
  mapDemoPositionToTradingPosition,
} from '~/lib/trading/mapDbOrderToTradingPosition';

export const Route = createFileRoute('/trading/position/$id/')({
  component: PositionDetailPage,
});

function PositionDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { isConnected, address, chainId } = useWallet();
  const { positions: demoPositions } = useDemoAccount();
  const trpc = useTRPC();
  const walletKey = normalizeWalletForQuery(address);
  const chainScope = clientChainScopeForTrpc(chainId);

  const isDemoId = id.startsWith('demo-');
  const demoIndex = isDemoId ? Number.parseInt(id.slice('demo-'.length), 10) : NaN;

  const demoPosition = useMemo(() => {
    if (!isDemoId || !Number.isFinite(demoIndex) || demoIndex < 0 || demoIndex >= demoPositions.length) {
      return null;
    }
    return mapDemoPositionToTradingPosition(demoPositions[demoIndex]!, demoIndex);
  }, [isDemoId, demoIndex, demoPositions]);

  const positionsQuery = useQuery({
    ...trpc.getUserPositions.queryOptions({
      walletAddress: walletKey ?? '',
      status: 'all',
      clientChainId: chainScope,
    }),
    enabled: !!walletKey && isConnected && !isDemoId,
  });

  const orderRow = useMemo(
    () => positionsQuery.data?.positions.find((o) => o.id === id) ?? null,
    [positionsQuery.data?.positions, id],
  );

  const marketSummariesQuery = useQuery({
    ...trpc.getMarketSummaries.queryOptions({
      marketIds: orderRow ? [orderRow.marketId] : [],
    }),
    enabled: !!walletKey && isConnected && !isDemoId && !!orderRow,
    staleTime: 30_000,
  });

  const livePosition = useMemo(() => {
    if (!orderRow) return null;
    return mapDbOrderToTradingPosition(orderRow, marketSummariesQuery.data?.[orderRow.marketId] ?? null);
  }, [orderRow, marketSummariesQuery.data]);

  const position = isDemoId ? demoPosition : isConnected ? livePosition : null;

  const loading = isConnected && !isDemoId && !!walletKey && positionsQuery.isLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <Header />
        <div className="pt-32 pb-20 px-4 flex justify-center">
          <p className="text-gray-400">Loading position…</p>
        </div>
      </div>
    );
  }

  if (!position) {
    const hint =
      !isDemoId && !isConnected
        ? 'Connect your wallet to view this position, or open it from the Trading page while signed in.'
        : "The position you're looking for doesn't exist or has been closed.";

    return (
      <div className="min-h-screen bg-brand-bg">
        <Header />
        <div className="pt-32 pb-20 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="font-syne font-bold text-4xl mb-4">Position Not Found</h1>
            <p className="text-gray-400 mb-8">{hint}</p>
            <button
              onClick={() => navigate({ to: '/trading' })}
              className="px-6 py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-all"
            >
              Back to Trading
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <Header />
      <div className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate({ to: '/trading' })}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Positions</span>
          </button>

          <PositionDetail position={position} />
        </div>
      </div>
    </div>
  );
}
