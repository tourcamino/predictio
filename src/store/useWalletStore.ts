import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  WALLET_TOAST_IDS,
  walletToastError,
  walletToastSuccess,
} from '~/lib/walletToast';
import { getExpectedChainId } from '~/config/chains';
import { getInjectedEip1193Provider } from '~/lib/wallet/injectedProvider';
import {
  formatWalletSwitchUserMessage,
  readChainIdDecimal,
  switchToPredictioChain,
} from '~/lib/wallet/switchToPredictioChain';
import { eip1193RequestWithTimeout } from '~/lib/wallet/eip1193WithTimeout';
import { walletConnectTrace } from '~/lib/walletConnectTrace';

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

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  /** Legacy / mock-connect only — paper spendable USDC = `getPaperWalletBalance` (tRPC). */
  balance: number;
  /** Legacy / mock-connect — prefer tRPC for paper. */
  balanceUsdc: number;
  balanceUsdcAvailable: number;
  balanceUsdcInPositions: number;
  balanceEth: number; // ETH for gas
  balanceEthUsd: number; // ETH value in USD
  isConnecting: boolean;
  isSyncing: boolean; // Background server sync in flight
  /** True when last sync failed after retries — wallet session still valid. */
  syncDegraded: boolean;
  walletType: string | null; // 'metamask' | 'coinbase' | 'walletconnect' | 'rainbow' | 'ledger'
  isModalOpen: boolean;
  isOnboarded: boolean;
  wrongNetwork: boolean;
  /** Active wallet chain when injected provider is used; null if unknown / mock */
  chainId: number | null;
  /**
   * False during connect and until WalletChainSync finishes the first provider read
   * after load/connect — avoids treating transient state as wrong network.
   */
  walletProviderSyncComplete: boolean;
  switchNetworkPending: boolean;
  referralCode: string | null; // Store the referral code
  
  // Pending transactions
  pendingDeposits: Deposit[];
  pendingWithdrawals: Withdrawal[];
  pendingClaims: string[]; // marketIds

  recentRecipients: string[]; // Recent withdrawal addresses
}

interface WalletStore extends WalletState {
  connectWallet: (walletType: string) => Promise<void>;
  /** Re-prompt the injected wallet for account selection (MetaMask / Coinbase). */
  requestAccountSwitch: () => Promise<void>;
  disconnectWallet: () => void;
  openWalletModal: () => void;
  closeWalletModal: () => void;
  setOnboarded: (value: boolean) => void;
  setSyncing: (value: boolean) => void;
  setSyncDegraded: (value: boolean) => void;
  switchNetwork: () => Promise<void>;
  refreshChainFromProvider: () => Promise<void>;
  deposit: (amount: number) => Promise<{ success: boolean; txHash: string }>;
  withdraw: (amount: number, toAddress: string) => Promise<{ success: boolean; txHash: string }>;
  refreshBalances: () => Promise<void>;
  addRecentRecipient: (address: string) => void;
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
      syncDegraded: false,
      walletType: null,
      isModalOpen: false,
      isOnboarded: false,
      wrongNetwork: false,
      chainId: null,
      walletProviderSyncComplete: false,
      switchNetworkPending: false,
      referralCode: null,
      pendingDeposits: [],
      pendingWithdrawals: [],
      pendingClaims: [],
      recentRecipients: [],

      // Connect: EIP-1193 only. Mock ONLY when VITE_WALLET_MOCK_CONNECT=1 on a non-production Vite build (never PROD).
      connectWallet: async (walletType: string) => {
        walletConnectTrace("connect_start", { walletType });
        set({ isConnecting: true, walletProviderSyncComplete: false, syncDegraded: false });
        await new Promise((resolve) => setTimeout(resolve, 220));

        const referralCode = localStorage.getItem("predictio-referral-code");
        const referralTimestamp = localStorage.getItem("predictio-referral-timestamp");
        const isReferralValid = Boolean(
          referralCode &&
            referralTimestamp &&
            Date.now() - parseInt(referralTimestamp, 10) < 30 * 24 * 60 * 60 * 1000,
        );

        /** Never implicit mock in production builds (`import.meta.env.PROD`). */
        const allowMock =
          import.meta.env.VITE_WALLET_MOCK_CONNECT === "1" && !import.meta.env.PROD;
        const provider = getInjectedEip1193Provider(walletType);

        if (!provider) {
          if (allowMock) {
            const mockAddress = (
              (import.meta.env.VITE_WALLET_MOCK_ADDRESS as string | undefined)?.trim() ||
              "0x7f3a8b2c4e2b9f1a6d5c8e7f9a2b4c6d8e0f1a3b"
            ).toLowerCase();
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
              walletProviderSyncComplete: true,
              referralCode: isReferralValid ? referralCode : null,
            });
            if (isReferralValid && referralCode) {
              console.log(
                `[REFERRAL] User ${mockAddress} connected with referral code: ${referralCode}`,
              );
            }
            console.warn(
              `[Wallet] MOCK connect only (VITE_WALLET_MOCK_CONNECT=1, non-PROD build): ${mockAddress}`,
            );
            return;
          }

          set({ isConnecting: false, walletProviderSyncComplete: true });
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
          walletConnectTrace("metamask_request_accounts");
          const accounts = (await eip1193RequestWithTimeout<string[]>(
            provider,
            "eth_requestAccounts",
            undefined,
          )) as string[];
          walletConnectTrace("metamask_connected", { accountCount: accounts?.length ?? 0 });
          if (import.meta.env.DEV && import.meta.env.VITE_WALLET_IDENTITY_DEBUG === "1") {
            // eslint-disable-next-line no-console
            console.info("[wallet-identity] eth_requestAccounts", { accounts });
          }
          if (!accounts?.length) {
            throw new Error("No accounts returned from your wallet.");
          }
          const address = accounts[0]!.toLowerCase();
          let cid: number | null = null;
          try {
            const hex = await eip1193RequestWithTimeout<string>(
              provider,
              "eth_chainId",
              undefined,
              8_000,
            );
            if (typeof hex === "string" && hex.startsWith("0x")) {
              cid = parseInt(hex, 16);
            }
          } catch (chainErr) {
            walletConnectTrace("chain_id_timeout_or_error", {
              message: chainErr instanceof Error ? chainErr.message : String(chainErr),
            });
            cid = await readChainIdDecimal(provider);
          }
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
            walletProviderSyncComplete: true,
            referralCode: isReferralValid ? referralCode : null,
          });
          walletConnectTrace("store_connected", { address, chainId: cid, wrongNetwork: wrong });

          if (isReferralValid && referralCode) {
            console.log(
              `[REFERRAL] User ${address} connected with referral code: ${referralCode}`,
            );
          }
          console.log(
            `[Wallet] Connected ${address} chainId=${cid ?? "?"} expected=${expected} wrongNetwork=${wrong}`,
          );
        } catch (e) {
          walletConnectTrace("connect_error", {
            message: e instanceof Error ? e.message : String(e),
          });
          throw e instanceof Error ? e : new Error("Could not connect wallet");
        } finally {
          set({ isConnecting: false, walletProviderSyncComplete: true });
          walletConnectTrace("connect_loading_off", {
            isConnected: get().isConnected,
            address: get().address,
          });
        }
      },

      requestAccountSwitch: async () => {
        const { walletType, isConnected } = get();
        walletConnectTrace("switch_wallet_start", { walletType, isConnected });
        if (!walletType) {
          set({ isModalOpen: true });
          return;
        }
        const provider = getInjectedEip1193Provider(walletType);
        if (!provider) {
          throw new Error(
            "Wallet extension not found. Reconnect from the wallet menu.",
          );
        }
        set({ isConnecting: true, walletProviderSyncComplete: false, isSyncing: false });
        try {
          try {
            await eip1193RequestWithTimeout(
              provider,
              "wallet_requestPermissions",
              [{ eth_accounts: {} }],
              8_000,
            );
          } catch {
            /* Not all wallets implement this — eth_requestAccounts may still open the picker */
          }
          const accounts = (await eip1193RequestWithTimeout<string[]>(
            provider,
            "eth_requestAccounts",
            undefined,
          )) as string[];
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
            isConnecting: false,
            wrongNetwork: wrong,
            chainId: cid,
            walletProviderSyncComplete: true,
          });
          walletConnectTrace("switch_wallet_done", { address, chainId: cid });
          if (!isConnected) {
            set({ isModalOpen: true });
          }
        } catch (e) {
          throw e instanceof Error ? e : new Error("Could not switch account");
        } finally {
          set({ isConnecting: false, walletProviderSyncComplete: true });
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
          'predictio-wallet-v2',
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
          syncDegraded: false,
          isOnboarded: false,
          chainId: null,
          switchNetworkPending: false,
          walletProviderSyncComplete: true,
          pendingDeposits: [],
          pendingWithdrawals: [],
          pendingClaims: [],
          recentRecipients: [],
        };
        set(reset);
        
        console.log('[WALLET] Disconnect complete - all state cleared');
      },

      // Modal controls
      openWalletModal: () => set({ isModalOpen: true }),
      closeWalletModal: () => set({ isModalOpen: false, isConnecting: false }),

      // Onboarding
      setOnboarded: (value: boolean) => set({ isOnboarded: value }),

      // Background sync flags (never affect isConnected / session)
      setSyncing: (value: boolean) => set({ isSyncing: value }),
      setSyncDegraded: (value: boolean) => set({ syncDegraded: value }),

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
          walletToastError(
            "No browser wallet found. Install MetaMask / Coinbase Wallet or open Predictio inside your wallet app.",
            { id: WALLET_TOAST_IDS.noProvider, duration: 6200 },
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
            walletToastSuccess('Network updated — you are on the expected chain.', {
              id: WALLET_TOAST_IDS.networkOk,
              duration: 4200,
            });
          }
        } catch (e) {
          walletToastError(formatWalletSwitchUserMessage(e), {
            id: WALLET_TOAST_IDS.networkErr,
            duration: 6400,
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

      // Paper USDC is **not** updated here — use tRPC `getPaperWalletBalance` + query invalidation.
      refreshBalances: async () => {
        await new Promise((resolve) => setTimeout(resolve, 40));
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
    }),
    {
      name: "predictio-wallet-v2",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      /** Never persist address — identity must come from `eth_accounts` / `eth_requestAccounts`. */
      partialize: (state) => ({
        walletType: state.walletType,
        isOnboarded: state.isOnboarded,
        referralCode: state.referralCode,
      }),
    }
  )
);

// Custom hook for easy access
export const useWallet = () => useWalletStore();
