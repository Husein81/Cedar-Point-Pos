import type { StaffActivity } from "@/dto/staff.dto";
import { DEFAULT_LOCALE } from "@/constants/locale";
import { Badge, Shad } from "@repo/ui";
import { ColumnDef } from "@tanstack/react-table";

export const humanize = (value: string) =>
  value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const hasMetadata = (metadata: unknown): metadata is Record<string, unknown> =>
  metadata != null &&
  typeof metadata === "object" &&
  Object.keys(metadata).length > 0;

// Metadata is an untyped Json column — render defensively as read-only JSON.
const MetadataCell = ({ metadata }: { metadata: unknown }) => {
  if (!hasMetadata(metadata)) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <Shad.Popover>
      <Shad.PopoverTrigger asChild>
        <button
          type="button"
          className="text-sm text-primary underline-offset-2 hover:underline"
        >
          View
        </button>
      </Shad.PopoverTrigger>
      <Shad.PopoverContent align="end" className="max-w-sm">
        <pre className="text-xs whitespace-pre-wrap break-words">
          {JSON.stringify(metadata, null, 2)}
        </pre>
      </Shad.PopoverContent>
    </Shad.Popover>
  );
};

export const getStaffActivityColumns = (): ColumnDef<StaffActivity>[] => [
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {new Date(row.original.createdAt).toLocaleString(DEFAULT_LOCALE, {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </span>
    ),
  },
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => (
      <span className="font-medium">{humanize(row.original.action)}</span>
    ),
  },
  {
    accessorKey: "module",
    header: "Module",
    cell: ({ row }) => (
      <Badge variant="outline">{humanize(row.original.module)}</Badge>
    ),
  },
  {
    id: "metadata",
    header: "Details",
    cell: ({ row }) => <MetadataCell metadata={row.original.metadata} />,
  },
];
