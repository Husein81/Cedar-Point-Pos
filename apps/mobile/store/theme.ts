import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type State = {
  theme: "light" | "dark" | "system";
  isDark?: boolean;
};

type Actions = {
  setTheme: (theme: State["theme"]) => void;
  initializeTheme: () => void;
};

const asyncStorage = createJSONStorage(() => AsyncStorage);

const getSystemTheme = () => {
  const colorScheme = Appearance.getColorScheme();
  return colorScheme === "dark";
};

export const useThemeStore = create<State & Actions>()(
  persist(
    (set) => ({
      theme: "system",
      isDark: getSystemTheme(),
      setTheme: (theme) => {
        const isDark =
          theme === "dark" || (theme === "system" && getSystemTheme());
        set({ theme, isDark });
        if (theme !== "system") {
          Appearance.setColorScheme(theme);
        }
      },
      initializeTheme: () => {
        const isDark = getSystemTheme();
        set({ isDark });
      },
    }),
    {
      name: "mobile-theme",
      storage: asyncStorage,
    },
  ),
);
