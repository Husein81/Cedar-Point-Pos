import { cn, Icon } from "@repo/ui";

export type KeypadTab = {
  key: string;
  label: string;
  icon: string;
  active: boolean;
  indicator?: boolean;
  onClick: () => void;
};

type Props = {
  title: string;
  value: string;
  prefix?: string;
  suffix?: string;
  diffBase: number | null;
  tabs: KeypadTab[];
  onClose: () => void;
};

export default function KeypadDisplay({
  title,
  value,
  prefix,
  suffix,
  diffBase,
  tabs,
  onClose,
}: Props) {
  return (
    <div className="px-2 pt-1.5">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="truncate text-xs font-medium text-muted-foreground">
          {title}
        </p>
        <button
          type="button"
          aria-label="Close keypad"
          onClick={onClose}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icon name="X" className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-0.5 flex items-end justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              aria-label={tab.label}
              aria-pressed={tab.active}
              onClick={tab.onClick}
              className={cn(
                "relative inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium",
                "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tab.active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon name={tab.icon} className="h-3.5 w-3.5" />
              {tab.label}
              {tab.indicator && (
                <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>

        <div className="flex shrink-0 items-baseline gap-1 pr-1">
          {diffBase !== null && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {diffBase} +
            </span>
          )}
          {prefix && (
            <span className="text-base font-semibold text-muted-foreground">
              {prefix}
            </span>
          )}
          <span
            aria-live="polite"
            className="text-2xl font-bold tabular-nums tracking-tight"
          >
            {value}
          </span>
          {suffix && (
            <span className="text-base font-semibold text-muted-foreground">
              {suffix}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
