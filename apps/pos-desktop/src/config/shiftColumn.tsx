import { ColumnDef } from "@tanstack/react-table";
import type { Shift } from "@repo/types";
import { Badge, Checkbox } from "@repo/ui";
import {
  getShiftCloseResultVariant,
  getShiftStatusVariant,
  SHIFT_CLOSE_RESULT_LABELS,
  SHIFT_STATUS_LABELS,
} from "@/components/shifts/config";
import Actions from "@/components/common/Actions";

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

export const getShiftHistoryColumns = (
  onView: (shiftId: string) => void,
): ColumnDef<Shift>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
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
      <span className="text-sm">{formatDateTime(String(row.original.startTime))}</span>
    ),
  },
  {
    accessorKey: "endTime",
    header: "Ended",
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.endTime ? formatDateTime(String(row.original.endTime)) : "-"}
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
      <span className="font-medium">{formatCurrency(row.original.startCash)}</span>
    ),
  },
  {
    accessorKey: "endCash",
    header: "End Cash",
    cell: ({ row }) => (
      <span className="font-medium">{formatCurrency(row.original.endCash)}</span>
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
            numDiff > 0 ? "text-green-600" : numDiff < 0 ? "text-destructive" : ""
          }`}
        >
          {formatCurrency(diff)}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <Actions
        actions={[
          {
            title: "View",
            icon: "Eye",
            onClick: () => onView(row.original.id),
          },
        ]}
      />
    ),
  },
];
