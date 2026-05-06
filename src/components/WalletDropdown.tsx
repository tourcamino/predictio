import { Fragment, useState } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { Copy, ExternalLink, User, BarChart3, Trophy, Settings, LogOut, TrendingUp } from 'lucide-react';
import { useWallet } from '~/store/useWalletStore';
import { Link, useNavigate } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import { DepositWithdrawModal } from './DepositWithdrawModal';

interface WalletDropdownProps {
  onClose?: () => void;
}

export function WalletDropdown({ onClose }: WalletDropdownProps) {
  const { address, balance, disconnectWallet } = useWallet();
  const navigate = useNavigate();
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [depositWithdrawModal, setDepositWithdrawModal] = useState<{ isOpen: boolean; type: 'deposit' | 'withdraw' }>({
    isOpen: false,
    type: 'deposit',
  });

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Address copied!');
    }
  };

  const handleDisconnect = () => {
    if (showDisconnectConfirm) {
      disconnectWallet();
      toast.success('Wallet disconnected');
      onClose?.();
      // Force navigation to home page after disconnect
      setTimeout(() => {
        navigate({ to: '/', replace: true });
      }, 100);
      setShowDisconnectConfirm(false);
    } else {
      setShowDisconnectConfirm(true);
      setTimeout(() => setShowDisconnectConfirm(false), 3000);
    }
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Mock active predictions count
  const activePredictions = 6;

  return (
    <>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <Menu.Items className="absolute right-0 mt-2 w-80 origin-top-right rounded-lg bg-brand-navy border border-brand-green/20 shadow-2xl focus:outline-none overflow-hidden z-[60]">
          {/* Connection Status */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-brand-green rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-brand-green">Connected</span>
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <code className="flex-1 font-mono text-sm text-gray-300">
                {address && truncateAddress(address)}
              </code>
              <button
                onClick={copyAddress}
                className="p-1.5 hover:bg-white/10 rounded transition-colors"
                title="Copy address"
              >
                <Copy className="w-4 h-4" />
              </button>
              <a
                href={`https://basescan.org/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 hover:bg-white/10 rounded transition-colors"
                title="View on explorer"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            
            <p className="text-xs text-gray-400">BASE</p>
          </div>

          {/* Balance */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl font-bold text-brand-green">
                ${balance.toLocaleString()} USDC
              </span>
              <span className="text-sm text-gray-400">
                {activePredictions} Active Predictions
              </span>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setDepositWithdrawModal({ isOpen: true, type: 'deposit' })}
                className="flex-1 py-2 bg-brand-green/20 hover:bg-brand-green/30 text-brand-green font-semibold rounded transition-colors text-sm"
              >
                Deposit
              </button>
              <button 
                onClick={() => setDepositWithdrawModal({ isOpen: true, type: 'withdraw' })}
                className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 font-semibold rounded transition-colors text-sm"
              >
                Withdraw
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="p-2">
            <Menu.Item>
              {({ active }) => (
                <Link
                  to="/account"
                  className={`flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                    active ? 'bg-white/10' : ''
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span className="flex-1 text-sm font-medium">My Account</span>
                  <span className="text-gray-500">→</span>
                </Link>
              )}
            </Menu.Item>
            
            <Menu.Item>
              {({ active }) => (
                <Link
                  to="/account"
                  search={{ tab: 'predictions' }}
                  className={`flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                    active ? 'bg-white/10' : ''
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="flex-1 text-sm font-medium">My Predictions</span>
                  <span className="text-gray-500">→</span>
                </Link>
              )}
            </Menu.Item>
            
            <Menu.Item>
              {({ active }) => (
                <Link
                  to="/portfolio"
                  className={`flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                    active ? 'bg-white/10' : ''
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span className="flex-1 text-sm font-medium">Portfolio</span>
                  <span className="text-gray-500">→</span>
                </Link>
              )}
            </Menu.Item>
            
            <Menu.Item>
              {({ active }) => (
                <Link
                  to="/analyst-dashboard"
                  className={`flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                    active ? 'bg-white/10' : ''
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span className="flex-1 text-sm font-medium">Analyst Program</span>
                  <span className="text-gray-500">→</span>
                </Link>
              )}
            </Menu.Item>
            
            <Menu.Item>
              {({ active }) => (
                <Link
                  to="/leaderboard"
                  className={`flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                    active ? 'bg-white/10' : ''
                  }`}
                >
                  <Trophy className="w-4 h-4" />
                  <span className="flex-1 text-sm font-medium">Leaderboard</span>
                  <span className="text-gray-500">→</span>
                </Link>
              )}
            </Menu.Item>
            
            <Menu.Item>
              {({ active }) => (
                <Link
                  to="/account"
                  search={{ tab: 'settings' }}
                  className={`flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                    active ? 'bg-white/10' : ''
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span className="flex-1 text-sm font-medium">Settings</span>
                  <span className="text-gray-500">→</span>
                </Link>
              )}
            </Menu.Item>
          </div>

          {/* Disconnect */}
          <div className="p-2 border-t border-white/10">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={handleDisconnect}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                    active ? 'bg-red-500/10' : ''
                  } ${showDisconnectConfirm ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'text-red-400'}`}
                >
                  <LogOut className="w-4 h-4" />
                  <span className="flex-1 text-left text-sm font-medium">
                    {showDisconnectConfirm ? '⚠️ Click again to confirm' : 'Disconnect Wallet'}
                  </span>
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>

      <DepositWithdrawModal
        isOpen={depositWithdrawModal.isOpen}
        onClose={() => setDepositWithdrawModal({ ...depositWithdrawModal, isOpen: false })}
        type={depositWithdrawModal.type}
      />
    </>
  );
}
