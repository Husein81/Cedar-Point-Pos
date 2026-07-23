import TitleBar from "@/components/title-bar";
import { useTheme } from "@/context/themes";
import { cn, Icon } from "@repo/ui";
import { themeModes } from "./config";

type SectionHeaderProps = {
  title: string;
  description: string;
};

const SectionHeader = ({ title, description }: SectionHeaderProps) => (
  <div>
    <h3 className="font-medium">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

type ThemeModePreviewProps = {
  value: (typeof themeModes)[number]["value"];
};

const ThemeModePreview = ({ value }: ThemeModePreviewProps) => {
  const lightPane = (
    <div className="flex-1 space-y-2 bg-zinc-100 p-3">
      <div className="h-2 w-3/4 rounded-full bg-zinc-300" />
      <div className="h-2 w-1/2 rounded-full bg-zinc-300" />
      <div className="mt-3 h-8 rounded-md bg-white shadow-sm" />
    </div>
  );

  const darkPane = (
    <div className="flex-1 space-y-2 bg-zinc-900 p-3">
      <div className="h-2 w-3/4 rounded-full bg-zinc-700" />
      <div className="h-2 w-1/2 rounded-full bg-zinc-700" />
      <div className="mt-3 h-8 rounded-md bg-zinc-800 shadow-sm" />
    </div>
  );

  if (value === "system") {
    return (
      <div className="flex h-28">
        {lightPane}
        {darkPane}
      </div>
    );
  }

  return (
    <div className="flex h-28">{value === "light" ? lightPane : darkPane}</div>
  );
};

type ThemeModeCardProps = {
  mode: (typeof themeModes)[number];
  isActive: boolean;
  onSelect: () => void;
};

const ThemeModeCard = ({ mode, isActive, onSelect }: ThemeModeCardProps) => (
  <button
    type="button"
    onClick={onSelect}
    aria-pressed={isActive}
    className={cn(
      "flex flex-col overflow-hidden rounded-xl border-2 text-left transition-colors",
      isActive
        ? "border-primary"
        : "border-border hover:border-muted-foreground/40",
    )}
  >
    <ThemeModePreview value={mode.value} />

    <div className="flex items-start gap-3 border-t p-4">
      <Icon name={mode.icon} className="mt-0.5 size-5 text-muted-foreground" />
      <div className="flex-1">
        <p className="font-medium">{mode.label}</p>
        <p className="text-sm text-muted-foreground">{mode.description}</p>
      </div>
      {isActive && <Icon name="CircleCheck" className="size-5 text-primary" />}
    </div>
  </button>
);

export default function AppearancePage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-8 p-4">
      <TitleBar
        title="Appearance"
        subtitle="Customize the app's appearance"
      />

      <section className="space-y-3">
        <SectionHeader
          title="Mode"
          description="Choose between light and dark appearance"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {themeModes.map((mode) => (
            <ThemeModeCard
              key={mode.value}
              mode={mode}
              isActive={theme === mode.value}
              onSelect={() => setTheme(mode.value)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
