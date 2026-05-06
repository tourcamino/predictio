import { useLiveCounter } from '~/hooks/useLiveCounter';

interface LiveIndicatorProps {
  initialCount?: number;
  label?: string;
}

export function LiveIndicator({ initialCount = 847, label = 'predictions now' }: LiveIndicatorProps) {
  const { value, isFlashing } = useLiveCounter({
    initialValue: initialCount,
    interval: 30000, // 30 seconds
    minIncrement: -5,
    maxIncrement: 5,
  });

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-brand-green/30 rounded-full">
      <div className="w-2 h-2 bg-brand-green rounded-full animate-pulse" />
      <span className="text-xs font-mono font-semibold">
        <span className={`transition-all ${isFlashing ? 'text-brand-green scale-110' : 'text-white'}`}>
          LIVE
        </span>
        <span className="text-gray-400 mx-1.5">·</span>
        <span className={`transition-all ${isFlashing ? 'text-brand-green' : 'text-white'}`}>
          {value.toLocaleString()}
        </span>
        <span className="text-gray-400 ml-1">{label}</span>
      </span>
    </div>
  );
}
