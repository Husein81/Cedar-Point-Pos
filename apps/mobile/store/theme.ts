import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";
export type ColorTheme = "cedar" | "emerald" | "rose" | "violet" | "sunset";

export const COLOR_THEMES: ColorTheme[] = [
  "cedar",
  "emerald",
  "rose",
  "violet",
  "sunset",
];

type State = {
  theme: ThemeMode;
  colorTheme: ColorTheme;
  isDark?: boolean;
};

type Actions = {
  setTheme: (theme: ThemeMode) => void;
  setColorTheme: (colorTheme: ColorTheme) => void;
  initializeTheme: () => void;
};

const asyncStorage = createJSONStorage(() => AsyncStorage);

const getSystemIsDark = () => Appearance.getColorScheme() === "dark";

const resolveIsDark = (theme: ThemeMode) =>
  theme === "system" ? getSystemIsDark() : theme === "dark";

export const useThemeStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      theme: "light",
      colorTheme: "cedar",
      isDark: getSystemIsDark(),
      setTheme: (theme) => {
        const isDark = resolveIsDark(theme);
        set({ theme, isDark });
        Appearance.setColorScheme(theme === "system" ? null : theme);
      },
      setColorTheme: (colorTheme) => set({ colorTheme }),
      initializeTheme: () => {
        set({ isDark: resolveIsDark(get().theme) });
      },
    }),
    {
      name: "mobile-theme",
      storage: asyncStorage,
    },
  ),
);

Appearance.addChangeListener(() => {
  const { theme, initializeTheme } = useThemeStore.getState();
  if (theme === "system") initializeTheme();
});
