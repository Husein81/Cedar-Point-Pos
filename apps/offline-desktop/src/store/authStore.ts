import { create } from "zustand";
import type { User } from "@/shared/models";
import { UserRole } from "@/shared/enums";

// The main process's SessionContext is the authoritative session holder and
// is always in-memory-only (resets on app restart) — there is no token to
// persist. What we persist here is just the last logged-in user's id, purely
// so the app can skip the login screen on relaunch. It is never trusted
// directly: auth:resume re-validates the account against the DB before the
// renderer is allowed to treat it as signed in.
const LAST_USER_ID_KEY = "offline-pos-last-user-id";

type State = {
  user: User | null;
  isAuthenticated: boolean;
  isHighLevelUser: boolean;
};

type Actions = {
  setUser: (user: User) => void;
  clearUser: () => void;
};

export const getLastUserId = (): string | null =>
  localStorage.getItem(LAST_USER_ID_KEY);

export const useAuthStore = create<State & Actions>()((set) => ({
  user: null,
  isAuthenticated: false,
  isHighLevelUser: false,
  setUser: (user) => {
    localStorage.setItem(LAST_USER_ID_KEY, user.id);
    set(() => ({
      user,
      isAuthenticated: true,
      isHighLevelUser:
        user.role === UserRole.OWNER || user.role === UserRole.MANAGER,
    }));
  },
  clearUser: () => {
    localStorage.removeItem(LAST_USER_ID_KEY);
    set(() => ({
      user: null,
      isAuthenticated: false,
      isHighLevelUser: false,
    }));
  },
}));
