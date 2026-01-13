import Actions from "@/components/common/Actions";
import { formatPrice } from "@/components/orders/config";
import { Order } from "@repo/types";
import { Badge, Icon } from "@repo/ui";
import { ColumnDef } from "@tanstack/react-table";

const statusConfig = {
  DRAFT: { label: "Draft", color: "bg-gray-500" },
  ON_HOLD: { label: "On Hold", color: "bg-amber-500" },
  PENDING: { label: "Pending", color: "bg-blue-500" },
  CONFIRMED: { label: "Confirmed", color: "bg-cyan-500" },
  IN_PROGRESS: { label: "In Progress", color: "bg-indigo-500" },
  SENT_TO_KITCHEN: { label: "In Kitchen", color: "bg-purple-500" },
  READY: { label: "Ready", color: "bg-green-500" },
  PAID: { label: "Paid", color: "bg-teal-600" },
  COMPLETED: { label: "Completed", color: "bg-emerald-600" },
  CANCELLED: { label: "Cancelled", color: "bg-red-500" },
};

const orderTypeConfig = {
  DINE_IN: { label: "Dine In", icon: "Utensils" },
  TAKEAWAY: { label: "Takeaway", icon: "ShoppingBag" },
  DELIVERY: { label: "Delivery", icon: "Truck" },
  RETAIL: { label: "Retail", icon: "Store" },
};

export const invoiceColumns: ColumnDef<Order>[] = [
  {
    accessorKey: "orderNumber",
    header: "Order #",
    cell: ({ row }) => (
      <div className="font-medium">{row.original.orderNumber}</div>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const type = row.original.type;
      const config = orderTypeConfig[type];
      return (
        <div className="flex items-center gap-2">
          <Icon name={config.icon} className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">{config.label}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "customer.name",
    header: "Customer",
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">
        {row.original.customer?.name || "Walk-in Customer"}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      const config = statusConfig[status];
      return (
        <Badge className={`${config.color} text-white`}>{config.label}</Badge>
      );
    },
  },
  {
    accessorKey: "items",
    header: "Items",
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">
        {row.original.items?.length || 0} items
      </div>
    ),
  },
  {
    accessorKey: "subtotal",
    header: "Subtotal",
    cell: ({ row }) => (
      <div className="text-sm">
        ${formatPrice(Number(row.original.subtotal))}
      </div>
    ),
  },
  {
    accessorKey: "discount",
    header: "Discount",
    cell: ({ row }) => {
      const discount = Number(row.original.discount || 0);
      return discount > 0 ? (
        <div className="text-sm text-red-600">-${formatPrice(discount)}</div>
      ) : (
        <div className="text-sm text-muted-foreground">-</div>
      );
    },
  },
  {
    accessorKey: "total",
    header: "Total",
    cell: ({ row }) => (
      <div className="font-semibold text-base">
        ${formatPrice(Number(row.original.total))}
      </div>
    ),
  },
  {
    accessorKey: "currencyCode",
    header: "Currency",
    cell: ({ row }) => {
      const currencyCode = row.original.currencyCode || "USD";
      return (
        <div className="text-sm font-mono text-muted-foreground">
          {currencyCode}
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">
        {new Date(row.original.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <Actions
        actions={[
          {
            title: "View Order",
            icon: "Eye",
            onClick: () => {},
          },
          {
            title: "Print Invoice",
            icon: "Printer",
            onClick: () => {},
          },
        ]}
      />
    ),
  },
];
