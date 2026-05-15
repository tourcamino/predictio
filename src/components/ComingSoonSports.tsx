export function ComingSoonSports() {
  return (
    <section className="py-20 lg:py-32 bg-brand-bg relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-brand-cyan/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        {/* Header */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full mb-6">
          <span className="text-sm font-semibold text-purple-400">COMING SOON</span>
        </div>
        
        <h2 className="font-syne font-bold text-4xl sm:text-5xl lg:text-6xl mb-6">
          More Sports Coming Soon
        </h2>
        
        <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
          We're starting with a tight multisport core to build the best trading experience. More sports will be unlocked as the platform grows.
        </p>
      </div>
    </section>
  );
}
