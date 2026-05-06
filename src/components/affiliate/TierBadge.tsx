import { TIER_COLORS } from "~/systems/rewardEngine";

export type RewardDisplayTier = "bronze" | "silver" | "gold" | "elite";

/** Maps analyst `verificationTier` ("trusted" | "elite" | "partner") to reward UI tiers. */
export function verificationToRewardTier(
  v: string | null | undefined
): RewardDisplayTier {
  const t = (v ?? "").toLowerCase();
  if (t === "elite") return "elite";
  if (t === "partner") return "gold";
  if (t === "trusted") return "silver";
  return "bronze";
}

interface TierBadgeProps {
  tier: RewardDisplayTier;
  size?: "sm" | "md" | "lg";
}

export function TierBadge({ tier, size = "md" }: TierBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  const shouldShimmer = tier === "elite" || tier === "gold";

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wider ${sizeClasses[size]} ${
        shouldShimmer ? "animate-shimmer" : ""
      }`}
      style={{
        backgroundColor: `${TIER_COLORS[tier]}20`,
        color: TIER_COLORS[tier],
        border: `1px solid ${TIER_COLORS[tier]}`,
      }}
    >
      {tier === "elite" && "🏆"}
      {tier === "gold" && "🥇"}
      {tier === "silver" && "🥈"}
      {tier === "bronze" && "🥉"}
      <span>{tier}</span>
    </div>
  );
}
