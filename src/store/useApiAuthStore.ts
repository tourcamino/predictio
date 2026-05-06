import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type ApiAuthState = {
  /** Developer API key used with Authorization: Bearer <key> */
  developerApiKey: string;
  /** Admin key used with x-predictio-key for admin/developer key management endpoints */
  adminApiKey: string;
  setDeveloperApiKey: (key: string) => void;
  clearDeveloperApiKey: () => void;
  setAdminApiKey: (key: string) => void;
  clearAdminApiKey: () => void;
  clearAll: () => void;
};

export const useApiAuthStore = create<ApiAuthState>()(
  persist(
    (set) => ({
      developerApiKey: '',
      adminApiKey: '',
      setDeveloperApiKey: (key) => set({ developerApiKey: key.trim() }),
      clearDeveloperApiKey: () => set({ developerApiKey: '' }),
      setAdminApiKey: (key) => set({ adminApiKey: key.trim() }),
      clearAdminApiKey: () => set({ adminApiKey: '' }),
      clearAll: () => set({ developerApiKey: '', adminApiKey: '' }),
    }),
    {
      name: 'predictio-api-auth',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);

