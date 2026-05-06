type BadgeSize = 'sm' | 'md' | 'lg';

export function DemoBadge({ size = 'md' }: { size?: BadgeSize }) {
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  };
  
  return (
    <span
      className={`inline-flex items-center gap-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded font-bold ${sizeClasses[size]}`}
    >
      DEMO
    </span>
  );
}
