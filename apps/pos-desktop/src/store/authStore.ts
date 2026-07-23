import type { PublicUser } from "@repo/types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useBranchStore } from "./branchStore";
import {
  AUTH_REFRESH_TOKEN_STORAGE_KEY,
  AUTH_ROUTE,
  AUTH_TOKEN_STORAGE_KEY,
} from "@/constants/auth";

type State = {
  user: PublicUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isHighLevelUser?: boolean;
  isStaff?: boolean;
};

type Actions = {
  setUser: (user: PublicUser, token: string, refreshToken?: string) => void;
  updateUser: (user: PublicUser) => void;
  clearUser: () => void;
  logout: () => void;
};

const AUTH_STORAGE_KEY = "pos-auth-state";

export const useAuthStore = create<State & Actions>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isHighLevelUser: false,
      isStaff: false,
      setUser: (user: PublicUser, token: string, refreshToken?: string) => {
        // Store tokens separately for the API interceptor (access token for
        // every request; refresh token so the interceptor can silently renew
        // an expired access token instead of forcing a re-login).
        localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
        if (refreshToken) {
          localStorage.setItem(AUTH_REFRESH_TOKEN_STORAGE_KEY, refreshToken);
        }
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
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        localStorage.removeItem(AUTH_REFRESH_TOKEN_STORAGE_KEY);
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
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        localStorage.removeItem(AUTH_REFRESH_TOKEN_STORAGE_KEY);
        localStorage.removeItem(AUTH_STORAGE_KEY);
        useBranchStore.getState().clearBranchId();
        set(() => ({
          user: null,
          token: null,
          isAuthenticated: false,
          isHighLevelUser: false,
          isStaff: false,
        }));
        window.location.hash = AUTH_ROUTE;
        window.location.reload();
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
