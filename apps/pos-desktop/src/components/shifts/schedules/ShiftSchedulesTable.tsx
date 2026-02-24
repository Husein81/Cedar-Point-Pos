import { useMemo } from "react";
import { DataTable } from "@repo/ui";
import { useSchedules } from "@/hooks/useShiftSchedules";
import type {
  ScheduleFilters,
  ShiftSchedulesTableProps,
  ShiftScheduleTableRow,
} from "@/dto/shift.dto";
import { getShiftScheduleColumns } from "@/config/shiftScheduleColumn";

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
  onPublish,
  onUnpublish,
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
  const rows = useMemo<ShiftScheduleTableRow[]>(
    () =>
      (data?.data ?? []).map((schedule) => ({
        ...schedule,
        userName: schedule.user?.name ?? schedule.userId.slice(0, 8),
      })),
    [data?.data],
  );
  const totalCount = data?.pagination?.totalCount ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 0;

  const allSelected =
    rows.length > 0 && rows.every((r) => selectedIds.includes(r.id));

  const columns = useMemo(
    () =>
      getShiftScheduleColumns({
        allSelected,
        visibleIds: rows.map((r) => r.id),
        selectedIds,
        onToggleSelect,
        onToggleSelectAll,
        onEdit,
        onDelete,
        onPublish,
        onUnpublish,
      }),
    [
      allSelected,
      rows,
      selectedIds,
      onToggleSelect,
      onToggleSelectAll,
      onEdit,
      onDelete,
      onPublish,
      onUnpublish,
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
        keys: ["userName" as keyof ShiftScheduleTableRow],
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
