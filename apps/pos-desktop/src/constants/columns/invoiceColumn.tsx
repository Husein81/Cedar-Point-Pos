import Actions from "@/components/common/Actions";
import { RefundForm } from "@/components/refunds";
import { useModalStore } from "@/store/modalStore";
import { Order, OrderStatus, TenantCurrency } from "@repo/types";
import { Icon } from "@repo/ui";
import { ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "@tanstack/react-router";

// ─── Status Config ───────────────────────────────────────────────

const statusConfig: Record<
  string,
  { label: string; color: string; textSize?: string }
> = {
  DRAFT: { label: "Draft", color: "bg-gray-500" },
  ON_HOLD: { label: "On Hold", color: "bg-amber-500" },
  PENDING: { label: "Pending", color: "bg-blue-500" },
  PARTIALLY_PAID: {
    label: "Par. Paid",
    color: "bg-sky-500",
    textSize: "text-[10px]",
  },
  CONFIRMED: { label: "Confirmed", color: "bg-cyan-500" },
  IN_PROGRESS: { label: "In Progress", color: "bg-indigo-500" },
  SENT_TO_KITCHEN: { label: "In Kitchen", color: "bg-purple-500" },
  READY: { label: "Ready", color: "bg-green-500" },
  PAID: { label: "Paid", color: "bg-teal-600" },
  COMPLETED: { label: "Completed", color: "bg-emerald-600" },
  PARTIALLY_REFUNDED: {
    label: "Par. Refund",
    color: "bg-amber-600",
    textSize: "text-[10px]",
  },
  FULLY_REFUNDED: { label: "Refunded", color: "bg-red-600" },
  CANCELLED: { label: "Cancelled", color: "bg-red-500" },
};

const orderTypeConfig: Record<string, { label: string; icon: string }> = {
  DINE_IN: { label: "Dine In", icon: "Utensils" },
  TAKEAWAY: { label: "Takeaway", icon: "ShoppingBag" },
  DELIVERY: { label: "Delivery", icon: "Truck" },
  RETAIL: { label: "Retail", icon: "Store" },
};

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Compute the net total for an order (original - refunds)
 */
function getNetTotal(order: Order): number {
  const originalTotal = Number(order.total);
  const totalRefunded = (order.refunds || []).reduce(
    (sum: number, r: { totalAmount: string | number }) =>
      sum + Number(r.totalAmount),
    0,
  );
  return originalTotal - totalRefunded;
}

/**
 * Format a price in a specific currency using its symbol
 */
function formatWithCurrency(
  amount: number,
  currencyCode: string,
  symbol?: string | null,
  decimalPlaces?: number,
): string {
  const dp = decimalPlaces ?? 2;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: dp > 0 ? Math.min(dp, 2) : 0,
    maximumFractionDigits: dp > 0 ? Math.min(dp, 2) : 0,
  }).format(amount);

  if (symbol) return `${formatted} ${symbol}`;
  return `${formatted} ${currencyCode}`;
}

// ─── Column Factory ──────────────────────────────────────────────

export function getInvoiceColumns(
  tenantCurrencies: TenantCurrency[],
  baseCurrencyCode: string,
): ColumnDef<Order>[] {
  // Find secondary currencies (active, non-default)
  const secondaryCurrencies = tenantCurrencies.filter(
    (tc) => tc.isActive && !tc.isDefault,
  );

  return [
    // ── Order # ─────────────────────────────────────────────────
    {
      accessorKey: "orderNumber",
      header: "Order #",
      cell: ({ row }) => (
        <span className="font-mono font-medium text-sm">
          {row.original.orderNumber || row.original.id.slice(0, 8)}
        </span>
      ),
    },

    // ── Type ────────────────────────────────────────────────────
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.original.type;
        const config = orderTypeConfig[type];
        return (
          <div className="flex items-center gap-2">
            <Icon
              name={config?.icon ?? "Info"}
              className="w-4 h-4 text-muted-foreground"
            />
            <span className="text-sm">{config?.label ?? type}</span>
          </div>
        );
      },
    },

    // ── Customer ────────────────────────────────────────────────
    {
      accessorKey: "customer.name",
      header: "Customer",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.customer?.name || "Walk-in"}
        </span>
      ),
    },

    // ── Status Pill ─────────────────────────────────────────────
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const config = statusConfig[status] ?? {
          label: status,
          color: "bg-gray-500",
        };

        return (
          <div
            className={`
              inline-flex items-center justify-center
              w-25 h-7 rounded-full
              ${config.color} text-white
              ${config.textSize ?? "text-xs"} font-medium
              leading-none
            `}
          >
            {config.label}
          </div>
        );
      },
    },

    // ── Items ───────────────────────────────────────────────────
    {
      accessorKey: "items",
      header: "Items",
      cell: ({ row }) => {
        const items = row.original.items || [];

        return (
          <span className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        );
      },
    },

    // ── Total (multi-currency, refund-aware) ────────────────────
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => {
        const order = row.original;
        const netTotal = getNetTotal(order);

        // Base currency symbol
        const baseCurrency = tenantCurrencies.find((tc) => tc.isDefault);
        const baseSymbol = baseCurrency?.currency?.symbol ?? baseCurrencyCode;

        return (
          <div className="flex flex-col gap-0.5">
            {/* Primary (base currency) */}
            <span className="font-semibold text-sm">
              {formatWithCurrency(
                netTotal,
                baseCurrencyCode,
                baseSymbol,
                baseCurrency?.currency?.decimalPlaces,
              )}
            </span>

            {/* Secondary currencies */}
            {secondaryCurrencies.map((sc) => {
              const converted = netTotal * Number(sc.exchangeRate);
              return (
                <span
                  key={sc.currencyCode}
                  className="text-xs text-muted-foreground font-mono"
                >
                  {formatWithCurrency(
                    converted,
                    sc.currencyCode,
                    sc.currency?.symbol,
                    sc.currency?.decimalPlaces,
                  )}
                </span>
              );
            })}
          </div>
        );
      },
    },

    // ── Date ────────────────────────────────────────────────────
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },

    // ── Actions ─────────────────────────────────────────────────
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const navigate = useNavigate();
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { openModal } = useModalStore();

        const order = row.original;
        const canRefund =
          order.status === OrderStatus.COMPLETED ||
          order.status === OrderStatus.PARTIALLY_REFUNDED;

        const handleRefund = () => {
          openModal("Create Refund", <RefundForm orderId={order.id} />);
        };

        const actions = [
          {
            title: "View Order",
            icon: "Eye",
            onClick: () => navigate({ to: `/invoices/${order.id}` }),
          },
          {
            title: "Print Invoice",
            icon: "Printer",
            onClick: () => {},
          },
        ];

        if (canRefund) {
          actions.push({
            title: "Refund",
            icon: "RotateCcw",
            onClick: handleRefund,
          });
        }

        return <Actions actions={actions} />;
      },
    },
  ];
}
