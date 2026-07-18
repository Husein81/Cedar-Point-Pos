import { cn, Icon } from "@repo/ui";
import type { ColorThemeOption } from "./config";

type ColorThemeCardProps = {
  option: ColorThemeOption;
  isActive: boolean;
  onSelect: () => void;
};

export const ColorThemeCard = ({
  option,
  isActive,
  onSelect,
}: ColorThemeCardProps) => (
  <button
    type="button"
    onClick={onSelect}
    aria-pressed={isActive}
    className={cn(
      "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors",
      isActive
        ? "border-primary"
        : "border-border hover:border-muted-foreground/40",
    )}
  >
    {/* The theme-* class scopes the brand tokens so each swatch
        shows its own theme's colors, not the active theme's. */}
    <div className={cn("flex shrink-0 -space-x-1.5", `theme-${option.value}`)}>
      <span className="size-6 rounded-full bg-primary ring-2 ring-background" />
      <span className="size-6 rounded-full bg-accent ring-2 ring-background" />
    </div>
    <div className="flex-1">
      <p className="font-medium">{option.label}</p>
      <p className="text-sm text-muted-foreground">{option.description}</p>
    </div>
    {isActive && <Icon name="CircleCheck" className="size-5 text-primary" />}
  </button>
);
