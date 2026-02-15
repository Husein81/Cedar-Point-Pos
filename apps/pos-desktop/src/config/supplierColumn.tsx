import { ColumnDef } from "@tanstack/react-table";
import { Badge, Checkbox } from "@repo/ui";
import { SupplierActions } from "@/components/supplier/SupplierActions";
import type { SupplierDetails, SupplierPurchaseOrder } from "@/dto/supplier.dto";
import { getPurchaseOrderStatusConfig } from "@/components/supplier/config";

export const getSupplierColumns = (): ColumnDef<SupplierDetails>[] => [
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
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
  },
  {
    accessorKey: "companyName",
    header: "Company",
    cell: ({ row }) => (
      <div className="text-gray-600 dark:text-gray-400">
        {row.original.companyName || "—"}
      </div>
    ),
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => (
      <div className="text-gray-600 dark:text-gray-400">
        {row.original.phone || "—"}
      </div>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <div className="text-gray-600 dark:text-gray-400">
        {row.original.email || "—"}
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => (
      <div className="text-gray-600 dark:text-gray-400">
        {row.original.category || "—"}
      </div>
    ),
  },
  {
    accessorKey: "currentBalance",
    header: "Balance",
    cell: ({ row }) => (
      <div className="font-medium">
        ${Number(row.original.currentBalance).toFixed(2)}
      </div>
    ),
  },
  {
    id: "purchaseOrders",
    header: "POs",
    cell: ({ row }) => (
      <div className="text-gray-600 dark:text-gray-400">
        {row.original._count.purchaseOrders}
      </div>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <SupplierActions supplier={row.original} />,
  },
];

export const getPurchaseOrderColumns = (): ColumnDef<SupplierPurchaseOrder>[] => [
  {
    accessorKey: "orderNumber",
    header: "Order #",
    cell: ({ row }) => (
      <div className="font-medium">
        {row.original.orderNumber || row.original.id.slice(0, 8)}
      </div>
    ),
  },
  {
    accessorKey: "branch",
    header: "Branch",
    cell: ({ row }) => (
      <div className="text-gray-600 dark:text-gray-400">
        {row.original.branch?.name || "—"}
      </div>
    ),
  },
  {
    accessorKey: "orderedAt",
    header: "Date",
    cell: ({ row }) => (
      <div className="text-gray-600 dark:text-gray-400">
        {new Date(row.original.orderedAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const config = getPurchaseOrderStatusConfig(row.original.status);
      return (
        <Badge className={config.className} variant={config.className ? undefined : "secondary"}>
          {config.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: "totalAmount",
    header: "Total",
    cell: ({ row }) => (
      <div className="font-medium">
        ${Number(row.original.totalAmount).toFixed(2)}
      </div>
    ),
  },
  {
    id: "items",
    header: "Items",
    cell: ({ row }) => (
      <div className="text-gray-600 dark:text-gray-400">
        {row.original.items?.length || 0}
      </div>
    ),
  },
];
