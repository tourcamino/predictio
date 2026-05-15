import { homeHowItWorks } from '~/copy/homePremium';

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 lg:py-32 bg-brand-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 lg:mb-24">
          <h2 className="font-syne font-bold text-4xl sm:text-5xl lg:text-6xl">{homeHowItWorks.title}</h2>
        </div>

        <div className="relative">
          <div className="hidden lg:block absolute top-16 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-green/30 to-transparent" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">
            {homeHowItWorks.steps.map((step) => (
              <div key={step.n} className="relative text-center lg:text-left">
                <div className="font-mono text-6xl lg:text-7xl font-bold text-brand-green mb-6 lg:mb-8">
                  {step.n}
                </div>
                <h3 className="font-syne font-bold text-2xl lg:text-3xl mb-4">{step.title}</h3>
                <p className="text-gray-400 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
