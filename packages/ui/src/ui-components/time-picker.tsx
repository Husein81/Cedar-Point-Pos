"use client";

import { useEffect, useRef, useState } from "react";
import { Shad, Label, SButton, Icon } from "../components";
import { cn } from "../libs/utils";

type Props = {
  /** 24-hour "HH:MM" value (empty string when unset). */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
  className?: string;
  id?: string;
  /** Minute step for the minutes column (default 1). */
  minuteStep?: number;
  disabled?: boolean;
};

const pad = (n: number): string => String(n).padStart(2, "0");

// Clock-ordered 12h hours: 12, 1, 2 … 11.
const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const PERIODS = ["AM", "PM"] as const;
type Period = (typeof PERIODS)[number];

type Parts = { hour12: number; minute: number; period: Period };

// Fallback shown when the incoming value is empty/malformed (09:00 AM).
const FALLBACK_PARTS: Parts = { hour12: 9, minute: 0, period: "AM" };

/** Parse "HH:MM" (24h) into 12h parts; falls back to 09:00 AM when invalid. */
const parse = (value: string): Parts => {
  const [h, m] = (value ?? "").split(":");
  const hours = Number(h);
  const minutes = Number(m);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return FALLBACK_PARTS;
  }
  const period: Period = hours < 12 ? "AM" : "PM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return { hour12, minute: minutes, period };
};

/** Build a 24h "HH:MM" string from 12h parts. */
const build = ({ hour12, minute, period }: Parts): string => {
  let hours = hour12 % 12; // 12 → 0
  if (period === "PM") hours += 12;
  return `${pad(hours)}:${pad(minute)}`;
};

/** 12h display label, e.g. "05:00 PM". */
const display = (value: string): string => {
  if (!value) return "";
  const { hour12, minute, period } = parse(value);
  return `${pad(hour12)}:${pad(minute)} ${period}`;
};

export function TimePicker({
  value,
  onChange,
  label,
  required,
  error,
  placeholder = "Select time",
  className,
  id = "time",
  minuteStep = 1,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const parts = parse(value || "09:00");
  const minutes = Array.from(
    { length: Math.ceil(60 / minuteStep) },
    (_, i) => i * minuteStep
  );

  // Stable refs to the selected hour/minute buttons (refs are exempt from deps).
  const hourRef = useRef<HTMLButtonElement>(null);
  const minuteRef = useRef<HTMLButtonElement>(null);

  // Scroll the selected hour/minute into view whenever the panel opens.
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      hourRef.current?.scrollIntoView({ block: "center" });
      minuteRef.current?.scrollIntoView({ block: "center" });
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const set = (patch: Partial<Parts>) =>
    onChange(build({ ...parts, ...patch }));

  const colItem = (
    active: boolean,
    onClick: () => void,
    text: string,
    ref?: React.Ref<HTMLButtonElement>
  ) => (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-md px-2 py-1.5 text-center text-sm tabular-nums transition-colors",
        active
          ? "bg-primary text-primary-foreground font-semibold"
          : "hover:bg-muted"
      )}
    >
      {text}
    </button>
  );

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <Label htmlFor={id} className="px-1">
          {label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
      )}
      <Shad.Popover open={open} onOpenChange={setOpen}>
        <Shad.PopoverTrigger asChild>
          <SButton
            variant="outline"
            id={id}
            disabled={disabled}
            className={cn(
              "justify-between font-normal tabular-nums",
              !value && "text-muted-foreground",
              error && "border-destructive",
              className
            )}
          >
            {value ? display(value) : placeholder}
            <Icon name="Clock" className="size-4 opacity-70" />
          </SButton>
        </Shad.PopoverTrigger>
        <Shad.PopoverContent align="start" className="w-auto p-2">
          <div className="flex gap-1">
            {/* Hours */}
            <div className="max-h-56 w-14 space-y-0.5 overflow-y-auto pr-1">
              {HOURS_12.map((h) => {
                const active = h === parts.hour12;
                return (
                  <div key={h}>
                    {colItem(
                      active,
                      () => set({ hour12: h }),
                      pad(h),
                      active ? hourRef : undefined
                    )}
                  </div>
                );
              })}
            </div>
            {/* Minutes */}
            <div className="max-h-56 w-14 space-y-0.5 overflow-y-auto border-l border-border/50 pl-1 pr-1">
              {minutes.map((m) => {
                const active = m === parts.minute;
                return (
                  <div key={m}>
                    {colItem(
                      active,
                      () => set({ minute: m }),
                      pad(m),
                      active ? minuteRef : undefined
                    )}
                  </div>
                );
              })}
            </div>
            {/* Period */}
            <div className="w-14 space-y-0.5 border-l border-border/50 pl-1">
              {PERIODS.map((p) =>
                colItem(p === parts.period, () => set({ period: p }), p)
              )}
            </div>
          </div>
        </Shad.PopoverContent>
      </Shad.Popover>
      {error && (
        <em className="px-1 text-sm font-medium not-italic text-destructive leading-none">
          {error}
        </em>
      )}
    </div>
  );
}
