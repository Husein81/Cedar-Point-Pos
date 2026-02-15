import { DarkTheme, DefaultTheme, type Theme } from "@react-navigation/native";

export const LIGHT_NAV_THEME = {
  background: "oklch(0.98 0.01 260)",
  foreground: "oklch(0.18 0.03 260)",
  card: "oklch(0.99 0.01 260)",
  border: "oklch(0.9 0.02 260)",

  primary: "oklch(0.63 0.23 270)",
  primaryForeground: "oklch(0.98 0.01 260)",

  accent: "oklch(0.63 0.23 270)",

  muted: "oklch(0.94 0.02 260)",
  mutedForeground: "oklch(0.45 0.04 260)",

  success: "oklch(0.69 0.16 145)",
  warning: "oklch(0.78 0.16 85)",
  info: "oklch(0.72 0.18 250)",
  destructive: "oklch(0.58 0.22 25)",

  sidebar: "oklch(0.97 0.01 260)",
  sidebarForeground: "oklch(0.18 0.03 260)",

  ring: "oklch(0.63 0.23 270)",

  chart: {
    c1: "oklch(0.63 0.23 270)",
    c2: "oklch(0.72 0.18 250)",
    c3: "oklch(0.55 0.14 240)",
    c4: "oklch(0.78 0.16 85)",
    c5: "oklch(0.69 0.16 145)",
  },
};

export const DARK_NAV_THEME = {
  background: "oklch(0.18 0.03 260)",
  foreground: "oklch(0.96 0.01 260)",
  card: "oklch(0.21 0.03 260)",
  border: "oklch(0.3 0.04 260)",

  primary: "oklch(0.72 0.18 250)",
  primaryForeground: "oklch(0.18 0.03 260)",

  accent: "oklch(0.63 0.23 270)",

  muted: "oklch(0.26 0.04 260)",
  mutedForeground: "oklch(0.7 0.04 260)",

  success: "oklch(0.62 0.14 145)",
  warning: "oklch(0.7 0.15 85)",
  info: "oklch(0.72 0.18 250)",
  destructive: "oklch(0.45 0.18 25)",

  sidebar: "oklch(0.16 0.03 260)",
  sidebarForeground: "oklch(0.96 0.01 260)",

  ring: "oklch(0.72 0.18 250)",

  chart: {
    c1: "oklch(0.72 0.18 250)",
    c2: "oklch(0.63 0.23 270)",
    c3: "oklch(0.58 0.16 240)",
    c4: "oklch(0.7 0.15 85)",
    c5: "oklch(0.62 0.14 145)",
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
