import { ShiftScheduleForm } from "@/components/shifts/ShiftScheduleForm";
import { ShiftScheduleGroupedList } from "@/components/shifts/ShiftScheduleGroupedList";
import { WeekGrid } from "@/components/shifts/WeekGrid";
import TitleBar from "@/components/title-bar";
import { SCHEDULE_STATUS_LABELS } from "@/constants/shiftSchedule";
import { useBranches } from "@/hooks/useBranch";
import {
  usePublishShiftSchedules,
  useShiftScheduleList,
  useShiftScheduleRange,
} from "@/hooks/useShiftSchedule";
import { useStaffList } from "@/hooks/useStaff";
import { useAuthStore } from "@/store/authStore";
import { useModalStore } from "@/store/modalStore";
import type {
  ShiftScheduleQuery,
  ShiftScheduleRangeQuery,
} from "@/dto/shiftSchedule.dto";
import { toDateInputValue } from "@/utils/shiftScheduleTime";
import { ShiftScheduleStatus, UserRole } from "@repo/types";
import { Button, Select, Skeleton } from "@repo/ui";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/shifts/")({
  component: RouteComponent,
  staticData: {
    breadcrumb: "Shifts",
  },
});

const ALL = "ALL";
// The list groups by employee, so it must load the whole filtered set (grouping
// a single server page would split one person across pages). Bounded to keep the
// payload sane; if a tenant exceeds it, the UI nudges toward filtering.
const LIST_FETCH_CAP = 500;
const STAFF_OPTIONS_LIMIT = 100;
const DAYS_IN_WEEK = 7;

type ScheduleView = "list" | "calendar";

/** Monday (local midnight) of the week containing `date`. */
const startOfWeek = (date: Date): Date => {
  const result = new Date(date);
  const offset = (result.getDay() + 6) % 7; // 0 = Monday
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - offset);
  return result;
};

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

function RouteComponent() {
  const actorRole = useAuthStore((state) => state.user?.role);
  const openModal = useModalStore((state) => state.openModal);
  const { data: branches } = useBranches();
  const { data: staff } = useStaffList({
    limit: STAFF_OPTIONS_LIMIT,
    isActive: true,
  });

  const [view, setView] = useState<ScheduleView>("calendar");
  const [branchId, setBranchId] = useState(ALL);
  const [userId, setUserId] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const canManage =
    actorRole === UserRole.ADMIN || actorRole === UserRole.MANAGER;

  const branchFilter = branchId === ALL ? undefined : branchId;
  const userFilter = userId === ALL ? undefined : userId;

  // ── List query (whole filtered set, grouped client-side by employee) ──
  const listQuery: ShiftScheduleQuery = {
    page: 1,
    limit: LIST_FETCH_CAP,
    branchId: branchFilter,
    userId: userFilter,
    status: status === ALL ? undefined : (status as ShiftScheduleStatus),
  };
  const { data: listData, isLoading: listLoading, refetch } =
    useShiftScheduleList(listQuery);
  const listTruncated =
    (listData?.pagination?.totalCount ?? 0) > LIST_FETCH_CAP;

  // ── Calendar (range) query — only active in calendar view ──
  const weekEnd = useMemo(
    () => addDays(weekStart, DAYS_IN_WEEK - 1),
    [weekStart]
  );
  const rangeQuery: ShiftScheduleRangeQuery | null =
    view === "calendar"
      ? {
          from: toDateInputValue(weekStart),
          to: toDateInputValue(weekEnd),
          branchId: branchFilter,
          userId: userFilter,
        }
      : null;
  const { data: rangeData, isLoading: rangeLoading } =
    useShiftScheduleRange(rangeQuery);

  const publish = usePublishShiftSchedules();

  const draftIdsInView = useMemo(
    () =>
      // Calendar-expanded pattern instances share a synthetic id; publish by the
      // underlying row id (patternId when present) and de-duplicate.
      Array.from(
        new Set(
          (rangeData ?? [])
            .filter((schedule) => schedule.status === ShiftScheduleStatus.DRAFT)
            .map((schedule) => schedule.patternId ?? schedule.id)
        )
      ),
    [rangeData]
  );

  // ── Options ──
  const branchOptions = [
    { value: ALL, label: "All branches" },
    ...(branches ?? []).map((branch) => ({
      value: branch.id,
      label: branch.name,
    })),
  ];
  const staffOptions = [
    { value: ALL, label: "All employees" },
    ...(staff?.data ?? []).map((member) => ({
      value: member.id,
      label: member.name,
    })),
  ];
  const statusOptions = [
    { value: ALL, label: "All statuses" },
    ...Object.values(ShiftScheduleStatus).map((value) => ({
      value,
      label: SCHEDULE_STATUS_LABELS[value],
    })),
  ];

  const handleCreate = () =>
    openModal("Create Schedule", <ShiftScheduleForm />);

  const handleCellClick = (date: Date, cellUserId: string) =>
    openModal(
      "Create Schedule",
      <ShiftScheduleForm prefilledDate={date} prefilledUserId={cellUserId} />
    );

  const weekLabel = `${weekStart.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} – ${weekEnd.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;

  return (
    <div className="space-y-4 pt-4">
      <TitleBar
        title="Shifts"
        subtitle="Plan, publish and review staff schedules"
        actions={
          canManage ? (
            <Button onClick={handleCreate} iconName="Plus">
              Add Schedule
            </Button>
          ) : undefined
        }
      />

      {/* Filters + view toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          options={branchOptions}
          value={branchId}
          onChange={(opt) => {
            setBranchId(opt.value);
          }}
          placeholder="All branches"
          className="w-44"
        />
        <Select
          options={staffOptions}
          value={userId}
          onChange={(opt) => {
            setUserId(opt.value);
          }}
          placeholder="All employees"
          className="w-44"
        />
        {view === "list" && (
          <Select
            options={statusOptions}
            value={status}
            onChange={(opt) => {
              setStatus(opt.value);
            }}
            placeholder="All statuses"
            className="w-44"
          />
        )}

        <div className="ml-auto flex rounded-md border border-border/60">
          <Button
            variant={view === "list" ? "default" : "ghost"}
            size="sm"
            iconName="List"
            onClick={() => setView("list")}
          >
            List
          </Button>
          <Button
            variant={view === "calendar" ? "default" : "ghost"}
            size="sm"
            iconName="Calendar"
            onClick={() => setView("calendar")}
          >
            Calendar
          </Button>
        </div>
      </div>

      {view === "list" ? (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              iconName="RefreshCw"
              onClick={() => refetch()}
            >
              Refresh
            </Button>
          </div>

          <ShiftScheduleGroupedList
            schedules={listData?.data ?? []}
            isLoading={listLoading}
          />

          {listTruncated && (
            <p className="text-center text-sm text-muted-foreground">
              Showing the first {LIST_FETCH_CAP} of{" "}
              {listData?.pagination.totalCount} schedules — narrow the filters to
              see the rest.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Week navigation + bulk publish */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              iconName="ChevronLeft"
              onClick={() => setWeekStart((current) => addDays(current, -7))}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekStart(startOfWeek(new Date()))}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              iconName="ChevronRight"
              onClick={() => setWeekStart((current) => addDays(current, 7))}
            />
            <span className="text-sm font-medium">{weekLabel}</span>

            {canManage && (
              <Button
                className="ml-auto"
                size="sm"
                iconName="Send"
                disabled={draftIdsInView.length === 0 || publish.isPending}
                onClick={() => publish.mutate(draftIdsInView)}
              >
                Publish drafts ({draftIdsInView.length})
              </Button>
            )}
          </div>

          {rangeLoading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : (
            <WeekGrid
              schedules={rangeData ?? []}
              weekStart={weekStart}
              onEventClick={(schedule) =>
                openModal(
                  "Edit Schedule",
                  <ShiftScheduleForm schedule={schedule} />
                )
              }
              onCellClick={handleCellClick}
            />
          )}
        </div>
      )}
    </div>
  );
}
