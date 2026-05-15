import { Search } from 'lucide-react';

interface MarketsHeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchFocus?: () => void;
}

export function MarketsHero({ searchQuery, onSearchChange, onSearchFocus }: MarketsHeroProps) {
  return (
    <div className="relative bg-brand-bg py-14 sm:py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="font-syne font-light text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-10 sm:mb-12 leading-tight text-white tracking-tight">
          Markets
        </h1>

        <div className="relative max-w-xl mx-auto">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-gray-400 transition-colors duration-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={onSearchFocus}
              placeholder="Search"
              className="w-full pl-11 pr-4 py-3.5 bg-white/[0.03] border border-white/[0.06] rounded-2xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-white/10 transition-all duration-500 ease-out"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
