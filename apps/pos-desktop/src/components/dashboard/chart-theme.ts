import type { CSSProperties } from "react";

/**
 * Shared recharts styling bound to the app theme via the CSS variables
 * defined in @repo/ui globals.css (--chart-1..5, popover, border, ...).
 * Keeps every chart readable in dark mode and across color themes.
 */

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

export const CHART_GRID_STROKE = "var(--border)";

export const CHART_AXIS_TICK = {
  fontSize: 11,
  fill: "var(--muted-foreground)",
} as const;

export const CHART_TOOLTIP_CONTENT_STYLE: CSSProperties = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "calc(var(--radius) - 2px)",
  color: "var(--popover-foreground)",
  fontSize: "12px",
  boxShadow: "0 4px 12px rgb(0 0 0 / 0.15)",
};

export const CHART_TOOLTIP_LABEL_STYLE: CSSProperties = {
  color: "var(--popover-foreground)",
  fontWeight: 600,
};

export const CHART_TOOLTIP_ITEM_STYLE: CSSProperties = {
  color: "var(--popover-foreground)",
};

/** Compact currency for axis ticks: $1.2k, $35k, $2M */
export const formatAxisCurrency = (value: number): string =>
  `$${new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)}`;

/** 0–23 → "12 AM", "9 AM", "3 PM" */
export const formatHourLabel = (hour: number): string => {
  const normalized = hour % 12;
  const display = normalized === 0 ? 12 : normalized;
  return `${display} ${hour < 12 ? "AM" : "PM"}`;
};

export const truncateLabel = (label: string, max = 18): string =>
  label.length > max ? `${label.slice(0, max - 1)}…` : label;
