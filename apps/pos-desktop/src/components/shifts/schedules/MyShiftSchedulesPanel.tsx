import { useMemo } from "react";
import { Badge, Icon, Shad } from "@repo/ui";
import { useMySchedules } from "@/hooks/useShiftSchedules";
import { useBranchStore } from "@/store/branchStore";
import type { ShiftScheduleStatus } from "@repo/types";
import Heading from "@/components/heading";

const SCHEDULE_STATUS_VARIANTS: Record<
  ShiftScheduleStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "secondary",
  PUBLISHED: "default",
  STARTED: "outline",
  CANCELLED: "destructive",
};

const SCHEDULE_STATUS_LABELS: Record<ShiftScheduleStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  STARTED: "Started",
  CANCELLED: "Cancelled",
};

const formatDate = (date: string | Date) =>
  new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatTime = (date: string | Date) =>
  new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

export const MyShiftSchedulesPanel = () => {
  const { branchId } = useBranchStore();
  const { data, isLoading } = useMySchedules({
    branchId: branchId ?? undefined,
    limit: 50,
  });

  const schedules = useMemo(() => data?.data ?? [], [data]);

  const upcoming = useMemo(
    () =>
      schedules
        .filter(
          (s) => s.status === "PUBLISHED" && new Date(s.date) >= new Date(),
        )
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        ),
    [schedules],
  );

  const past = useMemo(
    () =>
      schedules
        .filter(
          (s) => s.status !== "PUBLISHED" || new Date(s.date) < new Date(),
        )
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
    [schedules],
  );

  return (
    <div className="pt-4">
      <div className="mx-auto space-y-6">
        <Heading
          title="My Schedules"
          subtitle="View your assigned shift schedules"
          href="/shifts"
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Icon
              name="Loader2"
              className="h-6 w-6 animate-spin text-muted-foreground"
            />
          </div>
        ) : schedules.length === 0 ? (
          <Shad.Card className="p-8 text-center">
            <Icon
              name="CalendarX2"
              className="h-12 w-12 mx-auto text-muted-foreground mb-3"
            />
            <p className="text-muted-foreground">
              No schedules assigned to you yet.
            </p>
          </Shad.Card>
        ) : (
          <>
            {/* Upcoming Schedules */}
            {upcoming.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Icon name="CalendarCheck" className="h-5 w-5" />
                  Upcoming
                </h2>
                <div className="grid gap-3">
                  {upcoming.map((schedule) => (
                    <Shad.Card key={schedule.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Icon
                              name="Clock"
                              className="h-5 w-5 text-primary"
                            />
                          </div>
                          <div>
                            <p className="font-medium">
                              {formatDate(String(schedule.date))}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatTime(String(schedule.startTime))} –{" "}
                              {formatTime(String(schedule.endTime))}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            SCHEDULE_STATUS_VARIANTS[
                              schedule.status as ShiftScheduleStatus
                            ] ?? "secondary"
                          }
                        >
                          {SCHEDULE_STATUS_LABELS[
                            schedule.status as ShiftScheduleStatus
                          ] ?? schedule.status}
                        </Badge>
                      </div>
                      {schedule.notes && (
                        <p className="mt-2 text-sm text-muted-foreground pl-[52px]">
                          {schedule.notes}
                        </p>
                      )}
                    </Shad.Card>
                  ))}
                </div>
              </div>
            )}

            {/* Past / Other Schedules */}
            {past.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Icon name="CalendarDays" className="h-5 w-5" />
                  Past & Other
                </h2>
                <div className="grid gap-3">
                  {past.map((schedule) => (
                    <Shad.Card key={schedule.id} className="p-4 opacity-75">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <Icon
                              name="Clock"
                              className="h-5 w-5 text-muted-foreground"
                            />
                          </div>
                          <div>
                            <p className="font-medium">
                              {formatDate(String(schedule.date))}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatTime(String(schedule.startTime))} –{" "}
                              {formatTime(String(schedule.endTime))}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            SCHEDULE_STATUS_VARIANTS[
                              schedule.status as ShiftScheduleStatus
                            ] ?? "secondary"
                          }
                        >
                          {SCHEDULE_STATUS_LABELS[
                            schedule.status as ShiftScheduleStatus
                          ] ?? schedule.status}
                        </Badge>
                      </div>
                      {schedule.notes && (
                        <p className="mt-2 text-sm text-muted-foreground pl-[52px]">
                          {schedule.notes}
                        </p>
                      )}
                    </Shad.Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
