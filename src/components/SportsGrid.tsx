import { Link } from '@tanstack/react-router';

const SPORTS: { name: string; key: string }[] = [
  { name: 'Football', key: 'football' },
  { name: 'Basketball', key: 'basketball' },
  { name: 'Tennis', key: 'tennis' },
  { name: 'MMA', key: 'mma' },
  { name: 'Formula 1', key: 'f1' },
  { name: 'Cricket', key: 'cricket' },
  { name: 'Baseball', key: 'baseball' },
  { name: 'Rugby', key: 'rugby' },
  { name: 'Hockey', key: 'hockey' },
  { name: 'Esports', key: 'esports' },
];

export function SportsGrid() {
  return (
    <section id="sports" className="relative border-t border-white/[0.045] bg-brand-navy py-28 lg:py-36">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,rgba(255,255,255,0.03),transparent)]"
        aria-hidden
      />
      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 flex flex-col items-center gap-5 sm:mb-20">
          <div className="h-px w-10 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <h2 className="font-syne text-2xl font-light tracking-[-0.02em] text-white/90 sm:text-3xl">
            Sports
          </h2>
        </div>

        <div className="rounded-2xl bg-white/[0.065] p-px shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[0.65rem] bg-white/[0.06] sm:grid-cols-3 lg:grid-cols-5">
            {SPORTS.map((sport) => (
              <Link
                key={sport.name}
                to="/markets"
                search={{ sport: sport.key }}
                className="group relative bg-brand-navy px-3 py-9 text-center transition-colors duration-700 ease-out hover:bg-white/[0.032] sm:py-10"
              >
                <span className="block font-syne text-sm font-normal leading-snug tracking-wide text-white/68 transition-all duration-700 ease-out group-hover:tracking-[0.08em] group-hover:text-white/88">
                  {sport.name}
                </span>
                <span
                  className="mx-auto mt-5 block h-px w-0 max-w-[3rem] bg-gradient-to-r from-transparent via-white/30 to-transparent transition-all duration-700 ease-out group-hover:w-full"
                  aria-hidden
                />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
