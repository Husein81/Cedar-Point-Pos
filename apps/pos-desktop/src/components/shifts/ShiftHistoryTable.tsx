import { useMemo } from "react";
import { Badge, DataTable } from "@repo/ui";
import { ColumnDef } from "@tanstack/react-table";
import { useShifts } from "@/hooks/useShifts";
import type { ShiftFilters } from "@/dto/shift.dto";
import type { Shift } from "@repo/types";
import {
  getShiftStatusVariant,
  getShiftCloseResultVariant,
  SHIFT_STATUS_LABELS,
  SHIFT_CLOSE_RESULT_LABELS,
} from "./config";
import { Link } from "@tanstack/react-router";

interface ShiftHistoryTableProps {
  filters?: ShiftFilters;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

const formatDateTime = (date: string) => {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCurrency = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return "-";
  return `$${Number(value).toFixed(2)}`;
};

export const ShiftHistoryTable = ({
  filters,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  searchTerm,
  onSearchChange,
}: ShiftHistoryTableProps) => {
  const queryFilters: ShiftFilters = {
    ...filters,
    page,
    limit: pageSize,
  };

  const { data, isLoading, refetch } = useShifts(queryFilters);

  const columns: ColumnDef<Shift>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "Shift ID",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground font-mono">
            {row.original.id.slice(0, 8)}...
          </span>
        ),
      },
      {
        accessorKey: "startTime",
        header: "Started",
        cell: ({ row }) => (
          <span className="text-sm">
            {formatDateTime(String(row.original.startTime))}
          </span>
        ),
      },
      {
        accessorKey: "endTime",
        header: "Ended",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.endTime
              ? formatDateTime(String(row.original.endTime))
              : "-"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={getShiftStatusVariant(row.original.status)}>
            {SHIFT_STATUS_LABELS[row.original.status] ?? row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: "closeResult",
        header: "Result",
        cell: ({ row }) => {
          const result = row.original.closeResult;
          if (!result) return <span className="text-muted-foreground">-</span>;
          return (
            <Badge variant={getShiftCloseResultVariant(result)}>
              {SHIFT_CLOSE_RESULT_LABELS[result] ?? result}
            </Badge>
          );
        },
      },
      {
        accessorKey: "startCash",
        header: "Start Cash",
        cell: ({ row }) => (
          <span className="font-medium">
            {formatCurrency(row.original.startCash)}
          </span>
        ),
      },
      {
        accessorKey: "endCash",
        header: "End Cash",
        cell: ({ row }) => (
          <span className="font-medium">
            {formatCurrency(row.original.endCash)}
          </span>
        ),
      },
      {
        accessorKey: "difference",
        header: "Difference",
        cell: ({ row }) => {
          const diff = row.original.difference;
          if (diff === null || diff === undefined)
            return <span className="text-muted-foreground">-</span>;
          const numDiff = Number(diff);
          return (
            <span
              className={`font-medium ${
                numDiff > 0
                  ? "text-green-600"
                  : numDiff < 0
                    ? "text-destructive"
                    : ""
              }`}
            >
              {formatCurrency(diff)}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Link
            to="/shifts/$shiftId"
            params={{ shiftId: row.original.id }}
            className="text-sm text-primary hover:underline"
          >
            View
          </Link>
        ),
      },
    ],
    [],
  );

  const rows = data?.data ?? [];
  const totalCount = data?.pagination?.totalCount ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 0;

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
