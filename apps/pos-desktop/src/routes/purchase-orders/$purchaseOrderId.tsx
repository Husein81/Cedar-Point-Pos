import { getPurchaseOrderStatusConfig } from "@/components/supplier/config";
import type { PurchaseOrderItem } from "@/dto/purchaseOrder.dto";
import {
  useCancelPurchaseOrder,
  useDeletePurchaseOrder,
  useOrderPurchaseOrder,
  usePurchaseOrder,
  useReceivePurchaseOrder,
} from "@/hooks/usePurchaseOrder";
import { PurchaseOrderItemType } from "@repo/types";
import { Badge, Button, DataTable, Icon, Shad } from "@repo/ui";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";

export const Route = createFileRoute("/purchase-orders/$purchaseOrderId")({
  component: RouteComponent,
  staticData: {
    breadcrumb: "Purchase Order Details",
  },
});

const itemColumns: ColumnDef<PurchaseOrderItem>[] = [
  {
    accessorKey: "itemName",
    header: "Item",
    cell: ({ row }) => {
      const isCustom = row.original.itemType === PurchaseOrderItemType.CUSTOM;
      return (
        <div>
          <div className="font-medium">{row.original.itemName}</div>
          <div className="text-xs text-muted-foreground">
            {isCustom ? "Custom item" : "Catalog product"}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "product.sku",
    header: "SKU",
    cell: ({ row }) => (
      <div className="text-gray-600 dark:text-gray-400">
        {row.original.product?.sku || "-"}
      </div>
    ),
  },
  {
    accessorKey: "quantity",
    header: "Quantity",
    cell: ({ row }) => <div>{Number(row.original.quantity)}</div>,
  },
  {
    accessorKey: "unitCost",
    header: "Unit Cost",
    cell: ({ row }) => <div>${Number(row.original.unitCost).toFixed(2)}</div>,
  },
  {
    accessorKey: "totalCost",
    header: "Total",
    cell: ({ row }) => (
      <div className="font-medium">
        ${Number(row.original.totalCost).toFixed(2)}
      </div>
    ),
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => (
      <div className="text-gray-600 dark:text-gray-400">
        {row.original.notes || "-"}
      </div>
    ),
  },
];

function RouteComponent() {
  const { purchaseOrderId } = Route.useParams();
  const navigate = useNavigate();
  const { data: po, isLoading } = usePurchaseOrder(purchaseOrderId);

  const orderMutation = useOrderPurchaseOrder();
  const receiveMutation = useReceivePurchaseOrder();
  const cancelMutation = useCancelPurchaseOrder();
  const deleteMutation = useDeletePurchaseOrder();

  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-gray-500">Loading purchase order...</p>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <p className="mb-4 text-gray-500">Purchase order not found</p>
        <Link to="/purchase-orders">
          <Button variant="outline">
            <Icon name="ArrowLeft" className="mr-2 h-4 w-4" />
            Back to Purchase Orders
          </Button>
        </Link>
      </div>
    );
  }

  const statusConfig = getPurchaseOrderStatusConfig(po.status);
  const isPending = po.status === "PENDING";
  const isOrdered = po.status === "ORDERED";
  const canOrder = isPending;
  const canReceive = isOrdered;
  const canCancel = isPending || isOrdered;
  const canDelete = isPending;

  const handleAction = async (action: string) => {
    try {
      switch (action) {
        case "order":
          await orderMutation.mutateAsync(po.id);
          break;
        case "receive":
          await receiveMutation.mutateAsync(po.id);
          break;
        case "cancel":
          await cancelMutation.mutateAsync(po.id);
          break;
        case "delete":
          await deleteMutation.mutateAsync(po.id);
          navigate({ to: "/purchase-orders" });
          break;
      }
    } catch (error) {
      console.error(`Failed to ${action} PO:`, error);
    }
    setConfirmAction(null);
  };

  const isActionPending =
    orderMutation.isPending ||
    receiveMutation.isPending ||
    cancelMutation.isPending ||
    deleteMutation.isPending;

  const totalAmount = Number(po.totalAmount);

  const stats = [
    {
      title: "Total Amount",
      value: `$${totalAmount.toFixed(2)}`,
      icon: "DollarSign",
    },
    {
      title: "Items",
      value: po.items?.length || 0,
      icon: "Package",
    },
    {
      title: "Created",
      value: new Date(po.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      icon: "Calendar",
    },
    {
      title: "Supplier",
      value: po.supplier?.name || "-",
      icon: "Truck",
    },
  ];

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center gap-4">
        <Link to="/purchase-orders">
          <Button variant="ghost" size="icon">
            <Icon name="ArrowLeft" className="h-4 w-4" />
          </Button>
        </Link>

        <div className="flex flex-1 items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {po.orderNumber || po.id.slice(0, 8)}
              </h1>
              <Badge
                className={statusConfig.className}
                variant={statusConfig.className ? undefined : "secondary"}
              >
                {statusConfig.label}
              </Badge>
            </div>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Icon name="Truck" className="h-3.5 w-3.5" />
                {po.supplier?.name}
              </div>
              <div className="flex items-center gap-1.5">
                <Icon name="Building2" className="h-3.5 w-3.5" />
                {po.branch?.name}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canOrder && (
            <Button
              size="sm"
              onClick={() => setConfirmAction("order")}
              disabled={isActionPending}
            >
              <Icon name="Send" className="mr-1 h-4 w-4" />
              Place Order
            </Button>
          )}
          {canReceive && (
            <Button
              size="sm"
              variant="default"
              onClick={() => setConfirmAction("receive")}
              disabled={isActionPending}
            >
              <Icon name="PackageCheck" className="mr-1 h-4 w-4" />
              Receive
            </Button>
          )}
          {canCancel && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmAction("cancel")}
              disabled={isActionPending}
            >
              <Icon name="X" className="mr-1 h-4 w-4" />
              Cancel
            </Button>
          )}
          {canDelete && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setConfirmAction("delete")}
              disabled={isActionPending}
            >
              <Icon name="Trash2" className="mr-1 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {confirmAction && (
        <Shad.Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <Shad.CardContent className="flex items-center justify-between py-3">
            <p className="text-sm font-medium">
              Are you sure you want to{" "}
              <span className="font-bold">{confirmAction}</span> this purchase
              order?
              {confirmAction === "receive" &&
                " This will update inventory levels."}
              {confirmAction === "delete" && " This action cannot be undone."}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant={confirmAction === "delete" ? "destructive" : "default"}
                onClick={() => handleAction(confirmAction)}
                disabled={isActionPending}
                isSubmitting={isActionPending}
              >
                Confirm
              </Button>
            </div>
          </Shad.CardContent>
        </Shad.Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Shad.Card key={stat.title}>
            <Shad.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Shad.CardTitle className="text-sm font-medium">
                {stat.title}
              </Shad.CardTitle>
              <Icon name={stat.icon} className="h-4 w-4 text-muted-foreground" />
            </Shad.CardHeader>
            <Shad.CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </Shad.CardContent>
          </Shad.Card>
        ))}
      </div>

      {po.notes && (
        <Shad.Card>
          <Shad.CardHeader>
            <Shad.CardTitle className="text-sm font-medium">Notes</Shad.CardTitle>
          </Shad.CardHeader>
          <Shad.CardContent>
            <p className="text-sm text-muted-foreground">{po.notes}</p>
          </Shad.CardContent>
        </Shad.Card>
      )}

      <div className="border-t pt-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Order Items</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {po.items?.length || 0} items in this order
            </p>
          </div>
        </div>

        <DataTable columns={itemColumns} data={po.items ?? []} />
      </div>
    </div>
  );
}
