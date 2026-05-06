import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getDefaultSport, isFootballFocusEnabled } from '~/config/footballFocus';

interface MarketFilters {
  sport: string;
  region: string;
  sortBy: 'volume' | 'closing-soon' | 'newest' | 'most-predicted' | 'most-popular';
  search: string;
  viewMode: 'grid' | 'list';
  minVolume?: number;
  maxVolume?: number;
  status: string;
  displayCount: number;
  startDate?: string;
  endDate?: string;
  minOdds?: number;
  maxOdds?: number;
  analystRecommended?: boolean;
}

interface MarketFilterStore extends MarketFilters {
  setFilters: (filters: Partial<MarketFilters>) => void;
  resetFilters: () => void;
}

const defaultFilters: MarketFilters = {
  sport: getDefaultSport(),
  region: 'all',
  sortBy: 'volume',
  search: '',
  viewMode: 'grid',
  minVolume: undefined,
  maxVolume: undefined,
  status: isFootballFocusEnabled() ? 'upcoming' : 'all', // Default to active markets in football focus
  displayCount: 20,
  startDate: undefined,
  endDate: undefined,
  minOdds: undefined,
  maxOdds: undefined,
  analystRecommended: undefined,
};

export const useMarketFilterStore = create<MarketFilterStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...defaultFilters,

      // Set multiple filters at once
      setFilters: (filters: Partial<MarketFilters>) => {
        set((state) => ({ ...state, ...filters }));
      },

      // Reset to default filters
      resetFilters: () => {
        set(defaultFilters);
      },
    }),
    {
      name: 'predictio-market-filters',
      storage: createJSONStorage(() => localStorage),
      // Only persist the filter values, not the action functions
      partialize: (state) => ({
        sport: state.sport,
        region: state.region,
        sortBy: state.sortBy,
        search: state.search,
        viewMode: state.viewMode,
        minVolume: state.minVolume,
        maxVolume: state.maxVolume,
        status: state.status,
        startDate: state.startDate,
        endDate: state.endDate,
        minOdds: state.minOdds,
        maxOdds: state.maxOdds,
        analystRecommended: state.analystRecommended,
        // Don't persist displayCount as it's more of a session-specific scroll state
      }),
    }
  )
);

// Convenience hook for easy access
export const useMarketFilters = () => useMarketFilterStore();
