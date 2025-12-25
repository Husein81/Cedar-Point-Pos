import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type AdminUser = {
  id: string;
  name: string;
  username: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type State = {
  user: AdminUser | null;
  isAuthenticated: boolean;
};

type Actions = {
  setUser: (user: AdminUser) => void;
  clearUser: () => void;
  logout: () => void;
};

const AUTH_STORAGE_KEY = "sa-auth";

export const useAuthStore = create<State & Actions>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user: AdminUser) =>
        set(() => ({ user, isAuthenticated: true })),
      clearUser: () => set(() => ({ user: null, isAuthenticated: false })),
      logout: () => {
        // Clear user data from store
        set(() => ({ user: null, isAuthenticated: false }));
        // Cookie is cleared by the backend on logout
        // Redirect to login page
        window.location.href = "/login";
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only persist user and isAuthenticated
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

