import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

export function CanonicalSurfaceCTA({
  title,
  description,
  targetLabel,
  to,
  icon: Icon,
}: {
  title: string;
  description: string;
  targetLabel: string;
  to: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-10 text-center max-w-lg mx-auto">
      {Icon ? <Icon className="w-12 h-12 text-brand-green mx-auto mb-4" /> : null}
      <h2 className="font-syne font-bold text-2xl mb-2">{title}</h2>
      <p className="text-gray-400 text-sm mb-6">{description}</p>
      <Link
        to={to}
        className="inline-flex items-center gap-2 px-6 py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors"
      >
        {targetLabel}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
