// Shift-schedule time helpers.
//
// Contract: a schedule's calendar day and wall-clock start/end are treated as
// UTC end-to-end. The value a manager types is the value displayed, and the
// API's day-consistency rule (date === startTime's UTC day) always holds. All
// formatting below pins `timeZone: "UTC"` so display never drifts by timezone.

const pad = (n: number): string => String(n).padStart(2, "0");

/** Local Y/M/D of a picked Date → "YYYY-MM-DD" (no timezone drift). */
export const toDateInputValue = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Parse a "YYYY-MM-DD" string into a local midnight Date for the date picker. */
export const parseDateInputValue = (
  value: string | null | undefined
): Date | undefined => {
  if (typeof value !== "string" || !value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
};

/** The "YYYY-MM-DD" calendar key for a schedule (UTC). */
export const scheduleDateKey = (iso: string): string => iso.slice(0, 10);

/** Build the UTC ISO timestamps the schedule API expects. */
export const buildScheduleTimestamps = (
  dateStr: string,
  startHHMM: string,
  endHHMM: string
): { date: string; startTime: string; endTime: string } => ({
  date: `${dateStr}T00:00:00.000Z`,
  startTime: `${dateStr}T${startHHMM}:00.000Z`,
  endTime: `${dateStr}T${endHHMM}:00.000Z`,
});

// Short weekday labels indexed by getUTCDay() (0 = Sunday … 6 = Saturday).
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Format a recurring pattern's `daysOfWeek` compactly. Collapses a fully
 * contiguous Mon–Fri style run into a range ("Mon–Fri"); otherwise lists them
 * in week order ("Mon, Wed, Fri"). Empty → "—".
 */
export const formatDaysOfWeek = (days: number[]): string => {
  // Order Monday-first so ranges read naturally (Sunday last).
  const order = [1, 2, 3, 4, 5, 6, 0];
  const present = order.filter((d) => days.includes(d));
  const first = present[0];
  if (first === undefined) return "—";

  const labels = present.map((d) => WEEKDAY_LABELS[d] ?? "");
  // Contiguous run in the Monday-first ordering → render as a range.
  const firstIdx = order.indexOf(first);
  const isContiguous =
    present.length > 2 && present.every((d, i) => order[firstIdx + i] === d);
  return isContiguous
    ? `${labels[0] ?? ""}–${labels.at(-1) ?? ""}`
    : labels.join(", ");
};

/** "Jun 23" (UTC) — compact month + day. */
export const formatShortDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

/**
 * Human label for a recurring pattern's optional window. Empty when unbounded
 * (repeats forever). e.g. "Jun 1 – Aug 31", "from Jun 1", "until Aug 31".
 */
export const formatScheduleWindow = (
  from: string | null,
  to: string | null
): string => {
  if (from && to) return `${formatShortDate(from)} – ${formatShortDate(to)}`;
  if (from) return `from ${formatShortDate(from)}`;
  if (to) return `until ${formatShortDate(to)}`;
  return "";
};

/** "Mon, Jun 23" (UTC). */
export const formatScheduleDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

/** "09:00" 24-hour (UTC) — also the value for a prefilled time input. */
export const formatScheduleTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });

/** Paid hours after subtracting the unpaid break, rounded to 1 decimal. */
export const schedulePaidHours = (
  startIso: string,
  endIso: string,
  breakMinutes: number
): number => {
  const grossMs = new Date(endIso).getTime() - new Date(startIso).getTime();
  const paidMs = grossMs - breakMinutes * 60_000;
  return Math.round((paidMs / 3_600_000) * 10) / 10;
};

/** Paid hours after subtracting the unpaid break, e.g. "7.5h". */
export const schedulePaidHoursLabel = (
  startIso: string,
  endIso: string,
  breakMinutes: number
): string => `${schedulePaidHours(startIso, endIso, breakMinutes)}h`;
