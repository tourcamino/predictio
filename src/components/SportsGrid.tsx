import { Link } from '@tanstack/react-router';

export function SportsGrid() {
  // Map display names to sport keys from SPORT_METADATA
  const sports = [
    { emoji: '⚽', name: 'Soccer', key: 'football' },
    { emoji: '🏀', name: 'Basketball', key: 'basketball' },
    { emoji: '🎾', name: 'Tennis', key: 'tennis' },
    { emoji: '🥊', name: 'MMA/UFC', key: 'mma' },
    { emoji: '🏏', name: 'Cricket', key: 'cricket' },
    { emoji: '⚾', name: 'Baseball', key: 'baseball' },
    { emoji: '🏉', name: 'Rugby', key: 'rugby' },
    { emoji: '🏒', name: 'Ice Hockey', key: 'hockey' },
    { emoji: '🏐', name: 'Volleyball', key: 'all' }, // Not in SPORT_METADATA
    { emoji: '🏊', name: 'Swimming', key: 'all' }, // Not in SPORT_METADATA
    { emoji: '🏎️', name: 'Formula 1', key: 'f1' },
    { emoji: '🎱', name: 'Esports', key: 'esports' },
  ];

  return (
    <section id="sports" className="py-20 lg:py-32 bg-brand-navy">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="font-syne font-bold text-4xl sm:text-5xl lg:text-6xl mb-6">
            Every Sport. Every Continent.
          </h2>
          <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto">
            From Serie A to the NBA, from UFC to the IPL — if it's played, you
            can predict it.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          {sports.map((sport) => (
            <Link
              key={sport.name}
              to="/markets"
              search={{ sport: sport.key }}
              className="group relative bg-brand-bg border border-white/10 rounded-lg p-6 lg:p-8 text-center transition-all duration-200 hover:scale-105 hover:border-brand-green/50 hover:shadow-[0_0_30px_rgba(0,255,135,0.15)] cursor-pointer"
            >
              <div className="text-4xl lg:text-5xl mb-4">{sport.emoji}</div>
              <div className="font-syne font-semibold text-base lg:text-lg">
                {sport.name}
              </div>
            </Link>
          ))}
        </div>

        {/* Footer Note */}
        <p className="text-center text-sm text-gray-500">
          ...and 35 more sports across 6 continents
        </p>
      </div>
    </section>
  );
}
