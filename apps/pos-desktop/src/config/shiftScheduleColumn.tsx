import Actions from "@/components/common/Actions";
import type { ShiftScheduleTableRow } from "@/dto/shift.dto";
import { Badge, Checkbox } from "@repo/ui";
import type { ShiftScheduleStatus } from "@repo/types";
import type { ColumnDef } from "@tanstack/react-table";

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

type ShiftScheduleColumnOptions = {
  allSelected: boolean;
  visibleIds: string[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (visibleIds: string[]) => void;
  onEdit?: (schedule: ShiftScheduleTableRow) => void;
  onDelete?: (schedule: ShiftScheduleTableRow) => void;
  onPublish?: (scheduleId: string) => void;
  onUnpublish?: (scheduleId: string) => void;
};

export const getShiftScheduleColumns = ({
  allSelected,
  visibleIds,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDelete,
  onPublish,
  onUnpublish,
}: ShiftScheduleColumnOptions): ColumnDef<ShiftScheduleTableRow>[] => [
  {
    id: "select",
    header: () => (
      <Checkbox
        checked={allSelected}
        onCheckedChange={() => onToggleSelectAll(visibleIds)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={selectedIds.includes(row.original.id)}
        onCheckedChange={() => onToggleSelect(row.original.id)}
      />
    ),
    size: 40,
  },
  {
    accessorKey: "userName",
    header: "User",
    cell: ({ row }) => <span className="text-sm">{row.original.userName}</span>,
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => (
      <span className="text-sm">{formatDate(String(row.original.date))}</span>
    ),
  },
  {
    accessorKey: "startTime",
    header: "Start",
    cell: ({ row }) => (
      <span className="text-sm">{formatTime(String(row.original.startTime))}</span>
    ),
  },
  {
    accessorKey: "endTime",
    header: "End",
    cell: ({ row }) => (
      <span className="text-sm">{formatTime(String(row.original.endTime))}</span>
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
    header: "Actions",
    cell: ({ row }) => {
      const schedule = row.original;
      const isDraft = schedule.status === "DRAFT";
      const isPublished = schedule.status === "PUBLISHED";

      const actions = [
        ...(isDraft && onEdit
          ? [
              {
                title: "Edit",
                icon: "Pen",
                onClick: () => onEdit(schedule),
              },
            ]
          : []),
        ...(isDraft && onPublish
          ? [
              {
                title: "Publish",
                icon: "Send",
                onClick: () => onPublish(schedule.id),
              },
            ]
          : []),
        ...(isPublished && onUnpublish
          ? [
              {
                title: "Unpublish",
                icon: "Undo2",
                onClick: () => onUnpublish(schedule.id),
              },
            ]
          : []),
        ...(isDraft && onDelete
          ? [
              {
                title: "Delete",
                icon: "Trash2",
                variant: "destructive" as const,
                onClick: () => onDelete(schedule),
              },
            ]
          : []),
      ];

      return <Actions actions={actions} />;
    },
  },
];
