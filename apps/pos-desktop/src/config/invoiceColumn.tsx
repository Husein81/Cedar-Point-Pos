import Actions from "@/components/common/Actions";
import { formatPrice } from "@/components/orders/config";
import { RefundForm } from "@/components/refunds";
import { useModalStore } from "@/store/modalStore";
import { Order, OrderStatus } from "@repo/types";
import { Badge, Icon } from "@repo/ui";
import { ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "@tanstack/react-router";

const statusConfig = {
  DRAFT: { label: "Draft", color: "bg-gray-500" },
  ON_HOLD: { label: "On Hold", color: "bg-amber-500" },
  PENDING: { label: "Pending", color: "bg-blue-500" },
  CONFIRMED: { label: "Confirmed", color: "bg-cyan-500" },
  IN_PROGRESS: { label: "In Progress", color: "bg-indigo-500" },
  SENT_TO_KITCHEN: { label: "In Kitchen", color: "bg-purple-500" },
  READY: { label: "Ready", color: "bg-green-500" },
  PARTIALLY_REFUNDED: { label: "Partial Refund", color: "bg-amber-500" },
  FULLY_REFUNDED: { label: "Refunded", color: "bg-red-600" },
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
        <Badge className={`${config.color! ?? "bg-gray-500"} text-white`}>
          {config.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: "items",
    header: "Items",
    cell: ({ row }) => {
      const order = row.original;
      const items = order.items || [];
      const hasRefunds = order.refunds && order.refunds.length > 0;
      const isFullyRefunded = order.status === "FULLY_REFUNDED";
      const isPartiallyRefunded = order.status === "PARTIALLY_REFUNDED";

      // Calculate net item count (original qty - refunded qty)
      const totalOriginalQty = items.reduce(
        (sum, item) => sum + Number(item.quantity),
        0,
      );
      const totalRefundedQty = items.reduce((sum, item) => {
        const refundedQty = (item.refundItems || []).reduce(
          (rSum: number, r: { quantity: string | number }) =>
            rSum + Number(r.quantity),
          0,
        );
        return sum + refundedQty;
      }, 0);
      const netQty = totalOriginalQty - totalRefundedQty;

      if (isFullyRefunded) {
        return (
          <div className="flex items-center gap-1">
            <span className="text-sm text-red-500 line-through">
              {items.length} items
            </span>
            <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">
              REFUNDED
            </Badge>
          </div>
        );
      }

      if (isPartiallyRefunded && totalRefundedQty > 0) {
        return (
          <div className="flex items-center gap-1">
            <span className="text-sm text-amber-600">
              {Math.round(netQty)} items
            </span>
            <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs">
              {Math.round(totalRefundedQty)} refunded
            </Badge>
          </div>
        );
      }

      return (
        <div className="text-sm text-muted-foreground">
          {items.length} items
        </div>
      );
    },
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
    accessorKey: "vat",
    header: "VAT",
    cell: ({ row }) => {
      const vat = Number(row.original.vat || 0);
      return vat > 0 ? (
        <div className="text-sm text-green-600">+${formatPrice(vat)}</div>
      ) : (
        <div className="text-sm text-muted-foreground">-</div>
      );
    },
  },
  {
    accessorKey: "shippingFee",
    header: "Shipping",
    cell: ({ row }) => {
      const shippingFee = Number(row.original.shippingFee || 0);
      return shippingFee > 0 ? (
        <div className="text-sm text-green-600">
          +${formatPrice(shippingFee)}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">-</div>
      );
    },
  },
  {
    accessorKey: "total",
    header: "Total",
    cell: ({ row }) => {
      const order = row.original;
      const originalTotal = Number(order.total);
      const hasRefunds = order.refunds && order.refunds.length > 0;
      const isFullyRefunded = order.status === "FULLY_REFUNDED";
      const isPartiallyRefunded = order.status === "PARTIALLY_REFUNDED";

      // Calculate net total = original - sum(refund amounts)
      const totalRefunded = (order.refunds || []).reduce(
        (sum: number, r: { totalAmount: string | number }) =>
          sum + Number(r.totalAmount),
        0,
      );
      const netTotal = originalTotal - totalRefunded;

      if (isFullyRefunded) {
        return (
          <div className="flex flex-col">
            <span className="text-sm text-red-500 line-through">
              ${formatPrice(originalTotal)}
            </span>
            <span className="font-semibold text-base text-red-600">$0.00</span>
          </div>
        );
      }

      if (isPartiallyRefunded && totalRefunded > 0) {
        return (
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground line-through">
              ${formatPrice(originalTotal)}
            </span>
            <span className="font-semibold text-base text-amber-600">
              ${formatPrice(netTotal)}
            </span>
          </div>
        );
      }

      return (
        <div className="font-semibold text-base">
          ${formatPrice(originalTotal)}
        </div>
      );
    },
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
