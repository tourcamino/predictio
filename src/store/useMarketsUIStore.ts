import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MarketsUIState {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useMarketsUIStore = create<MarketsUIState>()(
  persist(
    (set) => ({
      isSidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setSidebarCollapsed: (collapsed: boolean) =>
        set({ isSidebarCollapsed: collapsed }),
    }),
    {
      name: 'markets-ui-storage',
    }
  )
);
