import { TierBadge } from '~/components/affiliate/TierBadge';
import { Users, TrendingUp, DollarSign, ArrowRight, CheckCircle } from 'lucide-react';

interface TierProgressCardProps {
  tierProgress: {
    currentTier: string;
    nextTier: string | null;
    progress: {
      followers: number;
      volume: number;
      roi: number;
    };
    requirements: {
      followers: number;
      volume: number;
      roi: number;
    };
    current: {
      followers: number;
      volume: number;
      roi: number;
    };
  };
}

export function TierProgressCard({ tierProgress }: TierProgressCardProps) {
  const { currentTier, nextTier, progress, requirements, current } = tierProgress;

  if (!nextTier) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="font-syne font-bold text-2xl mb-2">Elite Status Achieved!</h3>
          <p className="text-gray-400 mb-4">
            You've reached the highest tier with 50% commission rate
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-green/20 border border-brand-green/30 rounded-lg">
            <CheckCircle className="w-5 h-5 text-brand-green" />
            <span className="text-brand-green font-semibold">Maximum Tier</span>
          </div>
        </div>
      </div>
    );
  }

  const metrics = [
    {
      icon: Users,
      label: 'Valid Followers',
      current: current.followers,
      required: requirements.followers,
      progress: progress.followers,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400',
    },
    {
      icon: DollarSign,
      label: 'Volume Generated',
      current: `$${current.volume.toLocaleString()}`,
      required: `$${requirements.volume.toLocaleString()}`,
      progress: progress.volume,
      color: 'text-brand-cyan',
      bgColor: 'bg-brand-cyan',
    },
    {
      icon: TrendingUp,
      label: 'ROI',
      current: `${current.roi.toFixed(1)}%`,
      required: `${requirements.roi}%`,
      progress: progress.roi,
      color: 'text-brand-green',
      bgColor: 'bg-brand-green',
    },
  ];

  const overallProgress = (progress.followers + progress.volume + progress.roi) / 3;

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
      <h3 className="font-syne font-bold text-xl mb-6">Tier Progress</h3>

      {/* Tier Transition */}
      <div className="flex items-center justify-center gap-4 mb-6 pb-6 border-b border-white/10">
        <TierBadge tier={currentTier as any} size="lg" />
        <ArrowRight className="w-6 h-6 text-gray-500" />
        <TierBadge tier={nextTier as any} size="lg" />
      </div>

      {/* Overall Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-400">Overall Progress to {nextTier}</span>
          <span className="font-mono font-bold">{overallProgress.toFixed(0)}%</span>
        </div>
        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-green to-brand-cyan transition-all duration-500"
            style={{ width: `${Math.min(overallProgress, 100)}%` }}
          />
        </div>
      </div>

      {/* Individual Metrics */}
      <div className="space-y-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const isComplete = metric.progress >= 100;
          
          return (
            <div key={metric.label} className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg bg-white/10 ${metric.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{metric.label}</span>
                    {isComplete && (
                      <CheckCircle className="w-4 h-4 text-brand-green" />
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {metric.current} / {metric.required}
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${metric.bgColor} transition-all duration-500`}
                    style={{ width: `${Math.min(metric.progress, 100)}%` }}
                  />
                </div>
                <div className="absolute -top-6 right-0 text-xs font-mono font-bold">
                  {metric.progress.toFixed(0)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upgrade Benefits */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <h4 className="text-sm font-semibold mb-3 text-gray-400">
          Benefits of {nextTier} Tier
        </h4>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-brand-green flex-shrink-0" />
            <span>
              {nextTier === 'silver' && '35% commission rate (up from 30%)'}
              {nextTier === 'gold' && '40% commission rate (up from 35%)'}
              {nextTier === 'elite' && '50% commission rate (up from 40%)'}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-brand-green flex-shrink-0" />
            <span>
              {nextTier === 'silver' && 'Email support'}
              {nextTier === 'gold' && 'Weekly automatic payouts'}
              {nextTier === 'elite' && 'Daily automatic payouts'}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-brand-green flex-shrink-0" />
            <span>
              {nextTier === 'silver' && 'Priority customer support'}
              {nextTier === 'gold' && 'Priority support + advanced analytics'}
              {nextTier === 'elite' && 'Dedicated account manager'}
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
