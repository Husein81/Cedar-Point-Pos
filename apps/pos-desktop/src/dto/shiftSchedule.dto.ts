import type { ShiftScheduleStatus } from "@repo/types";

// The ShiftSchedule shape returned by the API. Mirrors the `scheduleInclude`
// projection in ShiftScheduleService exactly. Timestamps are ISO strings (the
// API serializes Dates over the wire) and are consumed via `new Date(...)`.
// Prisma is server-only — never import its types here.
export type ShiftScheduleRelation = { id: string; name: string };

export type ShiftScheduleView = {
  id: string;
  tenantId: string;
  branchId: string;
  userId: string;
  deviceId: string | null;
  date: string | null; // ISO date (midnight UTC); null for recurring patterns
  isRecurring: boolean; // true = dateless weekly pattern
  daysOfWeek: number[]; // 0=Sun..6=Sat; populated for recurring patterns
  effectiveFrom: string | null; // recurring: pattern applies from this day
  effectiveTo: string | null; // recurring: pattern applies until this day
  startTime: string; // ISO datetime (UTC)
  endTime: string; // ISO datetime (UTC)
  breakMinutes: number; // unpaid break length in minutes
  notes: string | null;
  status: ShiftScheduleStatus;
  publishedAt: string | null;
  publishedById: string | null;
  createdAt: string;
  updatedAt: string;
  branch: ShiftScheduleRelation;
  user: ShiftScheduleRelation;
  device: ShiftScheduleRelation | null;
  publishedBy: ShiftScheduleRelation | null;
  // Present only on calendar-expanded pattern instances (GET /range): the id of
  // the underlying pattern row, so editing an instance edits the pattern.
  patternId?: string;
};

// Create payload — mirrors the server `createScheduleDto`. Dates are sent as
// ISO strings; the API coerces them with `z.coerce.date()`.
export type CreateShiftScheduleInput = {
  branchId: string;
  userId: string;
  deviceId?: string;
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes?: number;
  notes?: string;
};

// Update payload — mirrors the server `updateScheduleDto`. `deviceId` and
// `notes` accept `null` to explicitly clear them.
export type UpdateShiftScheduleInput = {
  userId?: string;
  deviceId?: string | null;
  date?: string;
  daysOfWeek?: number[]; // recurring patterns only
  effectiveFrom?: string | null; // null clears (ongoing)
  effectiveTo?: string | null; // null clears (ongoing)
  startTime?: string;
  endTime?: string;
  breakMinutes?: number;
  notes?: string | null;
};

// Recurring (dateless) pattern payload — mirrors the server
// `CreateRecurringScheduleDto`. `daysOfWeek` uses 0 = Sunday … 6 = Saturday;
// `startTime`/`endTime` are wall-clock "HH:MM". No calendar date.
export type CreateRecurringShiftScheduleInput = {
  branchId: string;
  userId: string;
  deviceId?: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  effectiveFrom?: string; // "YYYY-MM-DD"; omit for open start
  effectiveTo?: string; // "YYYY-MM-DD"; omit for ongoing
  breakMinutes?: number;
  notes?: string;
};

// Filters for the paginated list (GET /shift-schedules).
export type ShiftScheduleQuery = {
  branchId?: string;
  userId?: string;
  status?: ShiftScheduleStatus;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

// Filters for the bounded, non-paginated calendar feed (GET /shift-schedules/range).
export type ShiftScheduleRangeQuery = {
  from: string;
  to: string;
  branchId?: string;
  userId?: string;
};

// Result of the bulk publish/unpublish endpoints. Exactly one of the counts is
// present depending on the operation; `ids` always echoes the affected rows.
export type ShiftScheduleBulkResult = {
  ids: string[];
  published?: number;
  unpublished?: number;
};
