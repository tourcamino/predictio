import { Shield, Lock, CheckCircle } from 'lucide-react';
import { homeTrust } from '~/copy/homePremium';

const icons = [Shield, Lock, CheckCircle];

export function TrustSection() {
  return (
    <section className="py-20 lg:py-32 bg-brand-navy relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-brand-green/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-brand-cyan/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="font-syne font-bold text-4xl sm:text-5xl lg:text-6xl mb-6">
            {homeTrust.title}
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">{homeTrust.sub}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {homeTrust.cards.map((feature, i) => {
            const Icon = icons[i % icons.length]!;
            return (
              <div
                key={feature.title}
                className="bg-brand-bg border border-white/10 rounded-lg p-8 text-center hover:border-brand-green/30 transition-all"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-green/10 rounded-lg mb-6">
                  <Icon className="w-7 h-7 text-brand-green" />
                </div>

                <h3 className="font-syne font-bold text-2xl mb-4">{feature.title}</h3>

                <p className="text-gray-400 leading-relaxed">{feature.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
