import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@repo/ui";
import type { PurchaseOrderSummary } from "@/dto/purchaseOrder.dto";
import { getPurchaseOrderStatusConfig } from "@/components/supplier/config";
import { Link } from "@tanstack/react-router";
import { PurchaseOrderActions } from "@/components/purchase-order/PurchaseOrderActions";

export const getPurchaseOrderListColumns =
  (): ColumnDef<PurchaseOrderSummary>[] => [
    {
      accessorKey: "orderNumber",
      header: "Order #",
      cell: ({ row }) => (
        <Link
          to="/purchase-orders/$purchaseOrderId"
          params={{ purchaseOrderId: row.original.id }}
          className="font-medium text-primary hover:underline"
        >
          {row.original.orderNumber || row.original.id.slice(0, 8)}
        </Link>
      ),
    },
    {
      id: "supplier",
      header: "Supplier",
      cell: ({ row }) => (
        <div className="text-gray-600 dark:text-gray-400">
          {row.original.supplier?.name || "—"}
        </div>
      ),
    },
    {
      id: "branch",
      header: "Branch",
      cell: ({ row }) => (
        <div className="text-gray-600 dark:text-gray-400">
          {row.original.branch?.name || "—"}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const config = getPurchaseOrderStatusConfig(row.original.status);
        return (
          <Badge
            className={config.className}
            variant={config.className ? undefined : "secondary"}
          >
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
          {row.original._count?.items ?? 0}
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => (
        <div className="text-gray-600 dark:text-gray-400">
          {new Date(row.original.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => <PurchaseOrderActions order={row.original} />,
    },
  ];

