interface StatusDotProps {
  status: 'live' | 'soon' | 'locked' | 'resolved' | 'cancelled' | 'refunded' | 'disputed';
  className?: string;
}

export function StatusDot({ status, className = '' }: StatusDotProps) {
  const statusConfig = {
    live: {
      label: 'LIVE',
      color: 'bg-brand-green',
      textColor: 'text-brand-green',
      pulse: true,
    },
    soon: {
      label: 'SOON',
      color: 'bg-yellow-500',
      textColor: 'text-yellow-500',
      pulse: false,
    },
    locked: {
      label: 'LOCKED',
      color: 'bg-gray-500',
      textColor: 'text-gray-500',
      pulse: false,
    },
    resolved: {
      label: 'RESOLVED',
      color: 'bg-blue-500',
      textColor: 'text-blue-500',
      pulse: false,
    },
    cancelled: {
      label: 'CANCELLED',
      color: 'bg-yellow-500',
      textColor: 'text-yellow-500',
      pulse: false,
    },
    refunded: {
      label: 'REFUNDED',
      color: 'bg-cyan-500',
      textColor: 'text-cyan-400',
      pulse: false,
    },
    disputed: {
      label: 'DISPUTED',
      color: 'bg-orange-500',
      textColor: 'text-orange-400',
      pulse: false,
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`w-2 h-2 rounded-full ${config.color} ${
          config.pulse ? 'animate-pulse' : ''
        }`}
      />
      <span className={`text-xs font-semibold ${config.textColor}`}>
        {config.label}
      </span>
    </div>
  );
}
