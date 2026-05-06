export interface Analyst {
  id: string;
  wallet: string;
  displayName: string;
  avatar: string;
  bio: string;
  sport: string[];
  roi: number;
  winRate: number;
  totalPredictions: number;
  avgOdds: number;
  followersCount: number;
  volumeGenerated: number;
  pendingRewards: number;
  totalEarned: number;
  autoCompound: boolean;
  activityDays: number;
  validFollowers: number;
  onchainRegistered: boolean;
  referralCode: string;
  /** Short testimonial for marketing blocks (e.g. Affiliates featured cards) */
  featuredQuote?: string;
  /** Mirrors Prisma `Analyst.verificationTier` */
  verificationTier?: string | null;
  isVerified?: boolean;
}

export interface AffiliateContact {
  id: string;
  name: string;
  type: "creator" | "podcast" | "network" | "athlete" | "media" | "agent";
  sport: string[];
  platform: string;
  followers: string;
  region: string;
  handles: {
    x?: string;
    email?: string;
    instagram?: string;
    youtube?: string;
    linkedin?: string;
    telegram?: string;
  };
  stage:
    | "identified"
    | "contacted"
    | "replied"
    | "negotiating"
    | "active"
    | "closed";
  priority: "high" | "medium" | "low";
  fitScore: number;
  estimatedValue: string;
  interactions: Array<{
    date: number;
    channel: string;
    goal: string;
    message: string;
    status: string;
  }>;
  notes: string;
  addedAt: number;
}

export interface AffiliateNetwork {
  id: string;
  name: string;
  website: string;
  reach: string;
  affiliatesCount: number;
  verticals: string[];
  contact: string;
  proposedRevShare: number;
  stage: string;
  notes: string;
}

export interface Task {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
}
