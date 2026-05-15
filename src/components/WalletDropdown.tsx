import { Fragment, useState, type MouseEvent } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import { Copy, ExternalLink, User, BarChart3, Trophy, Settings, LogOut, TrendingUp, KeyRound } from 'lucide-react';
import { useTRPC } from '~/trpc/react';
import { useWallet } from '~/store/useWalletStore';
import { clientChainScopeForTrpc, normalizeWalletForQuery } from '~/utils/walletQuery';
import { usePaperWalletBalance } from '~/hooks/usePaperWalletBalance';
import { formatPaperCashDisplay } from '~/lib/formatPaperCash';
import { explorerAddressUrl, walletNetworkBadgeLabelFromChainId, predictionBalanceFootnote } from '~/lib/economySurface';
import { Link, useNavigate } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import { DepositWithdrawModal } from './DepositWithdrawModal';

interface WalletDropdownProps {
  onClose?: () => void;
}

export function WalletDropdown({ onClose }: WalletDropdownProps) {
  const { address, disconnectWallet, chainId } = useWallet();
  const { cashUsdcSettled: paperCash, isBalanceLoading: paperCashLoading } =
    usePaperWalletBalance();
  const navigate = useNavigate();
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [depositWithdrawModal, setDepositWithdrawModal] = useState<{ isOpen: boolean; type: 'deposit' | 'withdraw' }>({
    isOpen: false,
    type: 'deposit',
  });

  const trpc = useTRPC();
  const walletKey = normalizeWalletForQuery(address);
  const chainScope = clientChainScopeForTrpc(chainId);
  const openPositionsQuery = useQuery({
    ...trpc.getUserPositions.queryOptions({
      walletAddress: walletKey,
      status: 'open',
      clientChainId: chainScope,
    }),
    enabled: !!walletKey,
    staleTime: 30_000,
  });
  const activePredictions = openPositionsQuery.data?.positions.length ?? 0;

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Address copied!');
    }
  };

  const handleDisconnect = (e: MouseEvent<HTMLButtonElement>, close: () => void) => {
    if (showDisconnectConfirm) {
      disconnectWallet();
      toast.success('Wallet disconnected');
      onClose?.();
      setShowDisconnectConfirm(false);
      close();
      setTimeout(() => {
        navigate({ to: '/', replace: true });
      }, 100);
      return;
    }
    // Headless UI closes the menu on MenuItem click by default; unmount resets confirm state.
    // preventDefault keeps the panel open for the second confirmation tap (see Menu docs).
    e.preventDefault();
    setShowDisconnectConfirm(true);
    setTimeout(() => setShowDisconnectConfirm(false), 3000);
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

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
        <Menu.Items
          unmount={false}
          className="absolute right-0 mt-2 w-72 max-h-[min(34rem,88vh)] overflow-y-auto origin-top-right rounded-lg bg-brand-navy border border-brand-green/20 shadow-2xl focus:outline-none z-[60]"
        >
          {/* Connection + address */}
          <div className="px-3 py-2.5 border-b border-white/10">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 shrink-0 bg-brand-green rounded-full animate-pulse" />
                <span className="text-xs font-semibold text-brand-green uppercase tracking-wide">Connected</span>
                <span className="text-[11px] text-gray-500 shrink-0">
                  · {walletNetworkBadgeLabelFromChainId(chainId)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <code className="flex-1 min-w-0 font-mono text-xs text-gray-300 truncate">
                {address && truncateAddress(address)}
              </code>
              <button
                type="button"
                onClick={copyAddress}
                className="p-1.5 hover:bg-white/10 rounded transition-colors shrink-0"
                title="Copy address"
              >
                <Copy className="w-4 h-4" />
              </button>
              <a
                href={address ? explorerAddressUrl(address) : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 hover:bg-white/10 rounded transition-colors shrink-0"
                title="View on explorer"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Balance + actions */}
          <div className="px-3 py-2.5 border-b border-white/10">
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <span className="text-xl font-bold text-brand-green tabular-nums leading-none">
                ${formatPaperCashDisplay(paperCash, paperCashLoading)}
              </span>
              <span className="text-xs text-gray-500 whitespace-nowrap">Paper USDC</span>
            </div>
            <p className="text-[11px] text-gray-500 leading-snug mb-2">{predictionBalanceFootnote()}</p>
            <p className="text-xs text-gray-500 mb-2.5">{activePredictions} active predictions</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDepositWithdrawModal({ isOpen: true, type: 'deposit' })}
                className="flex-1 py-2 bg-brand-green/20 hover:bg-brand-green/30 text-brand-green font-semibold rounded text-xs transition-colors"
              >
                Deposit
              </button>
              <button
                type="button"
                onClick={() => setDepositWithdrawModal({ isOpen: true, type: 'withdraw' })}
                className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 font-semibold rounded text-xs transition-colors"
              >
                Withdraw
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="py-1.5 px-1.5">
            <Menu.Item>
              {({ active }) => (
                <Link
                  to="/account"
                  search={{ tab: 'overview' }}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded transition-colors ${
                    active ? 'bg-white/10' : ''
                  }`}
                >
                  <User className="w-4 h-4 shrink-0 text-gray-400" />
                  <span className="text-sm font-medium truncate">My Account</span>
                </Link>
              )}
            </Menu.Item>

            <Menu.Item>
              {({ active }) => (
                <Link
                  to="/account"
                  search={{ tab: 'predictions' }}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded transition-colors ${
                    active ? 'bg-white/10' : ''
                  }`}
                >
                  <BarChart3 className="w-4 h-4 shrink-0 text-gray-400" />
                  <span className="text-sm font-medium truncate">My Predictions</span>
                </Link>
              )}
            </Menu.Item>

            <Menu.Item>
              {({ active }) => (
                <Link
                  to="/portfolio"
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded transition-colors ${
                    active ? 'bg-white/10' : ''
                  }`}
                >
                  <User className="w-4 h-4 shrink-0 text-gray-400" />
                  <span className="text-sm font-medium truncate">Portfolio</span>
                </Link>
              )}
            </Menu.Item>

            <Menu.Item>
              {({ active }) => (
                <Link
                  to="/analyst-dashboard"
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded transition-colors ${
                    active ? 'bg-white/10' : ''
                  }`}
                >
                  <TrendingUp className="w-4 h-4 shrink-0 text-gray-400" />
                  <span className="text-sm font-medium truncate">Analyst</span>
                </Link>
              )}
            </Menu.Item>

            <Menu.Item>
              {({ active }) => (
                <Link
                  to="/leaderboard"
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded transition-colors ${
                    active ? 'bg-white/10' : ''
                  }`}
                >
                  <Trophy className="w-4 h-4 shrink-0 text-gray-400" />
                  <span className="text-sm font-medium truncate">Leaderboard</span>
                </Link>
              )}
            </Menu.Item>

            <Menu.Item>
              {({ active }) => (
                <Link
                  to="/account"
                  search={{ tab: 'settings' }}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded transition-colors ${
                    active ? 'bg-white/10' : ''
                  }`}
                >
                  <Settings className="w-4 h-4 shrink-0 text-gray-400" />
                  <span className="text-sm font-medium truncate">Settings</span>
                </Link>
              )}
            </Menu.Item>

            <div className="my-1.5 border-t border-white/10" />

            <Menu.Item>
              {({ active }) => (
                <Link
                  to="/developers"
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded transition-colors ${
                    active ? 'bg-white/10' : ''
                  }`}
                >
                  <KeyRound className="w-4 h-4 shrink-0 text-gray-400" />
                  <span className="text-sm font-medium truncate">Developers / API</span>
                </Link>
              )}
            </Menu.Item>
          </div>

          {/* Disconnect */}
          <div className="p-1.5 border-t border-white/10">
            <Menu.Item>
              {({ active, close }) => (
                <button
                  type="button"
                  onClick={(e) => handleDisconnect(e, close)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded transition-colors ${
                    active ? 'bg-red-500/10' : ''
                  } ${showDisconnectConfirm ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'text-red-400'}`}
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left text-sm font-medium">
                    {showDisconnectConfirm ? 'Tap again to confirm' : 'Disconnect'}
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
