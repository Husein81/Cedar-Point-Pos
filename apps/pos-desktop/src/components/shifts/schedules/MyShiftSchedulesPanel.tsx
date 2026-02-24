import { useMemo, useState } from "react";
import { Button, Icon, Skeleton, Shad, cn } from "@repo/ui";
import { useMySchedules } from "@/hooks/useShiftSchedules";
import { useBranchStore } from "@/store/branchStore";
import type {
  ScheduleFilters,
  ShiftScheduleWithRelations,
} from "@/dto/shift.dto";
import Heading from "@/components/heading";
import { MySchedulesWeekView } from "./MySchedulesWeekView";
import { MySchedulesListView } from "./MySchedulesListView";
import { MyScheduleDetailsDialog } from "./MyScheduleDetailsDialog";
import { formatWeekRangeDate } from "./scheduleUi";

type ViewMode = "calendar" | "list";

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getStartOfWeek = (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
};

export const MyShiftSchedulesPanel = () => {
  const { branchId } = useBranchStore();
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [weekAnchor, setWeekAnchor] = useState<Date>(new Date());
  const [selectedSchedule, setSelectedSchedule] =
    useState<ShiftScheduleWithRelations | null>(null);

  const weekStart = useMemo(() => getStartOfWeek(weekAnchor), [weekAnchor]);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  const filters = useMemo<ScheduleFilters>(
    () => ({
      branchId: branchId ?? undefined,
      limit: 100,
      ...(viewMode === "calendar" && {
        from: weekStart,
        to: weekEnd,
      }),
    }),
    [branchId, viewMode, weekStart, weekEnd],
  );

  const { data, isLoading, isFetching, isError, refetch } = useMySchedules(
    filters,
  );

  const schedules = useMemo(() => data?.data ?? [], [data]);

  const upcoming = useMemo(() => {
    const now = Date.now();

    return schedules
      .filter((schedule) => new Date(schedule.startTime).getTime() >= now)
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
  }, [schedules]);

  const pastOther = useMemo(() => {
    const now = Date.now();

    return schedules
      .filter(
        (schedule) =>
          new Date(schedule.startTime).getTime() < now ||
          (schedule.status !== "PUBLISHED" && schedule.status !== "STARTED"),
      )
      .sort(
        (a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
      );
  }, [schedules]);

  const handleOpenDetails = (schedule: ShiftScheduleWithRelations) =>
    setSelectedSchedule(schedule);

  return (
    <div className="fixed inset-x-0 top-12 bottom-8 flex flex-col bg-background">
      <div className="flex-1 min-h-0 px-6 py-4">
        <div className="mx-auto flex h-full flex-col gap-6">
          <Heading
            title="My Schedules"
            subtitle="View your assigned shift schedules"
            href="/shifts"
          />

          <Shad.Card className="p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={viewMode === "calendar" ? "default" : "outline"}
                  onClick={() => setViewMode("calendar")}
                >
                  <Icon name="CalendarDays" className="h-4 w-4 mr-1" />
                  Calendar
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "list" ? "default" : "outline"}
                  onClick={() => setViewMode("list")}
                >
                  List
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {viewMode === "calendar" ? (
                  <>
                    <div className="flex items-center gap-1">
                      <Button size="sm">Week</Button>
                      <Button size="sm" variant="outline" disabled>
                        Month
                      </Button>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setWeekAnchor((prev) => addDays(prev, -7))}
                    >
                      <Icon name="ChevronLeft" className="h-4 w-4" />
                    </Button>

                    <p className="text-sm font-medium min-w-[180px] text-center">
                      {formatWeekRangeDate(weekStart)} -{" "}
                      {formatWeekRangeDate(weekEnd)}
                    </p>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setWeekAnchor((prev) => addDays(prev, 7))}
                    >
                      <Icon name="ChevronRight" className="h-4 w-4" />
                    </Button>
                  </>
                ) : null}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refetch()}
                  disabled={isFetching}
                >
                  <Icon
                    name="RefreshCw"
                    className={cn("h-4 w-4 mr-1", isFetching && "animate-spin")}
                  />
                  Refresh
                </Button>
              </div>
            </div>
          </Shad.Card>

          <div className="flex-1 min-h-0">
            {isLoading ? (
              <div className="space-y-3">
                <Shad.Card className="p-4">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-44" />
                    <Skeleton className="h-4 w-60" />
                  </div>
                </Shad.Card>
                <Shad.Card className="p-4">
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-16 w-full" />
                    ))}
                  </div>
                </Shad.Card>
              </div>
            ) : isError ? (
              <Shad.Card className="p-8">
                <div className="text-center space-y-3">
                  <Icon
                    name="CircleAlert"
                    className="h-10 w-10 text-destructive mx-auto"
                  />
                  <p className="text-sm text-muted-foreground">
                    Failed to load schedules.
                  </p>
                  <Button size="sm" variant="outline" onClick={() => refetch()}>
                    <Icon name="RefreshCw" className="h-4 w-4 mr-1" />
                    Retry
                  </Button>
                </div>
              </Shad.Card>
            ) : viewMode === "calendar" ? (
              <MySchedulesWeekView
                schedules={schedules}
                weekStart={weekStart}
                onOpenDetails={handleOpenDetails}
              />
            ) : (
              <Shad.ScrollArea className="h-full pr-1">
                <MySchedulesListView
                  upcoming={upcoming}
                  pastOther={pastOther}
                  onOpenDetails={handleOpenDetails}
                />
                <Shad.ScrollBar />
              </Shad.ScrollArea>
            )}
          </div>
        </div>
      </div>

      <MyScheduleDetailsDialog
        open={!!selectedSchedule}
        schedule={selectedSchedule}
        onClose={() => setSelectedSchedule(null)}
      />
    </div>
  );
};
