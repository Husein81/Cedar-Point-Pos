import { formatPrice } from "@/components/orders/config";
import { RefundForm, RefundHistory } from "@/components/refunds";
import { useOrder } from "@/hooks/useOrder";
import { useModalStore } from "@/store/modalStore";
import { OrderStatus } from "@repo/types";
import { Button, Icon, Badge, Shad } from "@repo/ui";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Download, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/invoices/$orderId")({
  component: OrderDetailPage,
  staticData: {
    breadcrumb: "Order Details",
  },
});

const statusConfig: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  DRAFT: { label: "Draft", color: "bg-gray-500", icon: "FileEdit" },
  ON_HOLD: { label: "On Hold", color: "bg-amber-500", icon: "PauseCircle" },
  PENDING: { label: "Pending", color: "bg-blue-500", icon: "Clock" },
  CONFIRMED: { label: "Confirmed", color: "bg-cyan-500", icon: "CircleCheck" },
  IN_PROGRESS: { label: "In Progress", color: "bg-indigo-500", icon: "Loader" },
  SENT_TO_KITCHEN: {
    label: "In Kitchen",
    color: "bg-purple-500",
    icon: "ChefHat",
  },
  READY: { label: "Ready", color: "bg-green-500", icon: "Package" },
  PAID: { label: "Paid", color: "bg-teal-600", icon: "CreditCard" },
  COMPLETED: {
    label: "Completed",
    color: "bg-emerald-600",
    icon: "CheckCheck",
  },
  FULLY_REFUNDED: {
    label: "Fully Refunded",
    color: "bg-purple-600",
    icon: "RotateCcw",
  },
  CANCELLED: { label: "Cancelled", color: "bg-red-500", icon: "XCircle" },
};

const orderTypeConfig: Record<string, { label: string; icon: string }> = {
  DINE_IN: { label: "Dine In", icon: "Utensils" },
  TAKEAWAY: { label: "Takeaway", icon: "ShoppingBag" },
  DELIVERY: { label: "Delivery", icon: "Truck" },
  RETAIL: { label: "Retail", icon: "Store" },
};

function OrderDetailPage() {
  const { orderId } = useParams({ from: "/invoices/$orderId" });
  const { data: order, isLoading, refetch } = useOrder(orderId);
  const { openModal } = useModalStore();

  const canRefund =
    order?.status === OrderStatus.COMPLETED ||
    order?.status === OrderStatus.PAID;

  const handleRefund = () => {
    openModal(
      "Create Refund",
      <RefundForm orderId={orderId} onSuccess={() => refetch()} />
    );
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        <Icon
          name="LoaderCircle"
          className="w-4 h-4 animate-spin inline mr-2"
        />
        Loading invoice…
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        Invoice not found
      </div>
    );
  }

  const statusCfg = statusConfig[order.status];
  const typeCfg = orderTypeConfig[order.type];

  return (
    <div className="mx-auto px-4 py-6 space-y-6">
      {/* Navigation */}

      <Link
        to="/invoices"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Invoices</span>
      </Link>

      {/* Header Card */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">
              Order #{order.orderNumber ?? orderId.slice(0, 8)}
            </h1>
            <p className="text-sm text-muted-foreground">
              {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`${statusCfg?.color} text-white`}
            >
              {statusCfg?.label}
            </Badge>
          </div>
        </div>

        {/* Quick Info */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground mb-1">Order Type</p>
            <div className="flex items-center gap-2">
              <Icon
                name={typeCfg?.icon ?? "Info"}
                className="w-4 h-4 text-primary"
              />
              <span className="font-medium">{typeCfg?.label}</span>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground mb-1">Items</p>
            <span className="text-2xl font-bold">{order?.items?.length}</span>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <span className="text-2xl font-bold text-primary">
              ${formatPrice(Number(order.total))}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-4">
          {/* Items Section */}
          <div className="border rounded-md overflow-hidden">
            <div className="border-b px-6 py-4 bg-muted/50">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Icon name="ShoppingCart" className="w-4 h-4" />
                Order Items
              </h2>
            </div>
            <div className="divide-y">
              {order?.items?.map((item) => (
                <div
                  key={item.id}
                  className="px-6 py-3 flex items-start justify-between hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold">
                        {item.product?.name ?? "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        SKU: {item.product?.sku || "N/A"}
                      </span>
                    </div>
                    {item.product?.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.product.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {item.quantity} × $
                      {formatPrice(Number(item.unitPrice || 0))}
                    </div>
                    <div className="text-sm font-bold text-primary">
                      ${formatPrice(Number(item.total))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t bg-muted/50 px-6 py-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${formatPrice(Number(order.subtotal))}</span>
              </div>

              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-destructive">
                    -${formatPrice(Number(order.discount))}
                  </span>
                </div>
              )}

              <div className="border-t pt-2 flex justify-between font-bold text-base">
                <span>Total Amount</span>
                <span className="text-primary font-mono">
                  ${formatPrice(Number(order.total))}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
            {canRefund && (
              <Button onClick={handleRefund} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Create Refund
              </Button>
            )}
          </div>
        </div>

        {/* Refund History */}
        <div className="">
          <RefundHistory orderId={orderId} />
        </div>
      </div>
    </div>
  );
}

export default OrderDetailPage;
