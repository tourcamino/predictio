import { ChevronLeft, ChevronRight, Flame, TrendingUp } from 'lucide-react';
import { useRef } from 'react';
import { Market } from '~/data/mockMarkets';
import { TrendingMarketCard } from './TrendingMarketCard';

interface FeaturedCarouselProps {
  markets: Market[];
  onMarketClick: (marketId: string) => void;
}

export function FeaturedCarousel({ markets, onMarketClick }: FeaturedCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;

    const scrollAmount = 500;
    const newScrollLeft =
      scrollContainerRef.current.scrollLeft +
      (direction === 'left' ? -scrollAmount : scrollAmount);

    scrollContainerRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth',
    });
  };

  if (markets.length === 0) return null;

  // Calculate total volume of trending markets
  const totalVolume = markets.reduce((sum, m) => sum + m.volume, 0);
  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`;
    }
    return `$${(volume / 1000).toFixed(0)}K`;
  };

  return (
    <section className="mb-16">
      {/* Header with Stats */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <Flame className="w-8 h-8 text-orange-500 fill-orange-500" />
              <div className="absolute inset-0 blur-lg bg-orange-500/30"></div>
            </div>
            <h2 className="font-syne font-bold text-3xl sm:text-4xl bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent">
              Trending Markets
            </h2>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-cyan" />
              <span className="text-gray-400">
                Total Volume:{' '}
                <span className="font-mono text-brand-cyan font-semibold">
                  {formatVolume(totalVolume)}
                </span>
              </span>
            </div>
            <span className="text-gray-600">•</span>
            <span className="text-gray-400">
              <span className="font-mono text-white font-semibold">{markets.length}</span> hot markets
            </span>
          </div>
        </div>

        {/* Desktop Navigation Arrows */}
        <div className="hidden lg:flex gap-2">
          <button
            onClick={() => scroll('left')}
            className="p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-brand-green transition-all group"
          >
            <ChevronLeft className="w-5 h-5 group-hover:text-brand-green transition-colors" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-brand-green transition-all group"
          >
            <ChevronRight className="w-5 h-5 group-hover:text-brand-green transition-colors" />
          </button>
        </div>
      </div>

      {/* Scrollable Container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth pb-4 pt-3"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {markets.map((market) => (
          <div
            key={market.id}
            className="flex-none w-full sm:w-[calc(50%-12px)] lg:w-[calc(50%-12px)] snap-start"
          >
            <TrendingMarketCard market={market} onClick={() => onMarketClick(market.id)} />
          </div>
        ))}
      </div>

      {/* Mobile scroll indicator */}
      <div className="flex justify-center gap-2 mt-6 lg:hidden">
        {markets.slice(0, 5).map((_, index) => (
          <div
            key={index}
            className="w-2 h-2 rounded-full bg-white/20"
          />
        ))}
      </div>
    </section>
  );
}
