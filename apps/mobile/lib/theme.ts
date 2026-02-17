import { DarkTheme, DefaultTheme, type Theme } from "@react-navigation/native";

export const LIGHT_NAV_THEME = {
  background: "#F7F9FC",
  foreground: "#1A202C",
  card: "#FFFFFF",
  border: "#E2E8F0",

  primary: "#525FF9",
  primaryForeground: "#FFFFFF",

  accent: "#525FF9",

  muted: "#F0F2F7",
  mutedForeground: "#64748B",

  success: "#22C55E",
  warning: "#EAB308",
  info: "#3B82F6",
  destructive: "#EF4444",

  sidebar: "#F5F7FA",
  sidebarForeground: "#1A202C",

  ring: "#525FF9",

  chart: {
    c1: "#525FF9",
    c2: "#3B82F6",
    c3: "#4C6EF5",
    c4: "#EAB308",
    c5: "#22C55E",
  },
};

export const DARK_NAV_THEME = {
  background: "#031128",
  foreground: "#F1F5F9",
  card: "#0F172A",
  border: "#334155",

  primary: "#5D9EFF",
  primaryForeground: "#031128",

  accent: "#525FF9",

  muted: "#1E293B",
  mutedForeground: "#94A3B8",

  success: "#16A34A",
  warning: "#CA8A04",
  info: "#3B82F6",
  destructive: "#B91C1C",

  sidebar: "#020C1C",
  sidebarForeground: "#F1F5F9",

  ring: "#5D9EFF",

  chart: {
    c1: "#5D9EFF",
    c2: "#525FF9",
    c3: "#4C6EF5",
    c4: "#CA8A04",
    c5: "#16A34A",
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
