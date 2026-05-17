import { Link } from "@tanstack/react-router";

const surfaces = [
  {
    href: "/trading",
    title: "Trading",
    desc: "Lifecycle · execution · MTM · settlement",
  },
  {
    href: "/portfolio",
    title: "Portfolio",
    desc: "Exposure · net worth · allocation",
  },
  {
    href: "/wallet/transactions",
    title: "Wallet",
    desc: "Immutable ledger · deposits · rewards",
  },
  {
    href: "/markets",
    title: "Markets",
    desc: "Discovery · execution entry",
  },
  {
    href: "/copy",
    title: "Copy",
    desc: "Social discovery · mirror flow",
  },
  {
    href: "/liquidity",
    title: "Liquidity",
    desc: "LP protocol layer",
  },
] as const;

export function ProtocolSurfaceWayfinder({ current }: { current?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-r from-white/[0.04] to-transparent p-4">
      <p className="mb-3 text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">
        Protocol surfaces
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {surfaces.map((s) => (
          <Link
            key={s.href}
            to={s.href}
            className={`rounded-lg border px-3 py-2 transition-colors ${
              current === s.href
                ? "border-brand-green/40 bg-brand-green/10"
                : "border-white/10 bg-black/20 hover:border-brand-green/25"
            }`}
          >
            <p className="text-sm font-semibold text-white">{s.title}</p>
            <p className="text-[10px] text-gray-500">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
