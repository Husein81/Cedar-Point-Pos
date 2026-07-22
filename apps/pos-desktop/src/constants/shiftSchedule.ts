import { ShiftScheduleStatus } from "@repo/types";

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

// Human-readable status labels (STARTED reads as "In Progress" — a runtime
// shift has opened from the schedule).
export const SCHEDULE_STATUS_LABELS: Record<ShiftScheduleStatus, string> = {
  [ShiftScheduleStatus.DRAFT]: "Draft",
  [ShiftScheduleStatus.PUBLISHED]: "Published",
  [ShiftScheduleStatus.STARTED]: "In Progress",
  [ShiftScheduleStatus.CANCELLED]: "Cancelled",
};

// Single source of truth for status → badge styling, reused by the table
// column, the row actions and the calendar chips so a status always looks the
// same everywhere.
export const SCHEDULE_STATUS_BADGE: Record<
  ShiftScheduleStatus,
  { variant: BadgeVariant; className?: string }
> = {
  [ShiftScheduleStatus.DRAFT]: { variant: "outline" },
  [ShiftScheduleStatus.PUBLISHED]: { variant: "default" },
  [ShiftScheduleStatus.STARTED]: {
    variant: "secondary",
    className: "bg-green-500 text-white",
  },
  [ShiftScheduleStatus.CANCELLED]: {
    variant: "outline",
    className: "text-muted-foreground line-through",
  },
};

// Statuses a manager may still edit/cancel (no runtime shift has started yet).
export const EDITABLE_SCHEDULE_STATUSES: ShiftScheduleStatus[] = [
  ShiftScheduleStatus.DRAFT,
  ShiftScheduleStatus.PUBLISHED,
];

// Statuses that may be hard-deleted (drafts never published, or revoked rows).
export const DELETABLE_SCHEDULE_STATUSES: ShiftScheduleStatus[] = [
  ShiftScheduleStatus.DRAFT,
  ShiftScheduleStatus.CANCELLED,
];
