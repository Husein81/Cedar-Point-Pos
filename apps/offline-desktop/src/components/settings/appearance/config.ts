import type { Theme } from "@/context/themes";

export type ThemeMode = {
  value: Theme;
  label: string;
  description: string;
  icon: string;
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
