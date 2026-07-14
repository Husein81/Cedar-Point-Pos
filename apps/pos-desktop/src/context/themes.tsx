import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "dark" | "light" | "system";

export type ColorTheme = "cedar" | "emerald" | "rose" | "violet" | "sunset";

export const colorThemes: ColorTheme[] = [
  "cedar",
  "emerald",
  "rose",
  "violet",
  "sunset",
];

const isColorTheme = (value: string | null): value is ColorTheme =>
  colorThemes.includes(value as ColorTheme);

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  defaultColorTheme?: ColorTheme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  colorTheme: ColorTheme;
  setColorTheme: (colorTheme: ColorTheme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => {},
  colorTheme: "cedar",
  setColorTheme: () => {},
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  defaultColorTheme = "cedar",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const colorStorageKey = `${storageKey}-color`;

  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme,
  );

  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    const stored = localStorage.getItem(colorStorageKey);
    return isColorTheme(stored) ? stored : defaultColorTheme;
  });

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove(...colorThemes.map((value) => `theme-${value}`));
    root.classList.add(`theme-${colorTheme}`);
  }, [colorTheme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
    colorTheme,
    setColorTheme: (colorTheme: ColorTheme) => {
      localStorage.setItem(colorStorageKey, colorTheme);
      setColorTheme(colorTheme);
    },
  };

  return (
    <ThemeProviderContext {...props} value={value}>
      {children}
    </ThemeProviderContext>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
