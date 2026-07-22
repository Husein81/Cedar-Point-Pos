import type { ShiftScheduleView } from "@/dto/shiftSchedule.dto";
import { getInitials } from "@/utils/getInitials";
import {
  formatScheduleTime,
  scheduleDateKey,
  toDateInputValue,
} from "@/utils/shiftScheduleTime";
import {
  SCHEDULE_STATUS_BADGE,
  SCHEDULE_STATUS_LABELS,
} from "@/constants/shiftSchedule";
import { Avatar, cn } from "@repo/ui";
import { useMemo } from "react";

const DAYS_IN_WEEK = 7;

type Props = {
  schedules: ShiftScheduleView[];
  /** Monday of the visible week (local midnight). */
  weekStart: Date;
  onEventClick: (schedule: ShiftScheduleView) => void;
  onCellClick: (date: Date, userId: string) => void;
};

type EmployeeRow = {
  userId: string;
  name: string;
};

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const WeekGrid = ({
  schedules,
  weekStart,
  onEventClick,
  onCellClick,
}: Props) => {
  const days = useMemo(
    () =>
      Array.from({ length: DAYS_IN_WEEK }, (_, index) =>
        addDays(weekStart, index)
      ),
    [weekStart]
  );

  // Unique employees present in the visible schedules, sorted by name.
  const employees = useMemo<EmployeeRow[]>(() => {
    const byId = new Map<string, string>();
    for (const schedule of schedules) {
      byId.set(schedule.userId, schedule.user.name);
    }
    return Array.from(byId, ([userId, name]) => ({ userId, name })).sort(
      (a, b) => a.name.localeCompare(b.name)
    );
  }, [schedules]);

  // userId → dayKey → schedules for O(1) cell lookups during render.
  const byEmployeeAndDay = useMemo(() => {
    const map = new Map<string, Map<string, ShiftScheduleView[]>>();
    for (const schedule of schedules) {
      // Range feed always carries a concrete date (patterns arrive pre-expanded);
      // skip defensively so a dateless row can never land in a day cell.
      if (!schedule.date) continue;
      const dayKey = scheduleDateKey(schedule.date);
      const dayMap = map.get(schedule.userId) ?? new Map();
      const cell = dayMap.get(dayKey) ?? [];
      cell.push(schedule);
      dayMap.set(dayKey, cell);
      map.set(schedule.userId, dayMap);
    }
    return map;
  }, [schedules]);

  if (employees.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-border/40 text-muted-foreground">
        No schedules for this week.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/40 shadow-sm">
      <div className="min-w-[900px]">
        {/* Header: corner + day columns */}
        <div className="grid grid-cols-[180px_repeat(7,1fr)] border-b border-border/60 bg-muted/30">
          <div className="px-3 py-2 text-sm font-semibold text-muted-foreground">
            Employee
          </div>
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className="border-l border-border/40 px-3 py-2 text-center text-sm font-medium"
            >
              {day.toLocaleDateString("en-US", {
                weekday: "short",
                day: "numeric",
              })}
            </div>
          ))}
        </div>

        {/* Employee rows */}
        {employees.map((employee) => {
          const dayMap = byEmployeeAndDay.get(employee.userId);
          return (
            <div
              key={employee.userId}
              className="grid grid-cols-[180px_repeat(7,1fr)] border-b border-border/40 last:border-b-0"
            >
              <div className="flex items-center gap-2 px-3 py-3">
                <Avatar
                  fallback={getInitials(employee.name)}
                  className="h-7 w-7 bg-primary/10 text-primary text-xs"
                />
                <span className="truncate text-sm font-medium">
                  {employee.name}
                </span>
              </div>

              {days.map((day) => {
                const dayKey = toDateInputValue(day);
                const cellSchedules = dayMap?.get(dayKey) ?? [];
                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => onCellClick(day, employee.userId)}
                    className="min-h-16 cursor-pointer space-y-1 border-l border-border/40 p-1.5 text-left transition-colors hover:bg-muted/40"
                  >
                    {cellSchedules.map((schedule) => {
                      const { variant, className } =
                        SCHEDULE_STATUS_BADGE[schedule.status];
                      return (
                        <span
                          key={schedule.id}
                          role="button"
                          tabIndex={0}
                          title={SCHEDULE_STATUS_LABELS[schedule.status]}
                          onClick={(event) => {
                            event.stopPropagation();
                            onEventClick(schedule);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.stopPropagation();
                              onEventClick(schedule);
                            }
                          }}
                          className={cn(
                            "block rounded-md border px-2 py-1 text-xs",
                            variant === "default" &&
                              "border-transparent bg-primary text-primary-foreground",
                            variant === "secondary" &&
                              "border-transparent bg-secondary text-secondary-foreground",
                            variant === "outline" && "bg-background",
                            className
                          )}
                        >
                          {formatScheduleTime(schedule.startTime)}–
                          {formatScheduleTime(schedule.endTime)}
                          {schedule.breakMinutes > 0 && (
                            <span className="block opacity-80">
                              {schedule.breakMinutes}m break
                            </span>
                          )}
                          {schedule.device && (
                            <span className="block truncate opacity-80">
                              {schedule.device.name}
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
