import { Search } from 'lucide-react';

interface MarketsHeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchFocus?: () => void;
}

export function MarketsHero({ searchQuery, onSearchChange, onSearchFocus }: MarketsHeroProps) {
  return (
    <div className="relative bg-gradient-to-b from-brand-navy/80 via-brand-bg to-transparent py-12 sm:py-16 px-4 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-24 left-10 w-72 h-72 bg-brand-green/5 rounded-full blur-3xl" />
        <div className="absolute bottom-24 right-10 w-96 h-96 bg-brand-cyan/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto text-center relative z-10">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-gray-500 uppercase mb-4">
          Markets terminal
        </p>
        <h1 className="font-syne font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-4 sm:mb-5 leading-tight text-white">
          Curated{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-green/90 to-brand-cyan/80">
            multisport outlook
          </span>
        </h1>

        <p className="text-base sm:text-lg text-gray-500 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed">
          Search across multisport premium lanes, court events, motorsport, and more — same glass
          card language everywhere, built for focus over noise.
        </p>

        <div className="relative max-w-2xl mx-auto mb-6">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-brand-green/80 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={onSearchFocus}
              placeholder="Search events, leagues, or participants…"
              className="w-full pl-12 pr-4 py-3 sm:py-3.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-sm sm:text-base placeholder-gray-600 focus:outline-none focus:border-brand-green/30 focus:ring-1 focus:ring-brand-green/20 transition-all"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs text-gray-600">
          <span>Examples:</span>
          <span className="px-2.5 py-1 rounded-md border border-white/10 text-gray-500">Champions League</span>
          <span className="px-2.5 py-1 rounded-md border border-white/10 text-gray-500">Serie A</span>
          <span className="px-2.5 py-1 rounded-md border border-white/10 text-gray-500">Grand Slam</span>
          <span className="px-2.5 py-1 rounded-md border border-white/10 text-gray-500">Formula 1</span>
        </div>
      </div>
    </div>
  );
}
