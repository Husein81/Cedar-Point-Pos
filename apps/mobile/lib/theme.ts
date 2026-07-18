import { DarkTheme, DefaultTheme, type Theme } from "@react-navigation/native";
import { useThemeStore, type ColorTheme } from "@/store/theme";

type NavThemeColors = {
  background: string;
  foreground: string;
  card: string;
  border: string;
  primary: string;
  primaryForeground: string;
  accent: string;
  muted: string;
  mutedForeground: string;
  success: string;
  warning: string;
  info: string;
  destructive: string;
  sidebar: string;
  sidebarForeground: string;
  ring: string;
  chart: { c1: string; c2: string; c3: string; c4: string; c5: string };
};

const SHARED_LIGHT = {
  background: "#FBF9F9",
  foreground: "#262626",
  card: "#FDFCFC",
  border: "#E5E0E0",
  primaryForeground: "#FDFCFC",
  muted: "#F0EDED",
  mutedForeground: "#72696C",
  success: "#A3E635",
  warning: "#F5D231",
  info: "#2D83E6",
  destructive: "#D84747",
  sidebar: "#F8F5F6",
  sidebarForeground: "#262626",
};

const SHARED_DARK = {
  background: "#1F1717",
  foreground: "#FBF9F9",
  card: "#2A1F1F",
  border: "#403C3C",
  primaryForeground: "#FDFCFC",
  muted: "#382F2F",
  mutedForeground: "#B2A8A8",
  success: "#98D82E",
  warning: "#E5C030",
  info: "#2D83E6",
  destructive: "#7C3636",
  sidebar: "#19131B",
  sidebarForeground: "#FBF9F9",
};

/** Per-color-theme brand pair (primary/accent), light and dark — mirrors pos-desktop's `.theme-*` classes. */
const BRAND: Record<ColorTheme, { light: [string, string]; dark: [string, string] }> = {
  cedar: { light: ["#0019FF", "#1D5BD6"], dark: ["#8CB3FF", "#0019FF"] },
  emerald: { light: ["#008444", "#009A60"], dark: ["#00C97D", "#008444"] },
  rose: { light: ["#D30046", "#E84461"], dark: ["#FF6B87", "#D30046"] },
  violet: { light: ["#7E1CD8", "#914DE6"], dark: ["#B37EF0", "#7E1CD8"] },
  sunset: { light: ["#CF4700", "#E16C10"], dark: ["#FF9142", "#CF4700"] },
};

const buildTheme = (
  shared: typeof SHARED_LIGHT,
  [primary, accent]: [string, string],
): NavThemeColors => ({
  ...shared,
  primary,
  accent,
  ring: primary,
  chart: {
    c1: primary,
    c2: "#67B26F",
    c3: "#EDC536",
    c4: "#9966CC",
    c5: "#E05555",
  },
});

export const THEME_BY_COLOR: Record<
  ColorTheme,
  { light: NavThemeColors; dark: NavThemeColors }
> = Object.fromEntries(
  (Object.keys(BRAND) as ColorTheme[]).map((colorTheme) => [
    colorTheme,
    {
      light: buildTheme(SHARED_LIGHT, BRAND[colorTheme].light),
      dark: buildTheme(SHARED_DARK, BRAND[colorTheme].dark),
    },
  ]),
) as Record<ColorTheme, { light: NavThemeColors; dark: NavThemeColors }>;

/** Default (cedar) palette — kept for call sites that haven't been switched to `useAppTheme` yet. */
export const THEME = THEME_BY_COLOR.cedar;

export const getNavTheme = (
  colorTheme: ColorTheme,
): Record<"light" | "dark", Theme> => {
  const palette = THEME_BY_COLOR[colorTheme];
  return {
    light: {
      ...DefaultTheme,
      colors: {
        background: palette.light.background,
        border: palette.light.border,
        card: palette.light.card,
        notification: palette.light.destructive,
        primary: palette.light.primary,
        text: palette.light.foreground,
      },
    },
    dark: {
      ...DarkTheme,
      colors: {
        background: palette.dark.background,
        border: palette.dark.border,
        card: palette.dark.card,
        notification: palette.dark.destructive,
        primary: palette.dark.primary,
        text: palette.dark.foreground,
      },
    },
  };
};

export const NAV_THEME = getNavTheme("cedar");

/** Resolves the active color-theme palette for the current mode — the single source of truth for native (non-Tailwind) colors. */
export const useAppTheme = () => {
  const isDark = useThemeStore((s) => s.isDark);
  const colorTheme = useThemeStore((s) => s.colorTheme);
  const palette = THEME_BY_COLOR[colorTheme];
  return isDark ? palette.dark : palette.light;
};
