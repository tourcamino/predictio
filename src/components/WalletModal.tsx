import { useState, useEffect, useRef, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Check, Loader2, Copy, ExternalLink, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { useWallet } from '~/store/useWalletStore';
import { useNavigate } from '@tanstack/react-router';
import { WALLET_TOAST_IDS, walletToastSuccess } from '~/lib/walletToast';
import {
  BASE_SEPOLIA_FAUCET_URL,
  getExpectedPredictioChain,
  isPredictioTestnet,
  walletModalDepositIntroBody,
  walletModalDepositIntroTitle,
} from '~/lib/economySurface';
import { usePaperWalletBalance } from '~/hooks/usePaperWalletBalance';
import { formatPaperCashDisplay } from '~/lib/formatPaperCash';
import {
  remainingMinDisplayMs,
  WALLET_CONNECTING_MIN_MS,
  WALLET_STAGE_INTERVAL_MS,
  WALLET_SUCCESS_AUTO_CLOSE_MS,
  WALLET_SUCCESS_MIN_MS,
} from '~/lib/walletModalUxTiming';

type ModalStep = 'choose' | 'connecting' | 'success' | 'deposit' | 'error';
type DepositTab = 'bridge' | 'buy' | 'transfer';
type ConnectionStatus = 'requesting' | 'signing' | 'verifying' | 'syncing';

export function WalletModal() {
  const navigate = useNavigate();
  const { isModalOpen, closeWalletModal, connectWallet, isConnecting, isConnected, address, walletType } = useWallet();
  const {
    cashUsdcSettled: modalPaperCash,
    isBalanceLoading: modalPaperLoading,
  } = usePaperWalletBalance();
  const [step, setStep] = useState<ModalStep>('choose');
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [depositTab, setDepositTab] = useState<DepositTab>('bridge');
  const [showWalletInfo, setShowWalletInfo] = useState(false);
  const [autoCloseProgress, setAutoCloseProgress] = useState(100);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('requesting');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const connectingSinceRef = useRef<number | null>(null);
  const successSinceRef = useRef<number | null>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isModalOpen) {
      setTimeout(() => {
        setStep('choose');
        setSelectedWallet('');
        setAutoCloseProgress(100);
        setConnectionStatus('requesting');
        setErrorMessage('');
        connectingSinceRef.current = null;
        successSinceRef.current = null;
      }, 300);
    }
  }, [isModalOpen]);

  // Visual stage progression while connecting (does not block real wallet I/O)
  useEffect(() => {
    if (!isModalOpen || step !== 'connecting') return;

    const stages: ConnectionStatus[] = ['requesting', 'signing', 'verifying', 'syncing'];
    let currentStage = 0;
    setConnectionStatus(stages[0]!);

    const interval = setInterval(() => {
      currentStage += 1;
      if (currentStage < stages.length) {
        setConnectionStatus(stages[currentStage]!);
      } else {
        clearInterval(interval);
      }
    }, WALLET_STAGE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isModalOpen, step, selectedWallet]);

  useEffect(() => {
    if (!isModalOpen) return;
    if (isConnecting && step === 'choose') {
      connectingSinceRef.current = Date.now();
      setConnectionStatus('requesting');
      setStep('connecting');
    }
  }, [isModalOpen, isConnecting, step]);

  // Minimum visible duration for connecting step before success
  useEffect(() => {
    if (!isModalOpen || step !== 'connecting') return;
    if (isConnecting || !isConnected) return;

    const delay = remainingMinDisplayMs(
      connectingSinceRef.current,
      WALLET_CONNECTING_MIN_MS,
    );
    const timer = setTimeout(() => {
      setStep('success');
      successSinceRef.current = Date.now();
      setAutoCloseProgress(100);
    }, delay);

    return () => clearTimeout(timer);
  }, [isModalOpen, step, isConnecting, isConnected]);

  // Success screen + auto-close (visual timing only)
  useEffect(() => {
    if (!isModalOpen || step !== 'success') return;
    if (modalPaperLoading || modalPaperCash == null || modalPaperCash <= 0) return;

    const holdDelay = remainingMinDisplayMs(successSinceRef.current, WALLET_SUCCESS_MIN_MS);
    let progress = 100;
    let tickInterval: ReturnType<typeof setInterval> | undefined;

    const holdTimer = setTimeout(() => {
      const ticks = Math.max(12, Math.round(WALLET_SUCCESS_AUTO_CLOSE_MS / 100));
      tickInterval = setInterval(() => {
        progress -= 100 / ticks;
        setAutoCloseProgress(progress);
        if (progress <= 0) {
          clearInterval(tickInterval);
          closeWalletModal();
        }
      }, 100);
    }, holdDelay);

    return () => {
      clearTimeout(holdTimer);
      if (tickInterval) clearInterval(tickInterval);
    };
  }, [isModalOpen, step, modalPaperCash, modalPaperLoading, closeWalletModal]);

  const handleWalletSelect = async (wallet: string) => {
    setSelectedWallet(wallet);
    setErrorMessage('');
    connectingSinceRef.current = Date.now();
    setConnectionStatus('requesting');
    setStep('connecting');

    try {
      await connectWallet(wallet);
    } catch (error) {
      setStep('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to connect wallet');
    }
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      walletToastSuccess('Address copied', { id: WALLET_TOAST_IDS.addressCopied });
    }
  };

  const wallets = [
    { id: 'metamask', name: 'MetaMask', icon: '🦊', description: 'Browser extension & mobile', popular: true },
    { id: 'coinbase', name: 'Coinbase Wallet', icon: '🔵', description: 'Easy for beginners', popular: false },
    { id: 'walletconnect', name: 'WalletConnect', icon: '👛', description: '300+ wallets via QR code', popular: false },
    { id: 'rainbow', name: 'Rainbow', icon: '🌈', description: 'Beautiful mobile wallet', popular: false },
    { id: 'trust', name: 'Trust Wallet', icon: '🛡️', description: 'Mobile-first security', popular: false },
    { id: 'safe', name: 'Safe (Gnosis Safe)', icon: '🔐', description: 'Multi-sig security', popular: false },
    { id: 'ledger', name: 'Ledger', icon: '🔒', description: 'Hardware wallet security', popular: false },
    { id: 'argent', name: 'Argent', icon: '⚡', description: 'Smart contract wallet', popular: false },
    { id: 'taho', name: 'Taho (Tally Ho)', icon: '🦝', description: 'Community-owned wallet', popular: false },
    { id: 'phantom', name: 'Phantom', icon: '👻', description: 'Multi-chain support', popular: false },
  ];

  const bridgeOptions = [
    { name: 'Jumper Exchange', badge: 'Recommended', description: 'Fast, low fees', url: 'https://jumper.exchange' },
    { name: 'Across Protocol', badge: 'Fast', description: 'Cross-chain bridge', url: 'https://across.to' },
    { name: 'Stargate', badge: '', description: 'Multi-chain', url: 'https://stargate.finance' },
  ];

  const buyOptions = [
    { name: 'MoonPay', description: 'Credit card, bank transfer', url: 'https://moonpay.com' },
    { name: 'Transak', description: '50+ payment methods', url: 'https://transak.com' },
    { name: 'Ramp Network', description: 'Best rates in EU', url: 'https://ramp.network' },
  ];

  const getConnectionStatusMessage = () => {
    switch (connectionStatus) {
      case 'requesting':
        return 'Requesting connection...';
      case 'signing':
        return 'Please sign the message in your wallet';
      case 'verifying':
        return 'Verifying signature...';
      case 'syncing':
        return 'Syncing balance...';
      default:
        return 'Connecting...';
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'requesting':
        return <Loader2 className="w-24 h-24 text-brand-green animate-spin" />;
      case 'signing':
        return <div className="w-24 h-24 rounded-full border-4 border-brand-green border-t-transparent animate-spin" />;
      case 'verifying':
        return <Loader2 className="w-24 h-24 text-brand-green animate-spin" />;
      case 'syncing':
        return <div className="w-24 h-24 rounded-full bg-brand-green/20 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-brand-green/40 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-brand-green animate-pulse" />
          </div>
        </div>;
      default:
        return <Loader2 className="w-24 h-24 text-brand-green animate-spin" />;
    }
  };

  return (
    <Transition appear show={isModalOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[9999]" onClose={closeWalletModal}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-0 sm:p-4 md:p-6">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-250"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full h-full sm:h-auto sm:max-w-md md:max-w-lg transform overflow-hidden sm:rounded-xl bg-brand-navy border-0 sm:border border-brand-green/30 shadow-2xl transition-all">
                {/* Close button */}
                <button
                  onClick={closeWalletModal}
                  className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Step 1: Choose Wallet */}
                {step === 'choose' && (
                  <div className="p-6 md:p-8">
                    <Dialog.Title className="font-syne text-2xl md:text-3xl font-bold mb-2">
                      Connect wallet
                    </Dialog.Title>
                    <p className="text-gray-400 mb-6">
                      Sign in with your wallet for server-synced <strong className="text-white/90">paper</strong> trading
                      {isPredictioTestnet()
                        ? ` on ${getExpectedPredictioChain().shortLabel} (testnet — no real funds).`
                        : " on Base. Guest demo stays in this browser only."}
                    </p>

                    <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto pr-2">
                      {wallets.map((wallet) => (
                        <button
                          key={wallet.id}
                          onClick={() => handleWalletSelect(wallet.id)}
                          className="w-full p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-brand-green/8 hover:border-brand-green/30 transition-all duration-150 flex items-center gap-4 group"
                        >
                          <span className="text-3xl">{wallet.icon}</span>
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{wallet.name}</span>
                              {wallet.popular && (
                                <span className="px-2 py-0.5 bg-brand-green/20 text-brand-green text-xs font-bold rounded">
                                  POPULAR
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400">{wallet.description}</p>
                          </div>
                          <ExternalLink className="w-5 h-5 text-gray-500 group-hover:text-brand-green transition-colors" />
                        </button>
                      ))}
                    </div>

                    {/* New to crypto accordion */}
                    <button
                      onClick={() => setShowWalletInfo(!showWalletInfo)}
                      className="w-full flex items-center justify-between text-sm text-gray-400 hover:text-brand-green transition-colors mb-2"
                    >
                      <span>New to crypto wallets?</span>
                      {showWalletInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    
                    {showWalletInfo && (
                      <div className="p-4 bg-white/5 rounded-lg text-sm text-gray-400 leading-relaxed mb-6 animate-slide-down">
                        <p className="mb-3">
                          A wallet is like your crypto bank account. It stores your USDC and lets you interact with Predictio without sharing personal info. We recommend MetaMask for beginners.
                        </p>
                        <a
                          href="https://metamask.io"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-green hover:underline inline-flex items-center gap-1"
                        >
                          Get MetaMask <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="pt-6 border-t border-white/10 space-y-3">
                      <p className="text-xs text-gray-500 text-center">
                        By connecting, you agree to our Terms of Service and Privacy Policy
                      </p>
                      <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                        <span>🔒</span>
                        <span>Non-custodial · We never hold your funds · No KYC required</span>
                      </div>
                      <p className="text-xs text-center text-purple-400">
                        💡 Demo balance ($1,000 virtual USDC) is local until you connect a wallet
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 2: Connecting */}
                {step === 'connecting' && (
                  <div className="p-6 md:p-8 text-center">
                    <div className="mb-6 flex justify-center">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-brand-green/10 flex items-center justify-center">
                          <span className="text-4xl">
                            {wallets.find(w => w.id === selectedWallet)?.icon}
                          </span>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          {getConnectionStatusIcon()}
                        </div>
                      </div>
                    </div>

                    <Dialog.Title className="font-syne text-2xl font-bold mb-2">
                      Connecting to {wallets.find(w => w.id === selectedWallet)?.name}
                    </Dialog.Title>
                    <p className="text-gray-400 mb-4">
                      {getConnectionStatusMessage()}
                    </p>

                    {/* Connection progress steps */}
                    <div className="mb-8 space-y-2">
                      {(['requesting', 'signing', 'verifying', 'syncing'] as ConnectionStatus[]).map((status, index) => {
                        const isActive = connectionStatus === status;
                        const isComplete = ['requesting', 'signing', 'verifying', 'syncing'].indexOf(connectionStatus) > index;
                        
                        return (
                          <div
                            key={status}
                            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                              isActive ? 'bg-brand-green/10 border border-brand-green/30' : 'bg-white/5'
                            }`}
                          >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              isComplete ? 'bg-brand-green' : isActive ? 'bg-brand-green/50' : 'bg-white/10'
                            }`}>
                              {isComplete ? (
                                <Check className="w-4 h-4 text-black" />
                              ) : isActive ? (
                                <Loader2 className="w-4 h-4 text-white animate-spin" />
                              ) : (
                                <span className="text-xs text-gray-400">{index + 1}</span>
                              )}
                            </div>
                            <span className={`text-sm ${isActive ? 'text-brand-green font-semibold' : 'text-gray-400'}`}>
                              {status === 'requesting' && 'Requesting connection'}
                              {status === 'signing' && 'Waiting for signature'}
                              {status === 'verifying' && 'Verifying identity'}
                              {status === 'syncing' && 'Syncing balance'}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => {
                        setStep('choose');
                        closeWalletModal();
                      }}
                      className="px-6 py-2 border border-red-500/50 text-red-500 rounded-lg hover:bg-red-500/10 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Step 3: Success */}
                {step === 'success' && (
                  <div className="p-6 md:p-8 text-center">
                    <div className="mb-6 flex justify-center">
                      <div className="w-20 h-20 rounded-full bg-brand-green/20 flex items-center justify-center">
                        <Check className="w-10 h-10 text-brand-green animate-checkmark" />
                      </div>
                    </div>

                    <Dialog.Title className="font-syne text-2xl md:text-3xl font-bold mb-2">
                      Wallet Connected! 🎉
                    </Dialog.Title>

                    <div className="mt-6 space-y-4">
                      <div className="p-4 bg-white/5 rounded-lg">
                        <p className="text-sm text-gray-400 mb-1">Wallet Address</p>
                        <p className="font-mono text-sm">{address}</p>
                      </div>

                      <div className="p-4 bg-white/5 rounded-lg">
                        <p className="text-sm text-gray-400 mb-1">Balance</p>
                        <p className="text-2xl font-bold text-brand-green">
                          ${formatPaperCashDisplay(modalPaperCash, modalPaperLoading)} paper USDC
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Predictio account balance — not your wallet&apos;s on-chain USDC.
                        </p>
                      </div>

                      <div className="p-4 bg-white/5 rounded-lg">
                        <p className="text-sm text-gray-400 mb-1">Network</p>
                        <p className="font-semibold">{getExpectedPredictioChain().shortLabel} ✓</p>
                      </div>
                    </div>

                    {!modalPaperLoading && modalPaperCash === 0 ? (
                      <div className="mt-6 space-y-3">
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-500">
                          No paper balance synced yet. You can still browse markets — add test funds from a faucet if you need on-chain gas on {getExpectedPredictioChain().shortLabel}.
                        </div>
                        <button
                          onClick={() => setStep('deposit')}
                          className="w-full py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors"
                        >
                          Deposit USDC
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            closeWalletModal();
                            navigate({ to: '/markets' });
                          }}
                          className="w-full py-3 border border-white/20 rounded-lg hover:bg-white/5 transition-colors"
                        >
                          Explore Markets First →
                        </button>
                      </div>
                    ) : (
                      <div className="mt-6 space-y-3">
                        <button
                          type="button"
                          onClick={() => {
                            closeWalletModal();
                            navigate({ to: '/markets' });
                          }}
                          className="w-full py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors"
                        >
                          Start Predicting →
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            closeWalletModal();
                            navigate({ to: '/portfolio' });
                          }}
                          className="w-full py-3 border border-white/20 rounded-lg hover:bg-white/5 transition-colors"
                        >
                          View Portfolio →
                        </button>
                        
                        {/* Auto-close progress */}
                        <div className="mt-4">
                          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-green transition-all duration-100"
                              style={{ width: `${autoCloseProgress}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-2">Auto-closing in 1.5s...</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: Error */}
                {step === 'error' && (
                  <div className="p-6 md:p-8 text-center">
                    <div className="mb-6 flex justify-center">
                      <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
                        <AlertCircle className="w-10 h-10 text-red-500" />
                      </div>
                    </div>

                    <Dialog.Title className="font-syne text-2xl font-bold mb-2">
                      Connection Failed
                    </Dialog.Title>
                    <p className="text-gray-400 mb-6">
                      {errorMessage || 'Unable to connect to your wallet. Please try again.'}
                    </p>

                    <div className="space-y-3">
                      <button
                        onClick={() => {
                          setStep('choose');
                          setErrorMessage('');
                        }}
                        className="w-full py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors"
                      >
                        Try Again
                      </button>
                      <button
                        onClick={closeWalletModal}
                        className="w-full py-3 border border-white/20 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        Close
                      </button>
                    </div>

                    <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-left">
                      <p className="font-semibold mb-2">Common issues:</p>
                      <ul className="space-y-1 text-gray-400 text-xs">
                        <li>• Make sure your wallet extension is unlocked</li>
                        <li>• Check that you&apos;re on {getExpectedPredictioChain().shortLabel}</li>
                        <li>• Try refreshing the page and connecting again</li>
                        <li>• Ensure your wallet software is up to date</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Step 5: Deposit */}
                {step === 'deposit' && (
                  <div className="p-6 md:p-8">
                    <Dialog.Title className="font-syne text-2xl md:text-3xl font-bold mb-2">
                      {walletModalDepositIntroTitle()}
                    </Dialog.Title>
                    <p className="text-gray-400 mb-4">{walletModalDepositIntroBody()}</p>
                    {isPredictioTestnet() && (
                      <div className="mb-6 rounded-lg border border-amber-500/35 bg-amber-500/10 p-4 text-sm text-amber-100/95">
                        <p className="font-semibold text-amber-200 mb-1">Sepolia ETH (gas)</p>
                        <p className="text-xs text-amber-100/85 mb-3">
                          Use an official Base Sepolia faucet. Test tokens have no cash value.
                        </p>
                        <a
                          href={BASE_SEPOLIA_FAUCET_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-xs font-bold text-amber-200 hover:text-white underline"
                        >
                          Open Base Sepolia faucet
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}

                    {/* Tabs */}
                    <div className="flex gap-2 mb-6 border-b border-white/10">
                      {(['bridge', 'buy', 'transfer'] as DepositTab[]).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setDepositTab(tab)}
                          className={`px-4 py-2 font-semibold capitalize transition-colors ${
                            depositTab === tab
                              ? 'text-brand-green border-b-2 border-brand-green'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    {/* Bridge Tab */}
                    {depositTab === 'bridge' && (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-400 mb-4">
                          Already have USDC on Ethereum or another chain? Bridge it to {getExpectedPredictioChain().shortLabel}.
                        </p>
                        {bridgeOptions.map((option) => (
                          <a
                            key={option.name}
                            href={option.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-brand-green/8 hover:border-brand-green/30 transition-all group"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold">{option.name}</span>
                                  {option.badge && (
                                    <span className="px-2 py-0.5 bg-brand-green/20 text-brand-green text-xs font-bold rounded">
                                      {option.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-400">{option.description}</p>
                              </div>
                              <ExternalLink className="w-5 h-5 text-gray-500 group-hover:text-brand-green transition-colors" />
                            </div>
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Buy Tab */}
                    {depositTab === 'buy' && (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-400 mb-4">
                          Buy USDC directly with your credit card or bank transfer.
                        </p>
                        {buyOptions.map((option) => (
                          <a
                            key={option.name}
                            href={option.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-brand-green/8 hover:border-brand-green/30 transition-all group"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold mb-1">{option.name}</p>
                                <p className="text-sm text-gray-400">{option.description}</p>
                              </div>
                              <ExternalLink className="w-5 h-5 text-gray-500 group-hover:text-brand-green transition-colors" />
                            </div>
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Transfer Tab */}
                    {depositTab === 'transfer' && (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-400 mb-4">
                          Already have USDC on {getExpectedPredictioChain().shortLabel}? Send it to your wallet.
                        </p>
                        
                        <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                          <p className="text-sm text-gray-400 mb-2">Your Wallet Address</p>
                          <div className="flex items-center gap-2 mb-3">
                            <code className="flex-1 p-3 bg-black/30 rounded font-mono text-sm break-all">
                              {address}
                            </code>
                            <button
                              onClick={copyAddress}
                              className="p-3 bg-brand-green/20 hover:bg-brand-green/30 rounded transition-colors"
                            >
                              <Copy className="w-5 h-5 text-brand-green" />
                            </button>
                          </div>
                          
                          {/* Simple QR placeholder */}
                          <div className="flex justify-center my-4">
                            <div className="w-48 h-48 bg-white rounded-lg p-4 flex items-center justify-center">
                              <div className="text-center text-black text-xs font-mono break-all">
                                {address?.slice(0, 20)}...
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-500">
                          ⚠️ Only send USDC on {getExpectedPredictioChain().shortLabel} to this address.
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        closeWalletModal();
                        navigate({ to: '/markets' });
                      }}
                      className="w-full mt-6 py-3 border border-white/20 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      I'll do this later — Explore Markets →
                    </button>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
