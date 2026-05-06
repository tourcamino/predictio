export function MarketCardSkeleton() {
  return (
    <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 rounded-2xl p-6 h-full flex flex-col animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="h-7 w-24 bg-white/10 rounded-lg" />
        <div className="h-6 w-16 bg-white/10 rounded-lg" />
      </div>

      {/* League */}
      <div className="h-4 w-32 bg-white/10 rounded mb-2" />

      {/* Title */}
      <div className="space-y-2 mb-5">
        <div className="h-6 w-full bg-white/10 rounded" />
        <div className="h-6 w-3/4 bg-white/10 rounded" />
      </div>

      {/* Price Cards */}
      <div className="grid grid-cols-2 gap-3 mb-5 flex-grow">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="h-4 w-12 bg-white/10 rounded mb-2" />
          <div className="h-8 w-16 bg-white/10 rounded mb-2" />
          <div className="h-3 w-20 bg-white/10 rounded mb-3" />
          <div className="h-10 bg-white/10 rounded" />
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="h-4 w-12 bg-white/10 rounded mb-2" />
          <div className="h-8 w-16 bg-white/10 rounded mb-2" />
          <div className="h-3 w-20 bg-white/10 rounded mb-3" />
          <div className="h-10 bg-white/10 rounded" />
        </div>
      </div>

      {/* Liquidity */}
      <div className="mb-4 p-3 bg-white/5 rounded-lg">
        <div className="h-3 w-24 bg-white/10 rounded mb-2" />
        <div className="h-2 w-full bg-white/10 rounded mb-1" />
        <div className="h-3 w-16 bg-white/10 rounded" />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/10">
        <div className="h-4 w-20 bg-white/10 rounded" />
        <div className="h-4 w-16 bg-white/10 rounded" />
      </div>

      {/* Button */}
      <div className="h-12 bg-white/10 rounded-xl" />
    </div>
  );
}
