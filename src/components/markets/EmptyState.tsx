import { Search, Wallet, TrendingUp, Filter } from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface EmptyStateProps {
  type?: 'no-results' | 'no-positions' | 'no-trades' | 'no-rewards';
  onClearFilters?: () => void;
}

export function EmptyState({ type = 'no-results', onClearFilters }: EmptyStateProps) {
  const configs = {
    'no-results': {
      icon: <Search className="w-10 h-10 text-gray-600" />,
      title: 'No markets found',
      description: 'Try adjusting your filters or search for a different sport.',
      cta: onClearFilters && (
        <button
          onClick={onClearFilters}
          className="px-6 py-3 bg-transparent border-2 border-brand-green text-brand-green font-semibold rounded hover:bg-brand-green hover:text-brand-bg transition-all"
        >
          Clear Filters
        </button>
      ),
    },
    'no-positions': {
      icon: <Wallet className="w-10 h-10 text-gray-600" />,
      title: 'No positions yet',
      description: 'Your open positions will appear here. Ready to make your first trade?',
      cta: (
        <Link
          to="/markets"
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-green text-brand-bg font-semibold rounded-lg hover:bg-brand-green/90 transition-all"
        >
          Browse Markets
        </Link>
      ),
    },
    'no-trades': {
      icon: <TrendingUp className="w-10 h-10 text-gray-600" />,
      title: 'No trades yet',
      description: 'Every trade you make will be recorded here for your reference.',
      cta: null,
    },
    'no-rewards': {
      icon: <TrendingUp className="w-10 h-10 text-gray-600" />,
      title: 'No rewards earned yet',
      description: 'Provide liquidity or complete trading milestones to start earning.',
      cta: (
        <Link
          to="/glossary"
          className="text-brand-green hover:underline"
        >
          Learn how rewards work
        </Link>
      ),
    },
  };
  
  const config = configs[type];
  
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
        {config.icon}
      </div>
      <h3 className="font-syne font-semibold text-2xl mb-2">{config.title}</h3>
      <p className="text-gray-400 mb-6 max-w-md">
        {config.description}
      </p>
      {config.cta}
    </div>
  );
}
