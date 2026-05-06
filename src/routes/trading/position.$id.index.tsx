import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Header } from '~/components/Header';
import { Footer } from '~/components/Footer';
import { PositionDetail } from '~/components/trading/PositionDetail';
import { useTradingStore } from '~/store/tradingStore';
import { ArrowLeft } from 'lucide-react';

export const Route = createFileRoute('/trading/position/$id/')({
  component: PositionDetailPage,
});

function PositionDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const positions = useTradingStore((state) => state.positions);
  
  const position = positions.find((p) => p.id === id);

  if (!position) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <Header />
        <div className="pt-32 pb-20 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="font-syne font-bold text-4xl mb-4">Position Not Found</h1>
            <p className="text-gray-400 mb-8">
              The position you're looking for doesn't exist or has been closed.
            </p>
            <button
              onClick={() => navigate({ to: '/trading' })}
              className="px-6 py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-all"
            >
              Back to Trading
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <Header />
      <div className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate({ to: '/trading' })}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Positions</span>
          </button>

          {/* Position Detail */}
          <PositionDetail position={position} />
        </div>
      </div>
      <Footer />
    </div>
  );
}
