import { DetailsSkeleton } from "@/components/common/DetailsSkeleton";
import TitleBar from "@/components/title-bar";
import { getPurchaseOrderStatusConfig } from "@/components/purchase-orders/config";
import {
  PurchaseOrderConfirmDialog,
  usePurchaseOrderActions,
} from "@/components/purchase-orders/PurchaseOrderConfirmDialog";
import { useTenantCurrencies } from "@/hooks/useCurrency";
import { usePurchaseOrder } from "@/hooks/usePurchaseOrder";
import { formatCurrency } from "@/utils/reportHelpers";
import { Badge, Button, Icon, Shad } from "@repo/ui";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/purchase-orders/$purchaseOrderId")({
  component: RouteComponent,
  staticData: {
    breadcrumb: "Purchase Order Details",
  },
});

function RouteComponent() {
  const { purchaseOrderId } = Route.useParams();
  const { data: po, isLoading } = usePurchaseOrder(purchaseOrderId);
  const {
    pendingAction,
    setPendingAction,
    canReceive,
    canCancel,
    isPending,
    confirm,
  } = usePurchaseOrderActions(po?.status ?? "");
  const { data: currencyData } = useTenantCurrencies();
  const baseCurrencyCode = currencyData?.baseCurrencyCode || "USD";

  if (isLoading) {
    return <DetailsSkeleton />;
  }

  if (!po) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <p className="text-muted-foreground mb-4">Purchase order not found</p>
        <Link to="/purchase-orders">
          <Button variant="outline">
            <Icon name="ArrowLeft" className="h-4 w-4 mr-2" />
            Back to Purchase Orders
          </Button>
        </Link>
      </div>
    );
  }

  const statusConfig = getPurchaseOrderStatusConfig(po.status);

  return (
    <div className="space-y-6">
      <TitleBar
        title={po.orderNumber || po.id.slice(0, 8)}
        href="/purchase-orders"
      />

      {/* Status + Actions */}
      <div className="flex items-center justify-between">
        <Badge
          className={statusConfig.className || undefined}
          variant={statusConfig.className ? undefined : "secondary"}
        >
          {statusConfig.label}
        </Badge>
        <div className="flex gap-2">
          {canReceive && (
            <Button
              onClick={() => setPendingAction("receive")}
              disabled={isPending}
              iconName="PackageCheck"
            >
              Mark as Received
            </Button>
          )}
          {canCancel && (
            <Button
              variant="destructive"
              onClick={() => setPendingAction("cancel")}
              disabled={isPending}
              iconName="X"
            >
              Cancel Order
            </Button>
          )}
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Shad.Card>
          <Shad.CardHeader className="flex flex-row items-center justify-between pb-2">
            <Shad.CardTitle className="text-sm font-medium">
              Supplier
            </Shad.CardTitle>
            <Icon name="Truck" className="h-4 w-4 text-muted-foreground" />
          </Shad.CardHeader>
          <Shad.CardContent>
            <div className="text-base font-semibold">{po.supplier.name}</div>
            {po.supplier.companyName && (
              <p className="text-xs text-muted-foreground">
                {po.supplier.companyName}
              </p>
            )}
          </Shad.CardContent>
        </Shad.Card>

        <Shad.Card>
          <Shad.CardHeader className="flex flex-row items-center justify-between pb-2">
            <Shad.CardTitle className="text-sm font-medium">
              Branch
            </Shad.CardTitle>
            <Icon name="Building2" className="h-4 w-4 text-muted-foreground" />
          </Shad.CardHeader>
          <Shad.CardContent>
            <div className="text-base font-semibold">{po.branch.name}</div>
          </Shad.CardContent>
        </Shad.Card>

        <Shad.Card>
          <Shad.CardHeader className="flex flex-row items-center justify-between pb-2">
            <Shad.CardTitle className="text-sm font-medium">
              Order Date
            </Shad.CardTitle>
            <Icon name="Calendar" className="h-4 w-4 text-muted-foreground" />
          </Shad.CardHeader>
          <Shad.CardContent>
            <div className="text-base font-semibold">
              {new Date(po.orderedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </div>
            {po.receivedAt && (
              <p className="text-xs text-muted-foreground">
                Received:{" "}
                {new Date(po.receivedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </Shad.CardContent>
        </Shad.Card>

        <Shad.Card>
          <Shad.CardHeader className="flex flex-row items-center justify-between pb-2">
            <Shad.CardTitle className="text-sm font-medium">
              Total Amount
            </Shad.CardTitle>
            <Icon name="DollarSign" className="h-4 w-4 text-muted-foreground" />
          </Shad.CardHeader>
          <Shad.CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(Number(po.totalAmount), baseCurrencyCode)}
            </div>
            <p className="text-xs text-muted-foreground">
              {po.items.length} item{po.items.length !== 1 ? "s" : ""}
            </p>
          </Shad.CardContent>
        </Shad.Card>
      </div>

      {/* Notes */}
      {po.notes && (
        <Shad.Card>
          <Shad.CardHeader>
            <Shad.CardTitle className="text-sm font-medium">Notes</Shad.CardTitle>
          </Shad.CardHeader>
          <Shad.CardContent>
            <p className="text-sm">{po.notes}</p>
          </Shad.CardContent>
        </Shad.Card>
      )}

      {/* Items */}
      <Shad.Card>
        <Shad.CardHeader>
          <Shad.CardTitle>Order Items</Shad.CardTitle>
        </Shad.CardHeader>
        <Shad.CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 font-medium">Product</th>
                  <th className="text-left py-2 font-medium">SKU</th>
                  <th className="text-right py-2 font-medium">Qty</th>
                  <th className="text-right py-2 font-medium">Unit Cost</th>
                  <th className="text-right py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {po.items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{item.product.name}</td>
                    <td className="py-3 text-muted-foreground">
                      {item.product.sku || "—"}
                    </td>
                    <td className="py-3 text-right">
                      {Number(item.quantity).toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      {formatCurrency(Number(item.unitCost), baseCurrencyCode)}
                    </td>
                    <td className="py-3 text-right font-medium">
                      {formatCurrency(Number(item.totalCost), baseCurrencyCode)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t">
                  <td colSpan={4} className="py-3 text-right font-semibold">
                    Grand Total
                  </td>
                  <td className="py-3 text-right font-bold text-lg">
                    {formatCurrency(Number(po.totalAmount), baseCurrencyCode)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Shad.CardContent>
      </Shad.Card>

      <PurchaseOrderConfirmDialog
        poId={po.id}
        pendingAction={pendingAction}
        isPending={isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirm}
      />
    </div>
  );
}
