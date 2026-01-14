import { useOrder } from "@/hooks/useOrder";
import { useModalStore } from "@/store/modalStore";
import { RefundForm, RefundHistory } from "@/components/refunds";
import { formatPrice } from "@/components/orders/config";
import { Badge, Button, Icon, Separator, Shad } from "@repo/ui";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { OrderStatus } from "@repo/types";

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

  // Check if order can be refunded
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
      <div className="flex items-center justify-center py-12">
        <Icon
          name="LoaderCircle"
          className="w-6 h-6 animate-spin text-primary"
        />
        <span className="ml-2 text-muted-foreground">Loading order...</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Icon name="FileX" className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-lg text-muted-foreground mb-4">Order not found</p>
        <Link to="/invoices">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
        </Link>
      </div>
    );
  }

  console.log("Order Data:", order.items);
  const statusCfg = statusConfig[order.status] || statusConfig.DRAFT;
  const typeCfg = orderTypeConfig[order.type] || orderTypeConfig.RETAIL;

  return (
    <div className="space-y-6 py-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/invoices">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              Order #{order.orderNumber || orderId.slice(0, 8)}
            </h1>
            <Badge className={`${statusCfg?.color} text-white`}>
              {statusCfg?.label}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {new Date(order.createdAt).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Icon name="Printer" className="w-4 h-4" />
            Print
          </Button>
          {canRefund && (
            <Button variant="destructive" size="sm" onClick={handleRefund}>
              <Icon name="RotateCcw" className="w-4 h-4" />
              Refund
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Info Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Shad.Card>
              <Shad.CardHeader className="pb-2">
                <Shad.CardTitle className="text-sm font-medium text-muted-foreground">
                  Order Type
                </Shad.CardTitle>
              </Shad.CardHeader>
              <Shad.CardContent>
                <div className="flex items-center gap-2">
                  <Icon
                    name={typeCfg?.icon ?? "Info"}
                    className="w-4 h-4 text-muted-foreground"
                  />
                  <span className="font-semibold">{typeCfg?.label}</span>
                </div>
              </Shad.CardContent>
            </Shad.Card>

            <Shad.Card>
              <Shad.CardHeader className="pb-2">
                <Shad.CardTitle className="text-sm font-medium text-muted-foreground">
                  Items
                </Shad.CardTitle>
              </Shad.CardHeader>
              <Shad.CardContent>
                <span className="text-2xl font-bold">
                  {order.items?.length || 0}
                </span>
              </Shad.CardContent>
            </Shad.Card>

            <Shad.Card>
              <Shad.CardHeader className="pb-2">
                <Shad.CardTitle className="text-sm font-medium text-muted-foreground">
                  Subtotal
                </Shad.CardTitle>
              </Shad.CardHeader>
              <Shad.CardContent>
                <span className="text-2xl font-bold">
                  ${formatPrice(Number(order.subtotal))}
                </span>
              </Shad.CardContent>
            </Shad.Card>

            <Shad.Card>
              <Shad.CardHeader className="pb-2">
                <Shad.CardTitle className="text-sm font-medium text-muted-foreground">
                  Total
                </Shad.CardTitle>
              </Shad.CardHeader>
              <Shad.CardContent>
                <span className="text-2xl font-bold text-primary">
                  ${formatPrice(Number(order.total))}
                </span>
              </Shad.CardContent>
            </Shad.Card>
          </div>

          {/* Customer Info */}
          {order.customer && (
            <Shad.Card>
              <Shad.CardHeader>
                <Shad.CardTitle className="text-base flex items-center gap-2">
                  <Icon name="User" className="w-4 h-4" />
                  Customer
                </Shad.CardTitle>
              </Shad.CardHeader>
              <Shad.CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                    <span className="text-sm font-semibold text-primary">
                      {order.customer.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{order.customer.name}</p>
                    {order.customer.phone && (
                      <p className="text-sm text-muted-foreground">
                        {order.customer.phone}
                      </p>
                    )}
                  </div>
                </div>
              </Shad.CardContent>
            </Shad.Card>
          )}

          {/* Order Items */}
          <Shad.Card>
            <Shad.CardHeader>
              <Shad.CardTitle className="text-base flex items-center gap-2">
                <Icon name="Package" className="w-4 h-4" />
                Order Items
              </Shad.CardTitle>
            </Shad.CardHeader>
            <Shad.CardContent>
              <div className="space-y-3">
                {order.items?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-3 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      {item.product?.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="w-10 h-10 rounded-md object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                          <Icon
                            name="Package"
                            className="w-5 h-5 text-muted-foreground"
                          />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">
                          {item.product?.name || "Unknown Product"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ${formatPrice(Number(item.unitPrice))} ×{" "}
                          {item.quantity}
                        </p>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground italic">
                            Note: {item.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="font-semibold">
                      ${formatPrice(Number(item.total))}
                    </span>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              {/* Order Summary */}
              <div className="space-y-2">
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
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">
                    ${formatPrice(Number(order.total))}
                  </span>
                </div>
              </div>
            </Shad.CardContent>
          </Shad.Card>
        </div>

        {/* Right Column - Refund History */}
        <div className="space-y-6">
          <Shad.Card>
            <Shad.CardHeader>
              <div className="flex items-center justify-between">
                <Shad.CardTitle className="text-base flex items-center gap-2">
                  <Icon name="RotateCcw" className="w-4 h-4" />
                  Refunds
                </Shad.CardTitle>
                {canRefund && (
                  <Button variant="outline" size="sm" onClick={handleRefund}>
                    <Icon name="Plus" className="w-3 h-3" />
                    New Refund
                  </Button>
                )}
              </div>
            </Shad.CardHeader>
            <Shad.CardContent>
              <RefundHistory orderId={orderId} />
            </Shad.CardContent>
          </Shad.Card>
        </div>
      </div>
    </div>
  );
}
