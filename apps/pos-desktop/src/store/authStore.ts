import type { User } from "@repo/types";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type State = {
  user: Omit<User, "password"> | null;
  token: string | null;
  isAuthenticated: boolean;
};

type Actions = {
  setUser: (user: Omit<User, "password">, token: string) => void;
  clearUser: () => void;
  logout: () => void;
};

const AUTH_STORAGE_KEY = "pos-auth-state";
const TOKEN_KEY = "pos-auth";

export const useAuthStore = create<State & Actions>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setUser: (user: Omit<User, "password">, token: string) => {
        // Store token separately for API interceptor
        localStorage.setItem(TOKEN_KEY, token);
        set(() => ({ user, token, isAuthenticated: true }));
      },
      clearUser: () => {
        localStorage.removeItem(TOKEN_KEY);
        set(() => ({ user: null, token: null, isAuthenticated: false }));
      },
      logout: () => {
        // Clear user data and localStorage
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(AUTH_STORAGE_KEY);
        set(() => ({ user: null, token: null, isAuthenticated: false }));
        // Redirect to auth page
        window.location.href = "/auth";
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only persist user and isAuthenticated (token stored separately)
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
