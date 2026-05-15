import { Shield, Globe, TrendingUp, Users } from 'lucide-react';
import { homeWhy } from '~/copy/homePremium';

const icons = [TrendingUp, Shield, Globe, Users];

export function WhyPredictio() {
  return (
    <section id="about" className="bg-brand-bg py-20 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="font-syne text-4xl font-bold sm:text-5xl lg:text-6xl">{homeWhy.title}</h2>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {homeWhy.cards.map((feature, i) => {
            const Icon = icons[i % icons.length]!;
            return (
              <div
                key={feature.title}
                className="rounded-lg border border-white/10 bg-brand-navy p-8 text-center transition-all hover:border-brand-green/30 md:text-left"
              >
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-lg bg-brand-green/10">
                  <Icon className="h-7 w-7 text-brand-green" />
                </div>

                <h3 className="mb-4 font-syne text-2xl font-bold">{feature.title}</h3>

                <p className="leading-relaxed text-gray-400">{feature.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
