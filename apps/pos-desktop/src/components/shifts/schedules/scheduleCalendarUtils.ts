import type { ShiftScheduleWithRelations } from "@/dto/shift.dto";

export type ShiftCalendarSegment = {
  schedule: ShiftScheduleWithRelations;
  dayKey: string;
  segmentStart: Date;
  segmentEnd: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (value: number) => String(value).padStart(2, "0");

const toDayKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const maxDate = (a: Date, b: Date) => (a > b ? a : b);
const minDate = (a: Date, b: Date) => (a < b ? a : b);

const normalizeScheduleBounds = (schedule: ShiftScheduleWithRelations) => {
  const start = new Date(schedule.startTime);
  const end = new Date(schedule.endTime);

  if (end > start) {
    return { start, end };
  }

  // Defensive fallback in case we ever receive end <= start (overnight value shape).
  return {
    start,
    end: new Date(end.getTime() + DAY_MS),
  };
};

export const getScheduleAdjustedEnd = (schedule: ShiftScheduleWithRelations) => {
  const { end } = normalizeScheduleBounds(schedule);
  return end;
};

export const splitShiftAcrossDays = (
  schedule: ShiftScheduleWithRelations,
  visibleStart: Date,
  visibleEnd: Date,
): ShiftCalendarSegment[] => {
  if (visibleEnd <= visibleStart) return [];

  const { start, end } = normalizeScheduleBounds(schedule);

  const clippedStart = maxDate(start, visibleStart);
  const clippedEnd = minDate(end, visibleEnd);

  if (clippedEnd <= clippedStart) return [];

  const segments: ShiftCalendarSegment[] = [];
  let cursorDay = startOfDay(clippedStart);
  const lastMoment = new Date(clippedEnd.getTime() - 1);
  const endDay = startOfDay(lastMoment);

  while (cursorDay <= endDay) {
    const dayStart = cursorDay;
    const dayEnd = addDays(dayStart, 1);

    const segmentStart = maxDate(clippedStart, dayStart);
    const segmentEnd = minDate(clippedEnd, dayEnd);

    if (segmentEnd > segmentStart) {
      segments.push({
        schedule,
        dayKey: toDayKey(dayStart),
        segmentStart,
        segmentEnd,
      });
    }

    cursorDay = addDays(cursorDay, 1);
  }

  return segments;
};

export const getLocalDayKey = (date: Date) => toDayKey(date);

