import { useState } from 'react';
import { X, CheckCircle, Loader2 } from 'lucide-react';
import { useWallet } from '~/store/useWalletStore';
import { useTRPC } from '~/trpc/react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface JoinWaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JoinWaitlistModal({ isOpen, onClose }: JoinWaitlistModalProps) {
  const { address, isConnected, openWalletModal } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const trpc = useTRPC();
  const registerMutation = useMutation(trpc.registerLPWaitlist.mutationOptions());

  const handleRegister = async () => {
    if (!isConnected || !address) {
      openWalletModal();
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await registerMutation.mutateAsync({
        walletAddress: address,
      });

      if (result.alreadyRegistered) {
        toast("You're already on the waitlist", {
          icon: '✓',
        });
      } else {
        toast.success("You're on the list. We'll notify you.");
      }

      onClose();
    } catch (error: any) {
      console.error('Failed to register for waitlist:', error);
      toast.error('Failed to register. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-brand-navy border border-white/10 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h3 className="font-syne font-bold text-xl">Join LP Waitlist</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-gray-300">
            External liquidity opens on mainnet. Connect your wallet to register your interest.
          </p>

          {/* Wallet Display */}
          {isConnected && address ? (
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">Wallet</div>
              <div className="font-mono text-sm flex items-center gap-2">
                <span className="text-brand-green">{address.slice(0, 6)}...{address.slice(-4)}</span>
                <CheckCircle className="w-4 h-4 text-brand-green" />
              </div>
            </div>
          ) : (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-200">
                Please connect your wallet to register
              </p>
            </div>
          )}

          {/* Info Grid */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-white/5 rounded-lg text-sm">
            <div>
              <div className="text-xs text-gray-400 mb-1">Minimum</div>
              <div className="font-semibold">$500 USDC</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Expected APY</div>
              <div className="font-semibold">Variable</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Lock-up</div>
              <div className="font-semibold">None</div>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Expected APY is variable and based on platform trading fees. No lock-up period — withdraw anytime.
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-white/20 rounded-lg hover:bg-white/5 transition-colors font-semibold"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleRegister}
            disabled={!isConnected || isSubmitting}
            className="flex-1 py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Registering...
              </>
            ) : (
              'Register Interest'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
