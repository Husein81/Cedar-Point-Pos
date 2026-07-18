import { DarkTheme, DefaultTheme, type Theme } from "@react-navigation/native";
import { useThemeStore } from "@/store/theme";

export const LIGHT_NAV_THEME = {
  background: "#FBF9F9",
  foreground: "#262626",
  card: "#FDFCFC",
  border: "#E5E0E0",

  primary: "#0019FF",
  primaryForeground: "#FDFCFC",

  accent: "#1D5BD6",

  muted: "#F0EDED",
  mutedForeground: "#72696C",

  success: "#A3E635",
  warning: "#F5D231",
  info: "#2D83E6",
  destructive: "#D84747",

  sidebar: "#F8F5F6",
  sidebarForeground: "#262626",

  ring: "#0019FF",

  chart: {
    c1: "#0019FF",
    c2: "#67B26F",
    c3: "#EDC536",
    c4: "#9966CC",
    c5: "#E05555",
  },
};

export const DARK_NAV_THEME = {
  background: "#1F1717",
  foreground: "#FBF9F9",
  card: "#2A1F1F",
  border: "#403C3C",

  primary: "#8CB3FF",
  primaryForeground: "#FDFCFC",

  accent: "#0019FF",

  muted: "#382F2F",
  mutedForeground: "#B2A8A8",

  success: "#98D82E",
  warning: "#E5C030",
  info: "#2D83E6",
  destructive: "#7C3636",

  sidebar: "#19131B",
  sidebarForeground: "#FBF9F9",

  ring: "#8CB3FF",

  chart: {
    c1: "#8CB3FF",
    c2: "#75BF7F",
    c3: "#F0D96E",
    c4: "#A87DC4",
    c5: "#E07A7A",
  },
};

export const THEME = {
  light: LIGHT_NAV_THEME,
  dark: DARK_NAV_THEME,
};

export const NAV_THEME: Record<"light" | "dark", Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
};

/** Resolves the active palette for the current mode — the single source of truth for native (non-Tailwind) colors. */
export const useAppTheme = () => {
  const isDark = useThemeStore((s) => s.isDark);
  return isDark ? THEME.dark : THEME.light;
};
