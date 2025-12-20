import type { User } from "@repo/types";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type State = {
  user: Omit<User, "password"> | null;
  isAuthenticated: boolean;
};

type Actions = {
  setUser: (user: Omit<User, "password">) => void;
  clearUser: () => void;
  logout: () => void;
};

const AUTH_STORAGE_KEY = "pos-auth";

export const useAuthStore = create<State & Actions>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user: Omit<User, "password">) =>
        set(() => ({ user, isAuthenticated: true })),
      clearUser: () => set(() => ({ user: null, isAuthenticated: false })),
      logout: () => {
        // Clear user data and localStorage
        set(() => ({ user: null, isAuthenticated: false }));
        localStorage.removeItem(AUTH_STORAGE_KEY);
        // Redirect to auth page
        window.location.href = "/auth";
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
