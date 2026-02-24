import { Badge, Icon, Shad, cn } from "@repo/ui";
import type { ShiftScheduleWithRelations } from "@/dto/shift.dto";
import type { ShiftScheduleStatus } from "@repo/types";
import {
  getLocalDayKey,
  getScheduleAdjustedEnd,
  splitShiftAcrossDays,
  type ShiftCalendarSegment,
} from "./scheduleCalendarUtils";
import {
  SCHEDULE_STATUS_DOT_CLASSES,
  SCHEDULE_STATUS_LABELS,
  SCHEDULE_STATUS_VARIANTS,
  formatScheduleTime,
} from "./scheduleUi";

type Props = {
  schedules: ShiftScheduleWithRelations[];
  weekStart: Date;
  onOpenDetails: (schedule: ShiftScheduleWithRelations) => void;
};

const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 28;
const TOTAL_SLOTS = (24 * 60) / SLOT_MINUTES;

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const toStartOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getSlotLabel = (slotIndex: number) => {
  const hour = Math.floor(slotIndex / 2);
  const minute = slotIndex % 2 === 0 ? 0 : 30;
  if (minute !== 0) return "";

  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const getEventPosition = (segment: ShiftCalendarSegment) => {
  const start = segment.segmentStart;
  const end = segment.segmentEnd;
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endIsNextDayMidnight =
    end.toDateString() !== start.toDateString() &&
    end.getHours() === 0 &&
    end.getMinutes() === 0;
  const endMinutes = endIsNextDayMidnight
    ? 24 * 60
    : end.getHours() * 60 + end.getMinutes();
  const durationMinutes = Math.max(endMinutes - startMinutes, SLOT_MINUTES);

  return {
    top: (startMinutes / SLOT_MINUTES) * SLOT_HEIGHT,
    height: Math.max((durationMinutes / SLOT_MINUTES) * SLOT_HEIGHT, SLOT_HEIGHT),
  };
};

const formatSegmentRange = (segment: ShiftCalendarSegment) => {
  const end = segment.segmentEnd;
  const start = segment.segmentStart;
  const endsAtDayBoundary =
    end.toDateString() !== start.toDateString() &&
    end.getHours() === 0 &&
    end.getMinutes() === 0;

  const displayEnd = endsAtDayBoundary
    ? new Date(end.getTime() - 60 * 1000)
    : end;

  return `${formatScheduleTime(start)} - ${formatScheduleTime(displayEnd)}`;
};

export const MySchedulesWeekView = ({
  schedules,
  weekStart,
  onOpenDetails,
}: Props) => {
  const nowMs = Date.now();
  const normalizedWeekStart = toStartOfDay(weekStart);
  const weekEnd = addDays(normalizedWeekStart, 7);

  const days = Array.from({ length: 7 }, (_, dayOffset) =>
    addDays(normalizedWeekStart, dayOffset),
  );

  const segments = schedules
    .flatMap((schedule) =>
      splitShiftAcrossDays(schedule, normalizedWeekStart, weekEnd),
    )
    .sort(
      (a, b) =>
        a.segmentStart.getTime() - b.segmentStart.getTime() ||
        a.segmentEnd.getTime() - b.segmentEnd.getTime(),
    );

  if (segments.length === 0) {
    return (
      <Shad.Card className="p-8">
        <div className="text-center space-y-2">
          <Icon
            name="CalendarX2"
            className="h-10 w-10 text-muted-foreground mx-auto"
          />
          <p className="text-sm text-muted-foreground">
            No schedules for this week.
          </p>
        </div>
      </Shad.Card>
    );
  }

  const groupedSegments = days.map((day) => {
    const dayKey = getLocalDayKey(day);
    return segments.filter((segment) => segment.dayKey === dayKey);
  });

  return (
    <Shad.Card className="h-full overflow-hidden">
      <Shad.ScrollArea className="h-full">
        <div className="min-w-[900px]">
          <div className="sticky top-0 z-20 grid grid-cols-[88px_repeat(7,minmax(0,1fr))] border-b bg-background">
            <div className="h-16 border-r px-2 py-3 text-xs text-muted-foreground">
              Time
            </div>
            {days.map((day, index) => (
              <div key={day.toISOString()} className="h-16 border-r px-3 py-2">
                <p className="text-xs text-muted-foreground">{DAY_NAMES[index]}</p>
                <p className="text-sm font-medium">
                  {day.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[88px_repeat(7,minmax(0,1fr))]">
            <div className="border-r bg-background">
              {Array.from({ length: TOTAL_SLOTS }, (_, slotIndex) => (
                <div
                  key={`time-${slotIndex}`}
                  className="h-7 border-b border-border/40 px-2 text-[11px] text-muted-foreground"
                >
                  {getSlotLabel(slotIndex)}
                </div>
              ))}
            </div>

            {groupedSegments.map((daySegments, dayIndex) => (
              <div
                key={`day-column-${dayIndex}`}
                className="relative border-r bg-background"
                style={{ height: `${TOTAL_SLOTS * SLOT_HEIGHT}px` }}
              >
                {Array.from({ length: TOTAL_SLOTS }, (_, slotIndex) => (
                  <div
                    key={`cell-${dayIndex}-${slotIndex}`}
                    className="h-7 border-b border-border/40"
                  />
                ))}

                {daySegments.map((segment, segmentIndex) => {
                  const schedule = segment.schedule;
                  const status = schedule.status as ShiftScheduleStatus;
                  const position = getEventPosition(segment);
                  const overlapOffset = Math.min(segmentIndex * 6, 18);
                  const isPast = getScheduleAdjustedEnd(schedule).getTime() < nowMs;

                  return (
                    <button
                      key={`${schedule.id}-${segment.segmentStart.toISOString()}`}
                      onClick={() => onOpenDetails(schedule)}
                      className={cn(
                        "absolute z-10 flex h-auto w-auto flex-col items-start justify-start gap-1 overflow-hidden rounded-md border bg-background/95 px-2 py-1 text-left shadow-sm",
                        "hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/60 outline-none",
                        isPast &&
                          "border-border bg-muted/80 text-muted-foreground hover:bg-muted/90",
                      )}
                      style={{
                        top: `${position.top}px`,
                        height: `${position.height}px`,
                        left: `${4 + overlapOffset}px`,
                        right: "4px",
                      }}
                    >
                      <div className="flex w-full items-center justify-between gap-1">
                        <span
                          className={cn(
                            "truncate text-[11px] font-medium",
                            isPast && "line-through",
                          )}
                        >
                          {formatSegmentRange(segment)}
                        </span>
                        {isPast ? (
                          <Icon
                            name="CircleCheck"
                            className="h-3.5 w-3.5 shrink-0 text-emerald-600"
                          />
                        ) : (
                          <span
                            className={cn(
                              "h-2 w-2 shrink-0 rounded-full",
                              SCHEDULE_STATUS_DOT_CLASSES[status] ?? "bg-muted",
                            )}
                          />
                        )}
                      </div>
                      {schedule.branch?.name ? (
                        <p className="w-full truncate text-[11px] text-muted-foreground">
                          {schedule.branch.name}
                        </p>
                      ) : null}
                      <Badge
                        variant={SCHEDULE_STATUS_VARIANTS[status] ?? "secondary"}
                        className={cn("text-[10px]", isPast && "opacity-80")}
                      >
                        {SCHEDULE_STATUS_LABELS[status] ?? schedule.status}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <Shad.ScrollBar orientation="horizontal" />
      </Shad.ScrollArea>
    </Shad.Card>
  );
};
