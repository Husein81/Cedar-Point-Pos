import { useMemo } from "react";
import { Badge, Button, DataTable, Icon } from "@repo/ui";
import type { ColumnDef } from "@tanstack/react-table";
import type { ShiftSchedule, ShiftScheduleStatus } from "@repo/types";
import { useSchedules } from "@/hooks/useShiftSchedules";
import type { ScheduleFilters } from "@/dto/shift.dto";

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
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatTime = (date: string | Date) =>
  new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

interface ShiftSchedulesTableProps {
  filters?: ScheduleFilters;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onEdit?: (schedule: ShiftSchedule) => void;
  onDelete?: (schedule: ShiftSchedule) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (visibleIds: string[]) => void;
}

export const ShiftSchedulesTable = ({
  filters,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  searchTerm,
  onSearchChange,
  onEdit,
  onDelete,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: ShiftSchedulesTableProps) => {
  const queryFilters: ScheduleFilters = {
    ...filters,
    page,
    limit: pageSize,
  };

  const { data, isLoading, refetch } = useSchedules(queryFilters);
  const rows = data?.data ?? [];
  const totalCount = data?.pagination?.totalCount ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 0;

  const allSelected =
    rows.length > 0 && rows.every((r) => selectedIds.includes(r.id));

  const columns: ColumnDef<ShiftSchedule>[] = useMemo(
    () => [
      {
        id: "select",
        header: () => (
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => onToggleSelectAll(rows.map((r) => r.id))}
            className="h-4 w-4 rounded border-gray-300"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedIds.includes(row.original.id)}
            onChange={() => onToggleSelect(row.original.id)}
            className="h-4 w-4 rounded border-gray-300"
          />
        ),
        size: 40,
      },
      {
        accessorKey: "userId",
        header: "User ID",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground font-mono">
            {row.original.userId.slice(0, 8)}...
          </span>
        ),
      },
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-sm">
            {formatDate(String(row.original.date))}
          </span>
        ),
      },
      {
        accessorKey: "startTime",
        header: "Start",
        cell: ({ row }) => (
          <span className="text-sm">
            {formatTime(String(row.original.startTime))}
          </span>
        ),
      },
      {
        accessorKey: "endTime",
        header: "End",
        cell: ({ row }) => (
          <span className="text-sm">
            {formatTime(String(row.original.endTime))}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status as ShiftScheduleStatus;
          return (
            <Badge variant={SCHEDULE_STATUS_VARIANTS[status] ?? "secondary"}>
              {SCHEDULE_STATUS_LABELS[status] ?? status}
            </Badge>
          );
        },
      },
      {
        accessorKey: "notes",
        header: "Notes",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground truncate max-w-[150px] inline-block">
            {row.original.notes || "-"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const schedule = row.original;
          const isDraft = schedule.status === "DRAFT";
          return (
            <div className="flex items-center gap-1">
              {isDraft && onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(schedule)}
                >
                  <Icon name="Pencil" className="h-4 w-4" />
                </Button>
              )}
              {isDraft && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(schedule)}
                >
                  <Icon name="Trash2" className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [
      allSelected,
      selectedIds,
      onToggleSelect,
      onToggleSelectAll,
      onEdit,
      onDelete,
    ],
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      isLoading={isLoading}
      onRefetch={() => refetch()}
      search={{
        term: searchTerm,
        onTermChange: (t) => {
          onSearchChange(t);
          onPageChange(1);
        },
        keys: ["userId" as keyof ShiftSchedule],
      }}
      pagination={{
        rows: totalCount,
        page,
        pageSize,
        totalPages,
        onPageChange,
        onPageSizeChange: (s) => {
          onPageSizeChange(s);
          onPageChange(1);
        },
      }}
    />
  );
};
