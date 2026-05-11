import { Info, Vault, Users, Gift } from 'lucide-react';
import { useState } from 'react';

interface FeeBreakdownCardProps {
  feeAmount?: number;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

export function FeeBreakdownCard({ 
  feeAmount, 
  variant = 'default',
  className = '' 
}: FeeBreakdownCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Fee distribution percentages
  const VAULT_PCT = 50;
  const ANALYST_PCT = 35;
  const REFERRAL_PCT = 15;

  // Calculate amounts if fee is provided
  const vaultAmount = feeAmount ? (feeAmount * VAULT_PCT) / 100 : null;
  const analystAmount = feeAmount ? (feeAmount * ANALYST_PCT) / 100 : null;
  const referralAmount = feeAmount ? (feeAmount * REFERRAL_PCT) / 100 : null;

  if (variant === 'compact') {
    return (
      <div className={`flex items-start gap-2.5 text-sm leading-snug ${className}`}>
        <Info className="w-4 h-4 text-brand-green/80 flex-shrink-0 mt-0.5" />
        <span className="text-gray-400">
          Fee split: <span className="text-brand-green font-semibold">50%</span> Vault · 
          <span className="text-brand-cyan font-semibold"> 35%</span> Analysts · 
          <span className="text-purple-400 font-semibold"> 15%</span> Referrals
        </span>
      </div>
    );
  }

  return (
    <div className={`bg-white/5 border border-white/10 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Info className="w-4 h-4 text-brand-green" />
          Fee Distribution
        </h4>
        {variant === 'detailed' && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            {showDetails ? 'Hide' : 'Show'} details
          </button>
        )}
      </div>

      {/* Visual breakdown */}
      <div className="space-y-3">
        {/* Vault */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-green/20 flex items-center justify-center flex-shrink-0">
            <Vault className="w-5 h-5 text-brand-green" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Protocol Vault</span>
              <span className="text-sm font-bold text-brand-green">{VAULT_PCT}%</span>
            </div>
            {vaultAmount !== null && (
              <div className="text-xs text-gray-400">
                ${vaultAmount.toFixed(2)} USDC
              </div>
            )}
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-brand-green" style={{ width: `${VAULT_PCT}%` }} />
            </div>
          </div>
        </div>

        {/* Analysts */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-cyan/20 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-brand-cyan" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Analysts (Copy Trading)</span>
              <span className="text-sm font-bold text-brand-cyan">{ANALYST_PCT}%</span>
            </div>
            {analystAmount !== null && (
              <div className="text-xs text-gray-400">
                ${analystAmount.toFixed(2)} USDC
              </div>
            )}
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-brand-cyan" style={{ width: `${ANALYST_PCT}%` }} />
            </div>
          </div>
        </div>

        {/* Referrals */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <Gift className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Referral Rewards</span>
              <span className="text-sm font-bold text-purple-400">{REFERRAL_PCT}%</span>
            </div>
            {referralAmount !== null && (
              <div className="text-xs text-gray-400">
                ${referralAmount.toFixed(2)} USDC
              </div>
            )}
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-purple-500" style={{ width: `${REFERRAL_PCT}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Detailed explanation */}
      {showDetails && variant === 'detailed' && (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-xs text-gray-400">
          <p>
            <strong className="text-brand-green">Protocol Vault (50%):</strong> Provides liquidity for all markets and earns yield for liquidity providers.
          </p>
          <p>
            <strong className="text-brand-cyan">Analysts (35%):</strong> Rewards skilled traders whose positions are copied by other users.
          </p>
          <p>
            <strong className="text-purple-400">Referrals (15%):</strong> Rewards users who bring new traders to the platform.
          </p>
        </div>
      )}

      {/* Total if amount provided */}
      {feeAmount != null && feeAmount > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-sm">
          <span className="text-gray-400">Total Fee</span>
          <span className="font-mono font-bold">${feeAmount.toFixed(2)} USDC</span>
        </div>
      )}
    </div>
  );
}
