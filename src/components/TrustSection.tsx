import { Shield, Lock, CheckCircle } from 'lucide-react';

export function TrustSection() {
  const trustFeatures = [
    {
      icon: Shield,
      title: 'Non-Custodial',
      description: 'You control your funds. Your wallet, your keys, always.',
    },
    {
      icon: Lock,
      title: 'No KYC Required',
      description: 'Trade anonymously. No personal information needed.',
    },
    {
      icon: CheckCircle,
      title: 'Audited & Transparent',
      description: 'Powered by audited smart contracts and oracle-based resolution.',
    },
  ];

  return (
    <section className="py-20 lg:py-32 bg-brand-navy relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-brand-green/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-brand-cyan/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="font-syne font-bold text-4xl sm:text-5xl lg:text-6xl mb-6">
            Built for Transparency
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Trade with confidence on a platform designed for security and fairness.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {trustFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-brand-bg border border-white/10 rounded-lg p-8 text-center hover:border-brand-green/30 transition-all"
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
                <p className="text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
