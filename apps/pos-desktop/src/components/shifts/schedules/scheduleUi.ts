import type { ShiftScheduleStatus } from "@repo/types";

export const SCHEDULE_STATUS_VARIANTS: Record<
  ShiftScheduleStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "secondary",
  PUBLISHED: "default",
  STARTED: "outline",
  CANCELLED: "destructive",
};

export const SCHEDULE_STATUS_LABELS: Record<ShiftScheduleStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  STARTED: "Started",
  CANCELLED: "Cancelled",
};

export const SCHEDULE_STATUS_DOT_CLASSES: Record<ShiftScheduleStatus, string> = {
  DRAFT: "bg-muted-foreground",
  PUBLISHED: "bg-primary",
  STARTED: "bg-emerald-500",
  CANCELLED: "bg-destructive",
};

export const formatScheduleDate = (date: string | Date) =>
  new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export const formatScheduleTime = (date: string | Date) =>
  new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

export const formatWeekRangeDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
