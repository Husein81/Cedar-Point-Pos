import { createMMKV } from "react-native-mmkv";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const mmkv = createMMKV();

type State = {
  theme: "light" | "dark" | "system";
  isDark?: boolean;
};

type Actions = {
  setTheme: (theme: State["theme"]) => void;
};

const mmkvStorage = createJSONStorage(() => ({
  getItem: (name: string) => {
    const value = mmkv.getString(name);
    return value ? JSON.parse(value) : null;
  },
  setItem: (name: string, value: unknown) => {
    mmkv.set(name, JSON.stringify(value));
  },
  removeItem: (name: string) => {
    mmkv.remove(name);
  },
}));

export const useThemeStore = create<State & Actions>()(
  persist(
    (set) => ({
      theme: "dark",
      isDark: false,
      setTheme: (theme) => {
        set({ theme, isDark: theme === "dark" });
      },
    }),
    {
      name: "mobile-theme",
      storage: mmkvStorage,
    },
  ),
);
