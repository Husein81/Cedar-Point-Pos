import type { ThemeMode } from "@/store/theme";

export type ThemeModeOption = {
  value: ThemeMode;
  label: string;
  description: string;
  icon: string;
};

export const THEME_MODE_OPTIONS: ThemeModeOption[] = [
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
    icon: "Smartphone",
  },
];
