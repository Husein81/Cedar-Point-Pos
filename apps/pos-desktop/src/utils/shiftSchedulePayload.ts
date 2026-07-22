import { SHIFT_PATTERN_SENTINEL_DAY } from "@repo/types";
import type {
  CreateRecurringShiftScheduleInput,
  CreateShiftScheduleInput,
  UpdateShiftScheduleInput,
} from "@/dto/shiftSchedule.dto";
import { buildScheduleTimestamps } from "./shiftScheduleTime";

// Raw values collected by ShiftScheduleForm. Kept here so the payload mappers
// are pure and unit-testable without mounting the form / hooks / modal store.
export type ShiftScheduleFormValues = {
  branchId: string;
  userId: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  breakMinutes: string;
  notes: string;
  repeat: boolean;
  daysOfWeek: number[];
  effectiveFrom: string; // "YYYY-MM-DD" | ""
  effectiveTo: string; // "YYYY-MM-DD" | ""
};

/** Anchor a recurring pattern's "HH:MM" to the shared sentinel day (see @repo/types). */
const sentinelIso = (hhmm: string): string =>
  `${SHIFT_PATTERN_SENTINEL_DAY}T${hhmm}:00.000Z`;

const toBreak = (value: string): number => Number(value) || 0;

/** Dated one-off → POST /shifts/schedules */
export const toDatedCreate = (
  v: ShiftScheduleFormValues
): CreateShiftScheduleInput => {
  const breakMinutes = toBreak(v.breakMinutes);
  return {
    branchId: v.branchId,
    userId: v.userId,
    ...buildScheduleTimestamps(v.date, v.startTime, v.endTime),
    breakMinutes: breakMinutes || undefined,
    notes: v.notes || undefined,
  };
};

/** Dateless recurring pattern → POST /shifts/schedules/recurring */
export const toRecurringCreate = (
  v: ShiftScheduleFormValues
): CreateRecurringShiftScheduleInput => {
  const breakMinutes = toBreak(v.breakMinutes);
  return {
    branchId: v.branchId,
    userId: v.userId,
    daysOfWeek: v.daysOfWeek,
    startTime: v.startTime,
    endTime: v.endTime,
    effectiveFrom: v.effectiveFrom || undefined,
    effectiveTo: v.effectiveTo || undefined,
    breakMinutes: breakMinutes || undefined,
    notes: v.notes || undefined,
  };
};

/** Dated one-off edit → PATCH /shifts/schedules/:id */
export const toDatedUpdate = (
  v: ShiftScheduleFormValues
): UpdateShiftScheduleInput => ({
  userId: v.userId,
  ...buildScheduleTimestamps(v.date, v.startTime, v.endTime),
  breakMinutes: toBreak(v.breakMinutes),
  notes: v.notes || null,
});

/** Recurring pattern edit → PATCH /shifts/schedules/:id (empty bound => null clears). */
export const toRecurringUpdate = (
  v: ShiftScheduleFormValues
): UpdateShiftScheduleInput => ({
  userId: v.userId,
  daysOfWeek: v.daysOfWeek,
  effectiveFrom: v.effectiveFrom || null,
  effectiveTo: v.effectiveTo || null,
  startTime: sentinelIso(v.startTime),
  endTime: sentinelIso(v.endTime),
  breakMinutes: toBreak(v.breakMinutes),
  notes: v.notes || null,
});
