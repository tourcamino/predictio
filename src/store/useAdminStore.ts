import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AdminState {
  isAuthenticated: boolean;
  loginTime: number | null;
  /** Bearer token for admin TRPC mutations (must match server `ADMIN_TOKEN`). */
  adminToken: string;
}

interface AdminStore extends AdminState {
  login: () => void;
  logout: () => void;
  setAdminToken: (token: string) => void;
}

export const useAdminStore = create<AdminStore>()(
  persist(
    (set) => ({
      // Initial state
      isAuthenticated: false,
      loginTime: null,
      adminToken: '',

      // Login
      login: () => {
        set({
          isAuthenticated: true,
          loginTime: Date.now(),
        });
      },

      setAdminToken: (token: string) => set({ adminToken: token }),

      // Logout
      logout: () => {
        set({
          isAuthenticated: false,
          loginTime: null,
          adminToken: '',
        });
      },
    }),
    {
      name: 'predictio_admin_auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        loginTime: state.loginTime,
        adminToken: state.adminToken,
      }),
    }
  )
);

// Custom hook for easy access
export const useAdmin = () => useAdminStore();
