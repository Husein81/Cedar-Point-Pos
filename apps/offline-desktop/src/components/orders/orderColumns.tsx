import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@repo/ui";
import { OrderStatus } from "@/shared/enums";
import { formatDate, formatMoney } from "@/utils/format";
import type { Order } from "@/shared/models";

type Options = {
  currencySymbol: string;
  onRowClick: (order: Order) => void;
};

// DataTable doesn't support row-level onClick, so each cell wraps its content
// in a clickable div to make the whole row act as an "open details" trigger.
const Clickable = ({
  order,
  onRowClick,
  children,
}: {
  order: Order;
  onRowClick: (order: Order) => void;
  children: React.ReactNode;
}) => (
  <div
    className="cursor-pointer"
    onClick={() => onRowClick(order)}
  >
    {children}
  </div>
);

export const getOrderColumns = ({
  currencySymbol,
  onRowClick,
}: Options): ColumnDef<Order>[] => [
  {
    accessorKey: "orderNumber",
    header: "Order #",
    cell: ({ row }) => (
      <Clickable order={row.original} onRowClick={onRowClick}>
        <span className="font-medium">{row.original.orderNumber}</span>
      </Clickable>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => (
      <Clickable order={row.original} onRowClick={onRowClick}>
        <span className="text-muted-foreground">
          {formatDate(row.original.createdAt)}
        </span>
      </Clickable>
    ),
  },
  {
    accessorKey: "customerName",
    header: "Customer",
    cell: ({ row }) => (
      <Clickable order={row.original} onRowClick={onRowClick}>
        {row.original.customerName ?? "Walk-in"}
      </Clickable>
    ),
  },
  {
    accessorKey: "userName",
    header: "Cashier",
    cell: ({ row }) => (
      <Clickable order={row.original} onRowClick={onRowClick}>
        <span className="text-muted-foreground">
          {row.original.userName ?? "—"}
        </span>
      </Clickable>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Clickable order={row.original} onRowClick={onRowClick}>
        <Badge
          variant={
            row.original.status === OrderStatus.COMPLETED
              ? "default"
              : "destructive"
          }
        >
          {row.original.status.replace("_", " ")}
        </Badge>
      </Clickable>
    ),
  },
  {
    accessorKey: "total",
    header: () => <div className="text-right">Total</div>,
    cell: ({ row }) => (
      <Clickable order={row.original} onRowClick={onRowClick}>
        <div className="text-right font-medium">
          {formatMoney(row.original.total, currencySymbol)}
        </div>
      </Clickable>
    ),
  },
];
