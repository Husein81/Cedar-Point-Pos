import { ColumnDef } from "@tanstack/react-table";
import { Icon, Shad } from "@repo/ui";
import type { Reservation } from "@/dto/reservation.dto";
import {
  ReservationStatusBadge,
  formatReservationDateTime,
  getReservationSourceLabel,
} from "./reservationStatus";

type ColumnHandlers = {
  onView: (reservation: Reservation) => void;
  onEdit: (reservation: Reservation) => void;
};

export const getReservationColumns = ({
  onView,
  onEdit,
}: ColumnHandlers): ColumnDef<Reservation>[] => [
  {
    accessorKey: "reservationNumber",
    header: "Reservation #",
    cell: ({ row }) => (
      <button
        onClick={() => onView(row.original)}
        className="font-medium text-primary hover:underline"
      >
        {row.original.reservationNumber}
      </button>
    ),
  },
  {
    accessorKey: "customerName",
    header: "Customer",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.customerName}</p>
        {row.original.customerEmail && (
          <p className="text-xs text-muted-foreground">
            {row.original.customerEmail}
          </p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "customerPhone",
    header: "Phone",
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.customerPhone}</span>
    ),
  },
  {
    accessorKey: "guestCount",
    header: "Guests",
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <Icon name="Users" size={14} className="text-muted-foreground" />
        <span>{row.original.guestCount}</span>
      </div>
    ),
  },
  {
    id: "table",
    header: "Table",
    cell: ({ row }) =>
      row.original.table ? (
        <span>{row.original.table.name}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "when",
    header: "Date / Time",
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        {formatReservationDateTime(row.original.reservationAt)}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <ReservationStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "source",
    header: "Source",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {getReservationSourceLabel(row.original.source)}
      </span>
    ),
  },
  {
    id: "createdBy",
    header: "Created By",
    cell: ({ row }) =>
      row.original.createdBy ? (
        <span>{row.original.createdBy.name}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <Shad.DropdownMenu>
        <Shad.DropdownMenuTrigger asChild>
          <button className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground">
            <Icon name="Ellipsis" size={16} />
            <span className="sr-only">Actions</span>
          </button>
        </Shad.DropdownMenuTrigger>
        <Shad.DropdownMenuContent align="end">
          <Shad.DropdownMenuItem onClick={() => onView(row.original)}>
            <Icon name="Eye" size={14} className="mr-2" />
            View details
          </Shad.DropdownMenuItem>
          <Shad.DropdownMenuItem onClick={() => onEdit(row.original)}>
            <Icon name="Pencil" size={14} className="mr-2" />
            Edit
          </Shad.DropdownMenuItem>
        </Shad.DropdownMenuContent>
      </Shad.DropdownMenu>
    ),
  },
];
