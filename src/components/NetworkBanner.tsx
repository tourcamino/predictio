import { AlertTriangle } from 'lucide-react';
import { useWallet } from '~/store/useWalletStore';

export function NetworkBanner() {
  const { wrongNetwork, switchNetwork, isConnected } = useWallet();

  if (!isConnected || !wrongNetwork) return null;

  return (
    <div className="relative z-[100] animate-slide-down">
      <div className="bg-red-500/20 border-b border-red-500/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm font-medium">
                <span className="text-red-500">Wrong Network</span>
                <span className="text-gray-300 ml-2">— Predictio runs on BASE.</span>
              </p>
            </div>
            <button
              onClick={switchNetwork}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold text-sm rounded transition-colors whitespace-nowrap"
            >
              Switch to BASE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
