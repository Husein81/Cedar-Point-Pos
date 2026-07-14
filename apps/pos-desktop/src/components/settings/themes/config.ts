import type { ColorTheme, Theme } from "@/context/themes";

export type ThemeMode = {
  value: Theme;
  label: string;
  description: string;
  icon: string;
};

export type ColorThemeOption = {
  value: ColorTheme;
  label: string;
  description: string;
};

export const themeModes: ThemeMode[] = [
  {
    value: "light",
    label: "Light",
    description: "A bright appearance for well-lit environments",
    icon: "Sun",
  },
  {
    value: "dark",
    label: "Dark",
    description: "A dimmed appearance that is easier on the eyes",
    icon: "Moon",
  },
  {
    value: "system",
    label: "System",
    description: "Automatically match your device's appearance",
    icon: "Laptop",
  },
];

export const colorThemeOptions: ColorThemeOption[] = [
  {
    value: "cedar",
    label: "Cedar Blue",
    description: "The classic Cedar Point brand color",
  },
  {
    value: "emerald",
    label: "Emerald",
    description: "A fresh, natural green",
  },
  {
    value: "rose",
    label: "Rose",
    description: "A warm, vibrant red",
  },
  {
    value: "violet",
    label: "Violet",
    description: "A rich, modern purple",
  },
  {
    value: "sunset",
    label: "Sunset",
    description: "A bold, energetic orange",
  },
];
