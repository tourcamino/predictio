interface MarketsHeaderProps {
  searchQuery?: string;
}

export function MarketsHeader({ searchQuery }: MarketsHeaderProps) {
  return (
    <div className="pt-24 pb-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <a href="/" className="hover:text-brand-green transition-colors">
            Home
          </a>
          <span>/</span>
          <span className="text-gray-300">Markets</span>
        </div>

        {/* Title with Live Badge */}
        <div className="flex items-center gap-4 mb-4">
          <h1 className="font-syne font-bold text-4xl sm:text-5xl lg:text-6xl">
            {searchQuery ? (
              <>
                Search Results
              </>
            ) : (
              'Live Markets'
            )}
          </h1>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-green/10 border border-brand-green/30 rounded-full">
            <div className="w-2 h-2 bg-brand-green rounded-full animate-pulse"></div>
            <span className="text-xs font-semibold text-brand-green">LIVE</span>
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-lg text-gray-400 mb-6 max-w-3xl">
          {searchQuery ? (
            <>
              Showing markets matching <span className="text-brand-green font-semibold">"{searchQuery}"</span>
            </>
          ) : (
            'Real-time prediction markets on every sport, every league, every continent.'
          )}
        </p>

        {/* Stats Bar */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 font-mono text-xs sm:text-sm text-gray-400">
          <span className="text-brand-cyan">847 Active Markets</span>
          <span className="hidden sm:block w-1 h-1 bg-gray-600 rounded-full"></span>
          <span className="text-brand-cyan">$4.2M Total Volume</span>
          <span className="hidden sm:block w-1 h-1 bg-gray-600 rounded-full"></span>
          <span className="text-brand-cyan">12,847 Predictions Today</span>
          <span className="hidden sm:block w-1 h-1 bg-gray-600 rounded-full"></span>
          <span className="text-gray-500">Resolves in real-time</span>
        </div>
      </div>
    </div>
  );
}
