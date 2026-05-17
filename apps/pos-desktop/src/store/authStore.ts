import type { PublicUser } from "@repo/types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useBranchStore } from "./branchStore";

type State = {
  user: PublicUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isHighLevelUser?: boolean;
  isStaff?: boolean;
};

type Actions = {
  setUser: (user: PublicUser, token: string) => void;
  updateUser: (user: PublicUser) => void;
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
      isHighLevelUser: false,
      isStaff: false,
      setUser: (user: PublicUser, token: string) => {
        // Store token separately for API interceptor
        localStorage.setItem(TOKEN_KEY, token);
        set(() => ({
          user,
          token,
          isAuthenticated: true,
          isHighLevelUser: user.role === "ADMIN" || user.role === "MANAGER",
          isStaff: user.role === "CASHIER" || user.role === "KITCHEN",
        }));
      },
      updateUser: (user: PublicUser) => {
        set(() => ({
          user,
          isHighLevelUser: user.role === "ADMIN" || user.role === "MANAGER",
          isStaff: user.role === "CASHIER" || user.role === "KITCHEN",
        }));
      },
      clearUser: () => {
        localStorage.removeItem(TOKEN_KEY);
        useBranchStore.getState().clearBranchId();
        set(() => ({
          user: null,
          token: null,
          isAuthenticated: false,
          isHighLevelUser: false,
          isStaff: false,
        }));
      },
      logout: () => {
        // Clear user data and localStorage
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(AUTH_STORAGE_KEY);
        useBranchStore.getState().clearBranchId();
        set(() => ({
          user: null,
          token: null,
          isAuthenticated: false,
          isHighLevelUser: false,
          isStaff: false,
        }));
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
        isHighLevelUser: state.isHighLevelUser,
        isStaff: state.isStaff,
      }),
    },
  ),
);
