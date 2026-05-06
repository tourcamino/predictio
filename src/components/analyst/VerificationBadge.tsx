import { CheckCircle, Shield, Star } from 'lucide-react';

interface VerificationBadgeProps {
  isVerified: boolean;
  verificationTier?: 'trusted' | 'elite' | 'partner' | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const VERIFICATION_COLORS = {
  trusted: '#00D4FF',  // Cyan
  elite: '#FFD700',    // Gold
  partner: '#9333EA',  // Purple
};

const VERIFICATION_LABELS = {
  trusted: 'Verified',
  elite: 'Elite',
  partner: 'Partner',
};

export function VerificationBadge({ 
  isVerified, 
  verificationTier = 'trusted', 
  size = 'md',
  showLabel = true 
}: VerificationBadgeProps) {
  if (!isVerified) return null;

  const tier = verificationTier || 'trusted';
  const color = VERIFICATION_COLORS[tier];
  const label = VERIFICATION_LABELS[tier];

  const sizeClasses = {
    sm: showLabel ? 'text-xs px-2 py-0.5' : 'w-4 h-4',
    md: showLabel ? 'text-sm px-3 py-1' : 'w-5 h-5',
    lg: showLabel ? 'text-base px-4 py-1.5' : 'w-6 h-6',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  const Icon = tier === 'elite' ? Star : tier === 'partner' ? Shield : CheckCircle;

  if (!showLabel) {
    // Icon-only mode
    return (
      <div 
        className={`inline-flex items-center justify-center ${sizeClasses[size]}`}
        title={label}
      >
        <Icon 
          size={iconSizes[size]} 
          style={{ color }} 
          fill={tier === 'elite' ? color : 'none'}
          strokeWidth={tier === 'elite' ? 0 : 2}
        />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${sizeClasses[size]}`}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}`,
      }}
      title={`${label} Trader`}
    >
      <Icon 
        size={iconSizes[size]} 
        fill={tier === 'elite' ? color : 'none'}
        strokeWidth={tier === 'elite' ? 0 : 2}
      />
      <span>{label}</span>
    </div>
  );
}
