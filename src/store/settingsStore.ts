import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { NotificationPreferences } from '~/types/notifications';

interface SettingsState {
  // Existing trading settings
  advancedMode: boolean;
  slippageTolerance: number; // in basis points (100 = 1%)
  orderbookExpanded: boolean;
  chartTimeframe: '1h' | '4h' | '1d' | '7d' | 'all';
  chartType: 'line' | 'candles';
  keyboardShortcuts: boolean;
  
  // New Trading settings
  defaultOrderType: 'market' | 'limit';
  confirmModalEnabled: boolean;
  quickSellPercentages: number[];
  
  // Display settings
  theme: 'dark' | 'light' | 'auto';
  currency: 'USD' | 'EUR' | 'GBP' | 'USDC';
  numberFormat: 'en' | 'de' | 'fr';
  timezone: string;
  compactMode: boolean;
  animationsEnabled: boolean;
  priceFlashAnimations: boolean;
  celebrationAnimations: boolean;
  
  // Notification settings
  notificationPreferences: NotificationPreferences;
  
  // Privacy settings
  analyticsEnabled: boolean;
  showOnLeaderboard: boolean;
  showEnsNames: boolean;
  
  // Advanced settings
  customRpcUrl: string | null;
  gasBufferPct: number;
  wsAutoReconnect: boolean;
  wsFallbackPolling: boolean;
  debugPanelVisible: boolean;
  logWebSocketMessages: boolean;
}

interface SettingsStore extends SettingsState {
  // Existing actions
  setAdvancedMode: (enabled: boolean) => void;
  setSlippageTolerance: (bps: number) => void;
  setOrderbookExpanded: (expanded: boolean) => void;
  setChartTimeframe: (timeframe: '1h' | '4h' | '1d' | '7d' | 'all') => void;
  setChartType: (type: 'line' | 'candles') => void;
  setKeyboardShortcuts: (enabled: boolean) => void;
  
  // New generic update action
  update: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  updateNotificationPreference: <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => void;
  
  // Export/Import
  exportSettings: () => string;
  importSettings: (json: string) => boolean;
  
  resetToDefaults: () => void;
}

const DEFAULT_SETTINGS: SettingsState = {
  // Existing
  advancedMode: false,
  slippageTolerance: 200, // 2%
  orderbookExpanded: true,
  chartTimeframe: '1d',
  chartType: 'line',
  keyboardShortcuts: false,
  
  // Trading
  defaultOrderType: 'market',
  confirmModalEnabled: true,
  quickSellPercentages: [25, 50, 75, 100],
  
  // Display
  theme: 'dark',
  currency: 'USD',
  numberFormat: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  compactMode: false,
  animationsEnabled: true,
  priceFlashAnimations: true,
  celebrationAnimations: true,
  
  // Notifications
  notificationPreferences: {
    tradeFilled: true,
    tradePartialFill: true,
    tradeFailed: true,
    positionProfitMilestone: true,
    positionLossWarning: false,
    positionPriceMoved: false,
    profitMilestones: [25, 50, 100],
    lossWarnings: [],
    marketResolved: true,
    claimAvailable: true,
    marketEndingSoon: false,
    marketEndingIn24h: false,
    depositReceived: true,
    withdrawalConfirmed: true,
    lowEthGas: true,
    lowUsdcBalance: true,
    toastEnabled: true,
    toastDurationMs: 5000,
    toastSoundEnabled: false,
    browserNotificationsEnabled: false,
  },
  
  // Privacy
  analyticsEnabled: false,
  showOnLeaderboard: true,
  showEnsNames: true,
  
  // Advanced
  customRpcUrl: null,
  gasBufferPct: 20,
  wsAutoReconnect: true,
  wsFallbackPolling: false,
  debugPanelVisible: false,
  logWebSocketMessages: false,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,

      // Existing actions (keep for backward compatibility)
      setAdvancedMode: (enabled) => set({ advancedMode: enabled }),
      setSlippageTolerance: (bps) => set({ slippageTolerance: bps }),
      setOrderbookExpanded: (expanded) => set({ orderbookExpanded: expanded }),
      setChartTimeframe: (timeframe) => set({ chartTimeframe: timeframe }),
      setChartType: (type) => set({ chartType: type }),
      setKeyboardShortcuts: (enabled) => set({ keyboardShortcuts: enabled }),
      
      // Generic update action
      update: (key, value) => {
        set({ [key]: value });
      },
      
      // Update notification preference
      updateNotificationPreference: (key, value) => {
        set((state) => ({
          notificationPreferences: {
            ...state.notificationPreferences,
            [key]: value,
          },
        }));
      },
      
      // Export settings as JSON
      exportSettings: () => {
        const state = get();
        return JSON.stringify(state, null, 2);
      },
      
      // Import settings from JSON
      importSettings: (json) => {
        try {
          const imported = JSON.parse(json);
          set(imported);
          return true;
        } catch (error) {
          console.error('Failed to import settings:', error);
          return false;
        }
      },
      
      resetToDefaults: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'predictio_settings_v1',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
