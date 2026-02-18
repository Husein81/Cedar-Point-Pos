import { create } from "zustand";
import { persist, StorageValue } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type State = {
  theme: "light" | "dark" | "system";
  isDark?: boolean;
};

type Actions = {
  setTheme: (theme: State["theme"]) => void;
};

const asyncStorageAdapter = {
  getItem: async (
    name: string,
  ): Promise<StorageValue<State & Actions> | null> => {
    const item = await AsyncStorage.getItem(name);
    return item ? JSON.parse(item) : null;
  },
  setItem: async (
    name: string,
    value: StorageValue<State & Actions>,
  ): Promise<void> => {
    await AsyncStorage.setItem(name, JSON.stringify(value));
  },
  removeItem: async (name: string): Promise<void> => {
    await AsyncStorage.removeItem(name);
  },
};

export const useThemeStore = create<State & Actions>()(
  persist(
    (set) => ({
      theme: "dark",
      isDark: false,
      setTheme: async (theme) => {
        await AsyncStorage.setItem("mobile-theme", theme);
        set({ theme, isDark: theme === "dark" });
      },
    }),
    {
      name: "mobile-theme",
      storage: asyncStorageAdapter,
    },
  ),
);
