import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import toast from 'react-hot-toast';
import { getExpectedChainId } from '~/config/chains';
import { getInjectedEip1193Provider } from '~/lib/wallet/injectedProvider';
import {
  formatWalletSwitchUserMessage,
  readChainIdDecimal,
  switchToPredictioChain,
} from '~/lib/wallet/switchToPredictioChain';

export interface Transaction {
  id: string;
  type: 'buy' | 'sell' | 'claim' | 'deposit' | 'withdraw' | 'send' | 'refund';
  status: 'pending' | 'confirmed' | 'failed';
  amountUsdc: number;
  description: string;
  marketId?: string;
  txHash?: string;
  gasUsed?: number;
  timestamp: Date;
  feePaid?: number;
}

export interface Deposit {
  id: string;
  method: 'direct' | 'moonpay' | 'bridge';
  amount: number;
  sourceChain?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  expectedArrival?: Date;
  txHash?: string;
}

export interface Withdrawal {
  id: string;
  amount: number;
  toAddress: string;
  status: 'pending' | 'confirmed' | 'failed';
  txHash?: string;
  timestamp: Date;
}

export interface ResolvedMarket {
  marketId: string;
  marketName: string;
  outcome: string;
  userOutcome: string;
  won: boolean;
  claimableAmount: number;
  /** Present once the market has a firm resolution timestamp (persisted dates may omit). */
  resolvedAt?: Date;
  claimStatus: 'claimable' | 'claimed' | 'expired';
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: number; // USDC balance (total)
  balanceUsdc: number; // Same as balance, for consistency
  balanceUsdcAvailable: number; // not in positions
  balanceUsdcInPositions: number;
  balanceEth: number; // ETH for gas
  balanceEthUsd: number; // ETH value in USD
  isConnecting: boolean;
  isSyncing: boolean; // Track wallet sync status
  walletType: string | null; // 'metamask' | 'coinbase' | 'walletconnect' | 'rainbow' | 'ledger'
  isModalOpen: boolean;
  isOnboarded: boolean;
  wrongNetwork: boolean;
  /** Active wallet chain when injected provider is used; null if unknown / mock */
  chainId: number | null;
  switchNetworkPending: boolean;
  referralCode: string | null; // Store the referral code
  
  // Pending transactions
  pendingDeposits: Deposit[];
  pendingWithdrawals: Withdrawal[];
  pendingClaims: string[]; // marketIds
  
  // History
  transactions: Transaction[];
  recentRecipients: string[]; // Recent withdrawal addresses
  
  // Resolved markets awaiting claim
  resolvedMarkets: ResolvedMarket[];
}

interface WalletStore extends WalletState {
  connectWallet: (walletType: string) => Promise<void>;
  disconnectWallet: () => void;
  openWalletModal: () => void;
  closeWalletModal: () => void;
  setOnboarded: (value: boolean) => void;
  setSyncing: (value: boolean) => void;
  switchNetwork: () => Promise<void>;
  refreshChainFromProvider: () => Promise<void>;
  deposit: (amount: number) => Promise<{ success: boolean; txHash: string }>;
  withdraw: (amount: number, toAddress: string) => Promise<{ success: boolean; txHash: string }>;
  updateBalance: (newBalance: number) => void;
  refreshBalances: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => void;
  addRecentRecipient: (address: string) => void;
  claimWinnings: (marketId: string) => Promise<{ success: boolean; txHash: string; amount: number }>;
  batchClaimWinnings: (marketIds: string[]) => Promise<{ success: boolean; txHash: string; amount: number }>;
  updateResolvedMarkets: (markets: ResolvedMarket[]) => void;
}

export const useWalletStore = create<WalletStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isConnected: false,
      address: null,
      balance: 0,
      balanceUsdc: 0,
      balanceUsdcAvailable: 0,
      balanceUsdcInPositions: 0,
      balanceEth: 0,
      balanceEthUsd: 0,
      isConnecting: false,
      isSyncing: false,
      walletType: null,
      isModalOpen: false,
      isOnboarded: false,
      wrongNetwork: false,
      chainId: null,
      switchNetworkPending: false,
      referralCode: null,
      pendingDeposits: [],
      pendingWithdrawals: [],
      pendingClaims: [],
      transactions: [],
      recentRecipients: [],
      resolvedMarkets: [],

      // Connect: prefer injected EIP-1193 (MetaMask / Coinbase). Optional mock via VITE_WALLET_MOCK_CONNECT=1.
      connectWallet: async (walletType: string) => {
        set({ isConnecting: true });
        await new Promise((resolve) => setTimeout(resolve, 220));

        const referralCode = localStorage.getItem("predictio-referral-code");
        const referralTimestamp = localStorage.getItem("predictio-referral-timestamp");
        const isReferralValid = Boolean(
          referralCode &&
            referralTimestamp &&
            Date.now() - parseInt(referralTimestamp, 10) < 30 * 24 * 60 * 60 * 1000,
        );

        const allowMock = import.meta.env.VITE_WALLET_MOCK_CONNECT === "1";
        const provider = getInjectedEip1193Provider(walletType);

        if (!provider) {
          if (allowMock || import.meta.env.DEV) {
            const mockAddress = "0x7f3a8b2c4e2b9f1a6d5c8e7f9a2b4c6d8e0f1a3b";
            const mockEthBalance = 0.0423;
            const mockEthPrice = 2600;
            const virtualBalance = 1000.0;
            set({
              isConnected: true,
              address: mockAddress,
              balance: virtualBalance,
              balanceUsdc: virtualBalance,
              balanceUsdcAvailable: virtualBalance,
              balanceUsdcInPositions: 0,
              balanceEth: mockEthBalance,
              balanceEthUsd: mockEthBalance * mockEthPrice,
              walletType,
              isConnecting: false,
              isModalOpen: true,
              wrongNetwork: false,
              chainId: null,
              switchNetworkPending: false,
              referralCode: isReferralValid ? referralCode : null,
            });
            if (isReferralValid && referralCode) {
              console.log(
                `[REFERRAL] User ${mockAddress} connected with referral code: ${referralCode}`,
              );
            }
            console.log(
              `[Paper Trading] Dev mock wallet connected: ${mockAddress}${allowMock ? " (VITE_WALLET_MOCK_CONNECT=1)" : " (no injected wallet in dev)"}`,
            );
            return;
          }

          set({ isConnecting: false });
          const wt = walletType.toLowerCase();
          const hint =
            wt === "metamask"
              ? "MetaMask is not available in this browser. Install the extension or open Predictio inside the MetaMask app browser."
              : wt === "walletconnect"
                ? "WalletConnect is not enabled in this build yet. Use MetaMask or Coinbase Wallet in the browser."
                : "No compatible injected wallet found for this option. Try MetaMask or Coinbase Wallet.";
          throw new Error(hint);
        }

        try {
          const accounts = (await provider.request({
            method: "eth_requestAccounts",
          })) as string[];
          if (!accounts?.length) {
            throw new Error("No accounts returned from your wallet.");
          }
          const address = accounts[0]!.toLowerCase();
          const cid = await readChainIdDecimal(provider);
          const expected = getExpectedChainId();
          const wrong = cid != null && cid !== expected;

          set({
            isConnected: true,
            address,
            balance: 0,
            balanceUsdc: 0,
            balanceUsdcAvailable: 0,
            balanceUsdcInPositions: 0,
            balanceEth: 0,
            balanceEthUsd: 0,
            walletType,
            isConnecting: false,
            isModalOpen: true,
            wrongNetwork: wrong,
            chainId: cid,
            switchNetworkPending: false,
            referralCode: isReferralValid ? referralCode : null,
          });

          if (isReferralValid && referralCode) {
            console.log(
              `[REFERRAL] User ${address} connected with referral code: ${referralCode}`,
            );
          }
          console.log(
            `[Wallet] Connected ${address} chainId=${cid ?? "?"} expected=${expected} wrongNetwork=${wrong}`,
          );
        } catch (e) {
          set({ isConnecting: false });
          throw e instanceof Error ? e : new Error("Could not connect wallet");
        }
      },

      // Disconnect wallet - FORCED CLEANUP
      disconnectWallet: () => {
        console.log('[WALLET] Starting forced disconnect...');
        
        // Step 1: Call any wallet SDK disconnect methods
        // In a real implementation, this would call wagmi's disconnect() or similar
        try {
          if (window.ethereum?.disconnect) {
            window.ethereum.disconnect();
          }
        } catch (error) {
          console.warn('[WALLET] SDK disconnect not available or failed:', error);
        }

        // Step 2: Clear ALL localStorage keys (aggressive cleanup)
        const keysToRemove = [
          'predictio-wallet',
          'predictio-referral-code',
          'predictio-referral-timestamp',
          'wagmi.store',
          'wagmi.cache',
          'wagmi.connected',
          'wagmi.wallet',
          'walletconnect',
          'WALLETCONNECT_DEEPLINK_CHOICE',
          'wc@2:client:0.3//session',
          'wc@2:core:0.3//subscription',
          'wc@2:core:0.3//messages',
          'wc@2:ethereum_provider:/chainId',
          'wc@2:ethereum_provider:/rpc',
        ];
        
        // Remove known keys
        keysToRemove.forEach(key => {
          try {
            localStorage.removeItem(key);
          } catch (e) {
            console.warn(`[WALLET] Failed to remove ${key}:`, e);
          }
        });
        
        // Also scan and remove any keys that start with wallet-related prefixes
        const prefixesToClear = ['wc@', 'wagmi', 'walletconnect', 'predictio'];
        try {
          Object.keys(localStorage).forEach(key => {
            if (prefixesToClear.some(prefix => key.toLowerCase().startsWith(prefix.toLowerCase()))) {
              localStorage.removeItem(key);
            }
          });
        } catch (e) {
          console.warn('[WALLET] Error clearing prefixed keys:', e);
        }
        
        // Step 3: Clear ALL sessionStorage (nuclear option)
        try {
          sessionStorage.clear();
        } catch (e) {
          console.warn('[WALLET] Failed to clear sessionStorage:', e);
        }
        
        // Step 4: Force reset ALL state to initial values immediately
        const reset: Partial<WalletState> = {
          isConnected: false,
          address: null,
          balance: 0,
          balanceUsdc: 0,
          balanceUsdcAvailable: 0,
          balanceUsdcInPositions: 0,
          balanceEth: 0,
          balanceEthUsd: 0,
          walletType: null,
          wrongNetwork: false,
          isModalOpen: false,
          referralCode: null,
          isConnecting: false,
          isSyncing: false,
          isOnboarded: false,
          chainId: null,
          switchNetworkPending: false,
          pendingDeposits: [],
          pendingWithdrawals: [],
          pendingClaims: [],
          transactions: [],
          recentRecipients: [],
          resolvedMarkets: [],
        };
        set(reset);
        
        console.log('[WALLET] Disconnect complete - all state cleared');
      },

      // Modal controls
      openWalletModal: () => set({ isModalOpen: true }),
      closeWalletModal: () => set({ isModalOpen: false, isConnecting: false }),

      // Onboarding
      setOnboarded: (value: boolean) => set({ isOnboarded: value }),

      // Set syncing status
      setSyncing: (value: boolean) => set({ isSyncing: value }),

      // Network switch / refresh (EIP-1193)
      refreshChainFromProvider: async () => {
        const { walletType, isConnected } = get();
        if (!isConnected || !walletType) return;
        const provider = getInjectedEip1193Provider(walletType);
        if (!provider) return;
        const cid = await readChainIdDecimal(provider);
        const expected = getExpectedChainId();
        set({
          chainId: cid,
          wrongNetwork: cid != null && cid !== expected,
        });
      },

      switchNetwork: async () => {
        const { walletType, switchNetworkPending } = get();
        if (switchNetworkPending) return;
        const provider = walletType ? getInjectedEip1193Provider(walletType) : null;
        if (!provider) {
          toast.error(
            "No browser wallet found. Install MetaMask / Coinbase Wallet or open Predictio inside your wallet app.",
            { id: "predictio-no-provider", duration: 5000 },
          );
          return;
        }
        set({ switchNetworkPending: true });
        try {
          await switchToPredictioChain(provider);
          const cid = await readChainIdDecimal(provider);
          const expected = getExpectedChainId();
          const ok = cid === expected;
          set({ chainId: cid, wrongNetwork: !ok });
          if (ok) {
            toast.success("Network updated", { id: "predictio-net-ok", duration: 2500 });
          }
        } catch (e) {
          toast.error(formatWalletSwitchUserMessage(e), {
            id: "predictio-net-err",
            duration: 5500,
          });
        } finally {
          set({ switchNetworkPending: false });
        }
      },

      // Deposit USDC
      deposit: async (amount: number) => {
        const state = get();
        if (!state.address) {
          throw new Error('Wallet not connected');
        }

        // This will be called from the UI after the tRPC mutation succeeds
        // The UI will handle the actual tRPC call and transaction flow
        return { success: true, txHash: '0x...' };
      },

      // Withdraw USDC
      withdraw: async (amount: number, toAddress: string) => {
        const state = get();
        if (!state.address) {
          throw new Error('Wallet not connected');
        }
        if (amount > state.balance) {
          throw new Error('Insufficient balance');
        }

        // This will be called from the UI after the tRPC mutation succeeds
        // The UI will handle the actual tRPC call and transaction flow
        return { success: true, txHash: '0x...' };
      },

      // Update balance (called after successful deposit/withdraw)
      updateBalance: (newBalance: number) => {
        set({ balance: newBalance });
      },

      // Refresh balances from chain
      refreshBalances: async () => {
        const state = get();
        if (!state.address) return;
        
        await new Promise(resolve => setTimeout(resolve, 120));
        
        // In production, this would fetch from blockchain
        const mockBalance = state.balance + (Math.random() - 0.5) * 10;
        const mockEthBalance = state.balanceEth + (Math.random() - 0.5) * 0.01;
        const mockEthPrice = 2600;
        
        set({
          balance: Math.max(0, mockBalance),
          balanceUsdc: Math.max(0, mockBalance),
          balanceUsdcAvailable: Math.max(0, mockBalance * 0.88),
          balanceUsdcInPositions: Math.max(0, mockBalance * 0.12),
          balanceEth: Math.max(0, mockEthBalance),
          balanceEthUsd: Math.max(0, mockEthBalance * mockEthPrice),
        });
      },

      // Refresh transaction history
      refreshTransactions: async () => {
        // Mock: in production, fetch from API/blockchain
        await new Promise(resolve => setTimeout(resolve, 80));
        console.log('[Wallet] Transactions refreshed');
      },

      // Add transaction to history
      addTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => {
        const newTransaction: Transaction = {
          ...transaction,
          id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
        };
        
        set((state) => ({
          transactions: [newTransaction, ...state.transactions].slice(0, 100), // Keep last 100
        }));
      },

      // Add recent recipient address
      addRecentRecipient: (address: string) => {
        set((state) => {
          const recipients = [address, ...state.recentRecipients.filter(a => a !== address)];
          return {
            recentRecipients: recipients.slice(0, 5), // Keep last 5
          };
        });
      },

      // Claim winnings from a resolved market
      claimWinnings: async (marketId: string) => {
        const state = get();
        if (!state.address) {
          throw new Error('Wallet not connected');
        }
        
        const market = state.resolvedMarkets.find(m => m.marketId === marketId);
        if (!market || market.claimStatus !== 'claimable') {
          throw new Error('Market not claimable');
        }
        
        // Mock execution
        await new Promise(resolve => setTimeout(resolve, 450));
        
        const mockTxHash = `0x${Array.from({ length: 64 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join('')}`;
        
        // Update balance
        const newBalance = state.balance + market.claimableAmount;
        set({
          balance: newBalance,
          balanceUsdc: newBalance,
          balanceUsdcAvailable: newBalance * 0.88,
          balanceUsdcInPositions: newBalance * 0.12,
          resolvedMarkets: state.resolvedMarkets.map(m =>
            m.marketId === marketId ? { ...m, claimStatus: 'claimed' as const } : m
          ),
        });
        
        // Add transaction
        get().addTransaction({
          type: 'claim',
          status: 'confirmed',
          amountUsdc: market.claimableAmount,
          description: market.marketName,
          marketId,
          txHash: mockTxHash,
        });
        
        return { success: true, txHash: mockTxHash, amount: market.claimableAmount };
      },

      // Batch claim winnings from multiple resolved markets
      batchClaimWinnings: async (marketIds: string[]) => {
        const state = get();
        if (!state.address) {
          throw new Error('Wallet not connected');
        }
        
        const claimableMarkets = state.resolvedMarkets.filter(
          m => marketIds.includes(m.marketId) && m.claimStatus === 'claimable'
        );
        
        if (claimableMarkets.length === 0) {
          throw new Error('No claimable markets');
        }
        
        const totalAmount = claimableMarkets.reduce((sum, m) => sum + m.claimableAmount, 0);
        
        // Mock execution (longer delay for batch)
        await new Promise(resolve => setTimeout(resolve, 550));
        
        const mockTxHash = `0x${Array.from({ length: 64 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join('')}`;
        
        // Update balance
        const newBalance = state.balance + totalAmount;
        set({
          balance: newBalance,
          balanceUsdc: newBalance,
          balanceUsdcAvailable: newBalance * 0.88,
          balanceUsdcInPositions: newBalance * 0.12,
          resolvedMarkets: state.resolvedMarkets.map(m =>
            marketIds.includes(m.marketId) ? { ...m, claimStatus: 'claimed' as const } : m
          ),
        });
        
        // Add transaction
        get().addTransaction({
          type: 'claim',
          status: 'confirmed',
          amountUsdc: totalAmount,
          description: `Batch claim: ${claimableMarkets.length} markets`,
          txHash: mockTxHash,
        });
        
        return { success: true, txHash: mockTxHash, amount: totalAmount };
      },

      // Update resolved markets list
      updateResolvedMarkets: (markets: ResolvedMarket[]) => {
        set({ resolvedMarkets: markets });
      },
    }),
    {
      name: 'predictio-wallet',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        address: state.address,
        walletType: state.walletType,
        isOnboarded: state.isOnboarded,
        referralCode: state.referralCode,
        transactions: state.transactions,
        recentRecipients: state.recentRecipients,
      }),
      onRehydrateStorage: () => (state) => {
        // If we have a persisted address, simulate reconnection with fresh balance
        if (state?.address && state?.walletType) {
          // Use default virtual balance - will be synced from DB in production
          const virtualBalance = 1000.00;
          const mockEthBalance = 0.0423;
          const mockEthPrice = 2600;
          
          state.balance = virtualBalance;
          state.balanceUsdc = virtualBalance;
          state.balanceUsdcAvailable = virtualBalance;
          state.balanceUsdcInPositions = 0;
          state.balanceEth = mockEthBalance;
          state.balanceEthUsd = mockEthBalance * mockEthPrice;
          state.isConnected = true;
          state.wrongNetwork = false;
          state.chainId = null;
          state.switchNetworkPending = false;

          // Check if referral code is still valid
          const referralTimestamp = localStorage.getItem('predictio-referral-timestamp');
          if (state.referralCode && referralTimestamp) {
            const isValid = (Date.now() - parseInt(referralTimestamp)) < 30 * 24 * 60 * 60 * 1000;
            if (!isValid) {
              state.referralCode = null;
            }
          }
          
          console.log(`[Paper Trading] Wallet rehydrated: ${state.address} with virtual balance: $${virtualBalance}`);
        }
      },
    }
  )
);

// Custom hook for easy access
export const useWallet = () => useWalletStore();
