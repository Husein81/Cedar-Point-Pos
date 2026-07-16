import {
  CustomerReportRow,
  InventoryMovementRow,
  LoyaltyTransactionReportRow,
  PaymentTransactionRow,
  SalesOrderRow,
  TopProductRow,
} from "@/dto/reports.dto";
import {
  formatChangeType,
  formatCurrency,
  formatDate,
  getChangeTypeVariant,
  getMethodVariant,
  getStatusVariant,
  getTypeLabel,
} from "@/utils/reportHelpers";
import { Badge } from "@repo/ui";
import { ColumnDef } from "@tanstack/react-table";

export const getSalesColumns = (): ColumnDef<SalesOrderRow>[] => [
  {
    accessorKey: "orderNumber",
    header: "Order #",
    cell: ({ row }) => (
      <span className="font-mono font-medium">
        {row.original.orderNumber || "-"}
      </span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatDate(row.original.completedAt ?? row.original.createdAt)}
      </span>
    ),
  },
  {
    accessorKey: "branch",
    header: "Branch",
    cell: ({ row }) => row.original.branch.name,
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <Badge variant="outline">{getTypeLabel(row.original.type)}</Badge>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={getStatusVariant(row.original.status)}>
        {row.original.status.split("_").join(" ")}
      </Badge>
    ),
  },
  {
    accessorKey: "discount",
    header: "Discount",
    cell: ({ row }) => {
      const discount = row.original.discount;
      return discount > 0 ? (
        <span className="text-destructive">-{formatCurrency(discount)}</span>
      ) : (
        "-"
      );
    },
  },
  {
    accessorKey: "total",
    header: "Total",
    cell: ({ row }) => (
      <span className="font-semibold">
        {formatCurrency(row.original.total)}
      </span>
    ),
  },
  {
    accessorKey: "paymentsSummary",
    header: "Payment Methods",
    cell: ({ row }) => {
      const methods = row.original.paymentsSummary.methods;
      if (methods.length === 0) return "-";
      return methods.map((m) => m.method).join(", ");
    },
  },
  {
    accessorKey: "cashier",
    header: "Cashier",
    cell: ({ row }) =>
      row.original.cashier?.name || (
        <span className="text-muted-foreground">-</span>
      ),
  },
];

export const getInventoryColumns = (): ColumnDef<InventoryMovementRow>[] => [
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => (
      <span className="text-sm">{formatDate(row.original.createdAt)}</span>
    ),
  },
  {
    accessorKey: "product",
    header: "Product",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.product.name}</span>
    ),
  },
  {
    accessorKey: "changeType",
    header: "Change Type",
    cell: ({ row }) => (
      <Badge variant={getChangeTypeVariant(row.original.changeType)}>
        {formatChangeType(row.original.changeType)}
      </Badge>
    ),
  },
  {
    accessorKey: "beforeStock",
    header: "Before",
    cell: ({ row }) => row.original.beforeStock.toFixed(2),
  },
  {
    accessorKey: "afterStock",
    header: "After",
    cell: ({ row }) => row.original.afterStock.toFixed(2),
  },
  {
    accessorKey: "adjustment",
    header: "Adjustment",
    cell: ({ row }) => {
      const adj = row.original.adjustment;
      const isPositive = adj > 0;
      return (
        <span className={isPositive ? "text-green-600" : "text-destructive"}>
          {isPositive ? "+" : ""}
          {adj.toFixed(2)}
        </span>
      );
    },
  },
  {
    accessorKey: "reason",
    header: "Reason",
    cell: ({ row }) =>
      row.original.reason || <span className="text-muted-foreground">-</span>,
  },
  {
    accessorKey: "user",
    header: "User",
    cell: ({ row }) => row.original.user.name,
  },
  {
    accessorKey: "branch",
    header: "Branch",
    cell: ({ row }) => row.original.branch.name,
  },
];

export const getCustomerReportsColumns = (): ColumnDef<CustomerReportRow>[] => [
  {
    accessorKey: "name",
    header: "Customer Name",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => row.original.email || "-",
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => row.original.phone || "-",
  },
  {
    accessorKey: "ordersCount",
    header: "Orders",
    cell: ({ row }) => row.original.ordersCount,
  },
  {
    accessorKey: "totalSpent",
    header: "Total Spent",
    cell: ({ row }) => (
      <span className="font-semibold">
        {formatCurrency(row.original.totalSpent)}
      </span>
    ),
  },
  {
    accessorKey: "outstandingDebt",
    header: "Outstanding Debt",
    cell: ({ row }) => {
      const debt = row.original.outstandingDebt;
      return debt > 0 ? (
        <span className="text-destructive font-medium">
          {formatCurrency(debt)}
        </span>
      ) : (
        "-"
      );
    },
  },
  {
    accessorKey: "lastOrderDate",
    header: "Last Order",
    cell: ({ row }) =>
      row.original.lastOrderDate ? formatDate(row.original.lastOrderDate) : "-",
  },
];

export const getProductReportsColumns = (): ColumnDef<TopProductRow>[] => [
  {
    accessorKey: "productName",
    header: "Product",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.productName}</span>
    ),
  },
  {
    accessorKey: "categoryName",
    header: "Category",
    cell: ({ row }) =>
      row.original.categoryName ? (
        <Badge variant="outline">{row.original.categoryName}</Badge>
      ) : (
        <span className="text-muted-foreground">Uncategorized</span>
      ),
  },
  {
    accessorKey: "qtySold",
    header: "Quantity Sold",
    cell: ({ row }) => (
      <span className="font-mono">{row.original.qtySold.toFixed(0)}</span>
    ),
  },
  {
    accessorKey: "revenue",
    header: "Revenue",
    cell: ({ row }) => (
      <span className="font-semibold text-green-600">
        {formatCurrency(row.original.revenue)}
      </span>
    ),
  },
  {
    accessorKey: "avgUnitPrice",
    header: "Avg Unit Price",
    cell: ({ row }) => formatCurrency(row.original.avgUnitPrice),
  },
];

export const getPaymentReportColumns =
  (): ColumnDef<PaymentTransactionRow>[] => [
    {
      accessorKey: "order.orderNumber",
      header: "Order #",
      cell: ({ row }) => (
        <span className="font-mono font-medium">
          {row.original.order.orderNumber || "-"}
        </span>
      ),
    },
    {
      accessorKey: "paidAt",
      header: "Paid At",
      cell: ({ row }) => (
        <span className="text-sm">{formatDate(row.original.paidAt)}</span>
      ),
    },
    {
      accessorKey: "order.branch",
      header: "Branch",
      cell: ({ row }) => row.original.order.branch.name,
    },
    {
      accessorKey: "method",
      header: "Method",
      cell: ({ row }) => (
        <Badge variant={getMethodVariant(row.original.method)}>
          {row.original.method}
        </Badge>
      ),
    },
    {
      accessorKey: "currencyCode",
      header: "Currency",
      cell: ({ row }) => row.original.currencyCode || "USD",
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="font-semibold">
          {formatCurrency(
            row.original.amount,
            row.original.currencyCode || "USD",
          )}
        </span>
      ),
    },
    {
      accessorKey: "order.user",
      header: "Cashier",
      cell: ({ row }) =>
        row.original.order.user?.name || (
          <span className="text-muted-foreground">-</span>
        ),
    },
  ];

export const getLoyaltyReportColumns =
  (): ColumnDef<LoyaltyTransactionReportRow>[] => [
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) => (
        <span className="text-sm">{formatDate(row.original.createdAt)}</span>
      ),
    },
    {
      accessorKey: "customer",
      header: "Customer",
      cell: ({ row }) =>
        row.original.customer?.name || (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <span className="text-sm capitalize">
          {row.original.type.toLowerCase().replace(/_/g, " ")}
        </span>
      ),
    },
    {
      accessorKey: "direction",
      header: "Direction",
      cell: ({ row }) => {
        const dir = row.original.direction;
        return (
          <Badge variant={dir === "CREDIT" ? "default" : "destructive"}>
            {dir}
          </Badge>
        );
      },
    },
    {
      accessorKey: "points",
      header: "Points",
      cell: ({ row }) => {
        const dir = row.original.direction;
        const pts = row.original.points;
        return (
          <span
            className={`font-semibold ${dir === "CREDIT" ? "text-green-600" : "text-red-600"}`}
          >
            {dir === "CREDIT" ? "+" : "-"}
            {pts.toLocaleString()}
          </span>
        );
      },
    },
    {
      accessorKey: "moneyAmount",
      header: "Money Amount",
      cell: ({ row }) =>
        row.original.moneyAmount != null ? (
          <span>{formatCurrency(row.original.moneyAmount)}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      accessorKey: "balanceAfter",
      header: "Balance After",
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.balanceAfter.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "order",
      header: "Order / Refund",
      cell: ({ row }) => {
        const { order, refund } = row.original;
        if (order) {
          return (
            <span className="font-mono text-sm">
              {order.orderNumber || order.id.slice(0, 8)}
            </span>
          );
        }
        if (refund) {
          return (
            <span className="font-mono text-sm text-muted-foreground">
              Refund {refund.id.slice(0, 8)}
            </span>
          );
        }
        return <span className="text-muted-foreground">-</span>;
      },
    },
    {
      accessorKey: "actorUser",
      header: "Actor",
      cell: ({ row }) =>
        row.original.actorUser?.name || (
          <span className="text-muted-foreground">System</span>
        ),
    },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: ({ row }) =>
        row.original.reason || <span className="text-muted-foreground">-</span>,
    },
  ];
