import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import { SeedMarket } from '~/data/seedMarkets';
import { MarketCardCompact } from './MarketCardCompact';

interface MarketSectionProps {
  title: string;
  subtitle?: string;
  icon?: string;
  markets: SeedMarket[];
  onMarketClick: (marketId: string) => void;
  onViewAll?: () => void;
}

export function MarketSection({
  title,
  subtitle,
  icon,
  markets,
  onMarketClick,
  onViewAll,
}: MarketSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    
    const scrollAmount = 400;
    const newScrollLeft =
      direction === 'left'
        ? scrollContainerRef.current.scrollLeft - scrollAmount
        : scrollContainerRef.current.scrollLeft + scrollAmount;
    
    scrollContainerRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth',
    });
  };

  if (markets.length === 0) return null;

  return (
    <div className="mb-12">
      {/* Section Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-syne text-2xl sm:text-3xl font-bold flex items-center gap-2">
            {icon && <span className="text-3xl">{icon}</span>}
            {title}
          </h2>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-sm font-semibold text-brand-green hover:text-brand-green/80 transition-colors flex items-center gap-1"
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
        {subtitle && (
          <p className="text-gray-400 text-sm sm:text-base">{subtitle}</p>
        )}
      </div>

      {/* Carousel Container */}
      <div className="relative group">
        {/* Navigation Buttons */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 bg-brand-bg border-2 border-brand-green rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-brand-green hover:text-brand-bg shadow-lg"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 bg-brand-bg border-2 border-brand-green rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-brand-green hover:text-brand-bg shadow-lg"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Scrollable Content */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto scrollbar-hide -mx-4 px-4"
        >
          <div className="flex gap-4 sm:gap-6 pb-4">
            {markets.map((market) => (
              <div key={market.id} className="flex-shrink-0 w-[280px] sm:w-[320px]">
                <MarketCardCompact
                  market={market}
                  onClick={() => onMarketClick(market.id)}
                  variant="card"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Peek Gradient (shows there's more content) */}
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-brand-bg to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
