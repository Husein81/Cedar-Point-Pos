import { useMemo } from "react";
import { DataTable } from "@repo/ui";
import { useShifts } from "@/hooks/useShifts";
import type { ShiftFilters, ShiftHistoryTableProps } from "@/dto/shift.dto";
import type { Shift } from "@repo/types";
import { useNavigate } from "@tanstack/react-router";
import { getShiftHistoryColumns } from "@/config/shiftColumn";

export const ShiftHistoryTable = ({
  filters,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  searchTerm,
  onSearchChange,
}: ShiftHistoryTableProps) => {
  const navigate = useNavigate();

  const queryFilters: ShiftFilters = {
    ...filters,
    page,
    limit: pageSize,
  };

  const { data, isLoading, refetch } = useShifts(queryFilters);
  const rows = data?.data ?? [];
  const totalCount = data?.pagination?.totalCount ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 0;

  const columns = useMemo(
    () =>
      getShiftHistoryColumns((shiftId) =>
        navigate({
          to: "/shifts/$shiftId",
          params: { shiftId },
        }),
      ),
    [navigate],
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
        keys: ["id" as keyof Shift],
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
