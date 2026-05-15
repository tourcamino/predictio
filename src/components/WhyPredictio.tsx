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
      link: '/leaderboard',
      linkText: 'Open leaderboard →',
    },
  ];

  return (
    <section id="about" className="bg-brand-bg py-20 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="font-syne text-4xl font-bold sm:text-5xl lg:text-6xl">Why Trade Here?</h2>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-lg border border-white/10 bg-brand-navy p-8 text-center transition-all hover:border-brand-green/30 md:text-left"
              >
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-lg bg-brand-green/10">
                  <Icon className="h-7 w-7 text-brand-green" />
                </div>

                <h3 className="mb-4 font-syne text-2xl font-bold">{feature.title}</h3>

                <p className="mb-4 leading-relaxed text-gray-400">{feature.description}</p>

                {'link' in feature && feature.link ? (
                  <a
                    href={feature.link}
                    className="inline-flex items-center font-semibold text-brand-green hover:text-brand-green/80 transition-colors"
                  >
                    {feature.linkText}
                  </a>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
