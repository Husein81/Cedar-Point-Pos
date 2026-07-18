import { PurchaseOrderActions } from "@/components/purchase-orders/PurchaseOrderActions";
import { getPurchaseOrderStatusConfig } from "@/components/purchase-orders/config";
import type { PurchaseOrderSummary } from "@/dto/purchaseOrder.dto";
import { formatCurrency } from "@/utils/reportHelpers";
import { DEFAULT_LOCALE } from "@/constants/locale";
import { Badge } from "@repo/ui";
import type { ColumnDef } from "@tanstack/react-table";

export const getPurchaseOrdersColumns = (
  baseCurrencyCode: string,
): ColumnDef<PurchaseOrderSummary>[] => [
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
    id: "supplier",
    header: "Supplier",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.supplier.name}</div>
        {row.original.supplier.companyName && (
          <div className="text-xs text-muted-foreground">
            {row.original.supplier.companyName}
          </div>
        )}
      </div>
    ),
  },
  {
    id: "branch",
    header: "Branch",
    cell: ({ row }) => (
      <div className="text-muted-foreground">{row.original.branch.name}</div>
    ),
  },
  {
    accessorKey: "orderedAt",
    header: "Date",
    cell: ({ row }) => (
      <div className="text-muted-foreground">
        {new Date(row.original.orderedAt).toLocaleDateString(DEFAULT_LOCALE, {
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
        <Badge
          className={config.className || undefined}
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
        {formatCurrency(Number(row.original.totalAmount), baseCurrencyCode)}
      </div>
    ),
  },
  {
    id: "items",
    header: "Items",
    cell: ({ row }) => (
      <div className="text-muted-foreground">{row.original._count.items}</div>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <PurchaseOrderActions po={row.original} />,
  },
];
