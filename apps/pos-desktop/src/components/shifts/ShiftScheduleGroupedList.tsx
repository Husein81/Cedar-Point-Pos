import { ShiftScheduleActions } from "./ShiftScheduleActions";
import { ShiftScheduleStatusBadge } from "./ShiftScheduleStatusBadge";
import type { ShiftScheduleView } from "@/dto/shiftSchedule.dto";
import { getInitials } from "@/utils/getInitials";
import {
  formatDaysOfWeek,
  formatScheduleDate,
  formatScheduleTime,
  formatScheduleWindow,
  schedulePaidHours,
} from "@/utils/shiftScheduleTime";
import { Avatar, cn, Icon, Shad, Skeleton } from "@repo/ui";
import { useMemo } from "react";

type Props = {
  schedules: ShiftScheduleView[];
  isLoading?: boolean;
};

type EmployeeGroup = {
  userId: string;
  name: string;
  shifts: ShiftScheduleView[];
  totalHours: number;
};

/** Sort: recurring patterns first, then dated by date, then by start time. */
const sortShifts = (a: ShiftScheduleView, b: ShiftScheduleView): number => {
  if (a.isRecurring !== b.isRecurring) return a.isRecurring ? -1 : 1;
  const dateCmp = (a.date ?? "").localeCompare(b.date ?? "");
  if (dateCmp !== 0) return dateCmp;
  return a.startTime.localeCompare(b.startTime);
};

export const ShiftScheduleGroupedList = ({ schedules, isLoading }: Props) => {
  const groups = useMemo<EmployeeGroup[]>(() => {
    const byId = new Map<string, EmployeeGroup>();
    for (const shift of schedules) {
      const group = byId.get(shift.userId) ?? {
        userId: shift.userId,
        name: shift.user.name,
        shifts: [],
        totalHours: 0,
      };
      group.shifts.push(shift);
      group.totalHours += schedulePaidHours(
        shift.startTime,
        shift.endTime,
        shift.breakMinutes
      );
      byId.set(shift.userId, group);
    }
    return Array.from(byId.values())
      .map((g) => ({
        ...g,
        totalHours: Math.round(g.totalHours * 10) / 10,
        shifts: g.shifts.sort(sortShifts),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [schedules]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-border/40 text-muted-foreground">
        No schedules found.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <Shad.Collapsible
          key={group.userId}
          defaultOpen={groups.length <= 3}
          className="rounded-xl border border-border/50 bg-card"
        >
          <Shad.CollapsibleTrigger className="group flex w-full items-center gap-3 px-4 py-3 text-left">
            <Icon
              name="ChevronRight"
              className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90"
            />
            <Avatar
              fallback={getInitials(group.name)}
              className="size-8 bg-primary/10 text-primary text-xs"
            />
            <span className="font-medium">{group.name}</span>
            <span className="ml-auto text-sm text-muted-foreground">
              {group.shifts.length} shift{group.shifts.length === 1 ? "" : "s"}
              {" · "}
              {group.totalHours}h
            </span>
          </Shad.CollapsibleTrigger>

          <Shad.CollapsibleContent>
            <div className="divide-y divide-border/40 border-t border-border/40">
              {group.shifts.map((shift) => (
                <div
                  key={shift.id}
                  className="grid grid-cols-[1.4fr_1fr_1fr_auto_auto] items-center gap-3 px-4 py-2.5 text-sm"
                >
                  {/* When */}
                  <div>
                    {shift.isRecurring ? (
                      <>
                        <span className="font-medium">Weekly</span>
                        <span className="block text-xs text-muted-foreground">
                          {formatDaysOfWeek(shift.daysOfWeek)}
                          {formatScheduleWindow(
                            shift.effectiveFrom,
                            shift.effectiveTo
                          ) && (
                            <> · {formatScheduleWindow(
                              shift.effectiveFrom,
                              shift.effectiveTo
                            )}</>
                          )}
                        </span>
                      </>
                    ) : (
                      <span>
                        {shift.date ? formatScheduleDate(shift.date) : "—"}
                      </span>
                    )}
                  </div>

                  {/* Time */}
                  <span className="text-muted-foreground">
                    {formatScheduleTime(shift.startTime)} –{" "}
                    {formatScheduleTime(shift.endTime)}
                  </span>

                  {/* Paid hours */}
                  <span className="text-muted-foreground">
                    {schedulePaidHours(
                      shift.startTime,
                      shift.endTime,
                      shift.breakMinutes
                    )}
                    h
                    {shift.breakMinutes > 0 && (
                      <span className="block text-xs">
                        {shift.breakMinutes}m break
                      </span>
                    )}
                  </span>

                  <ShiftScheduleStatusBadge status={shift.status} />

                  <div className={cn("justify-self-end")}>
                    <ShiftScheduleActions schedule={shift} />
                  </div>
                </div>
              ))}
            </div>
          </Shad.CollapsibleContent>
        </Shad.Collapsible>
      ))}
    </div>
  );
};
