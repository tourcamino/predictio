import { Shield, Globe, TrendingUp, Users } from 'lucide-react';

export function WhyPredictio() {
  const features = [
    {
      icon: TrendingUp,
      title: 'Trade Before Kickoff',
      description:
        'Markets are open until the match starts. Place your prediction, then watch it unfold. No bookmakers. Pure market dynamics driven by trader activity.',
    },
    {
      icon: Shield,
      title: 'Exit Before Kickoff',
      description:
        "Changed your mind? Sell your position anytime before the match starts. Lock in gains or cut losses — you're always in control.",
    },
    {
      icon: Globe,
      title: 'Market-Driven Odds',
      description:
        'No bookmakers setting the lines. Real-time prices powered by trader activity — pure market dynamics.',
    },
    {
      icon: Users,
      title: 'Copy the Best Traders',
      description:
        'See what top traders are betting on. Copy their positions in one click. When they win — you win.',
      link: '/copy',
      linkText: 'Explore Copy Trading →',
    },
  ];

  return (
    <section id="about" className="py-20 lg:py-32 bg-brand-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="font-syne font-bold text-4xl sm:text-5xl lg:text-6xl">
            Why Trade Here?
          </h2>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-brand-navy border border-white/10 rounded-lg p-8 text-center md:text-left hover:border-brand-green/30 transition-all"
              >
                {/* Icon */}
                <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-green/10 rounded-lg mb-6">
                  <Icon className="w-7 h-7 text-brand-green" />
                </div>

                {/* Title */}
                <h3 className="font-syne font-bold text-2xl mb-4">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-gray-400 leading-relaxed mb-4">
                  {feature.description}
                </p>

                {/* Optional CTA Link */}
                {'link' in feature && feature.link && (
                  <a
                    href={feature.link}
                    className="inline-flex items-center text-brand-green font-semibold hover:text-brand-green/80 transition-colors"
                  >
                    {feature.linkText}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
