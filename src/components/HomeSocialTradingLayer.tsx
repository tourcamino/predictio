import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Radio, Users } from 'lucide-react';
import { useTRPC } from '~/trpc/react';
import { homeSocialLayer } from '~/copy/homePremium';

const DISPLAY_LIMIT = 6;

function formatRoi(roi: number): string {
  const rounded = Number.isFinite(roi) ? roi : 0;
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toFixed(1)}%`;
}

export function HomeSocialTradingLayer() {
  const trpc = useTRPC();
  const leaderboardQuery = useQuery({
    ...trpc.getAnalystLeaderboard.queryOptions({
      limit: DISPLAY_LIMIT,
      sortBy: 'roi',
    }),
    staleTime: 55_000,
    refetchInterval: 90_000,
  });

  const rows = leaderboardQuery.data?.leaderboard ?? [];

  return (
    <section
      id="social-trading"
      className="relative overflow-hidden border-t border-white/[0.07] bg-[#060910] py-24 lg:py-32"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_100%_0%,rgba(0,255,135,0.055),transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_40%_at_0%_100%,rgba(0,212,255,0.04),transparent_55%)]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 flex flex-col gap-4 lg:mb-16 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-brand-green/85">
              <Radio className="h-3.5 w-3.5 opacity-80" aria-hidden />
              {homeSocialLayer.eyebrow}
            </p>
            <h2 className="font-syne text-3xl font-semibold tracking-[-0.02em] text-white sm:text-4xl lg:text-[2.75rem]">
              {homeSocialLayer.title}
            </h2>
            <p className="text-sm leading-relaxed text-white/50 sm:text-base">{homeSocialLayer.sub}</p>
          </div>
          <Link
            to="/leaderboard"
            className="group inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-white/[0.11] bg-white/[0.04] px-5 py-2.5 text-xs font-medium uppercase tracking-[0.16em] text-white/75 transition-all duration-500 hover:border-brand-green/35 hover:bg-brand-green/[0.07] hover:text-white lg:self-auto"
          >
            Leaderboard
            <ArrowRight className="h-3.5 w-3.5 opacity-70 transition-transform duration-500 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {leaderboardQuery.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: DISPLAY_LIMIT }).map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.06]"
              />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.03] px-8 py-14 text-center ring-1 ring-white/[0.06]">
            <Users className="mx-auto mb-4 h-9 w-9 text-white/25" aria-hidden />
            <p className="font-syne text-lg text-white/55">{homeSocialLayer.emptyTitle}</p>
            <p className="mt-2 text-sm text-white/40">{homeSocialLayer.emptySub}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((a) => (
              <div
                key={a.wallet}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-px transition-[transform,box-shadow] duration-500 hover:shadow-[0_0_72px_-28px_rgba(0,255,135,0.22)]"
              >
                <div className="relative flex h-full flex-col rounded-[0.95rem] bg-brand-navy/95 px-5 py-6 ring-1 ring-white/[0.05]">
                  <div
                    className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-green/[0.06] blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                    aria-hidden
                  />
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-lg ring-1 ring-white/[0.08]"
                        aria-hidden
                      >
                        {a.avatar || '·'}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-syne text-base font-semibold text-white/95">
                          {a.displayName || 'Analyst'}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] tabular-nums text-white/35">
                          #{a.rank} · {Number(a.winRate ?? 0).toFixed(0)}% wins
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-white/35">ROI</p>
                      <p
                        className={`font-mono text-lg font-semibold tabular-nums ${
                          Number(a.roi ?? 0) >= 0 ? 'text-brand-green' : 'text-rose-400/90'
                        }`}
                      >
                        {formatRoi(Number(a.roi ?? 0))}
                      </p>
                    </div>
                  </div>

                  {a.latestTradeLabel ? (
                    <p className="relative mt-4 line-clamp-2 border-t border-white/[0.06] pt-4 text-xs leading-relaxed text-white/45">
                      <span className="text-white/30">Latest · </span>
                      {a.latestTradeLabel}
                    </p>
                  ) : (
                    <p className="relative mt-4 border-t border-white/[0.06] pt-4 text-xs text-white/35">
                      Building a public tape on the live book.
                    </p>
                  )}

                  <div className="relative mt-auto flex items-center justify-between pt-5">
                    <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/30">
                      {homeSocialLayer.copyReady}
                    </span>
                    <Link
                      to="/affiliates"
                      className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-green/90 transition-colors hover:text-brand-green"
                    >
                      {homeSocialLayer.programLink}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
