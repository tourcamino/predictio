export function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Pick a Match',
      description:
        'Choose a live football market.',
    },
    {
      number: '02',
      title: 'Trade Your Prediction',
      description:
        'Buy YES or NO based on what you think will happen.',
    },
    {
      number: '03',
      title: 'Win or Trade Anytime',
      description:
        'Sell anytime for profit or hold until resolution.',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 lg:py-32 bg-brand-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16 lg:mb-24">
          <h2 className="font-syne font-bold text-4xl sm:text-5xl lg:text-6xl">
            How Predictio Works
          </h2>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting Line (Desktop Only) */}
          <div className="hidden lg:block absolute top-16 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-green/30 to-transparent" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">
            {steps.map((step, index) => (
              <div key={step.number} className="relative text-center lg:text-left">
                {/* Number */}
                <div className="font-mono text-6xl lg:text-7xl font-bold text-brand-green mb-6 lg:mb-8">
                  {step.number}
                </div>

                {/* Title */}
                <h3 className="font-syne font-bold text-2xl lg:text-3xl mb-4">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-gray-400 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
