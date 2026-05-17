import { useOrders } from "@/hooks/useOrder";
import { useBranchStore } from "@/store/branchStore";
import { useOrderStore } from "@/store/orderStore";
import type { Order, OrderStatus } from "@repo/types";
import { Badge, Button, cn, Empty, Icon, Input, Select } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { useCallback, useMemo, useState } from "react";

// Ongoing statuses: draft and kitchen-related statuses (not paid/completed/closed)
const ONGOING_STATUSES: OrderStatus[] = [
  "DRAFT",
  "ON_HOLD",
  "PENDING",
  "CONFIRMED",
  "SENT_TO_KITCHEN",
  "IN_PROGRESS",
  "READY",
];

const STATUS_FILTER_OPTIONS = [
  { label: "All Ongoing", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Pending", value: "PENDING" },
  { label: "Sent to Kitchen", value: "SENT_TO_KITCHEN" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Ready", value: "READY" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "On Hold", value: "ON_HOLD" },
];

const STATUS_BADGE_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Draft",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  ON_HOLD: {
    label: "On Hold",
    className:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  },
  PENDING: {
    label: "Pending",
    className:
      "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
  SENT_TO_KITCHEN: {
    label: "Kitchen",
    className:
      "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  },
  READY: {
    label: "Ready",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  },
};

type Props = {
  className?: string;
};

export function OngoingOrdersList({ className }: Props) {
  const navigate = useNavigate();
  const { branchId } = useBranchStore();
  const { loadOrder } = useOrderStore();

  // Local filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Fetch ongoing orders from API
  const { data, isLoading } = useOrders({
    branchId: branchId || undefined,
    status: statusFilter !== "ALL" ? (statusFilter as OrderStatus) : undefined,
  });

  const orders = data?.data ?? [];

  // Filter to ongoing statuses only + search
  const filteredOrders = useMemo(() => {
    let result = orders.filter((o) =>
      ONGOING_STATUSES.includes(o.status as OrderStatus),
    );

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.table?.name?.toLowerCase().includes(q) ||
          o.customer?.name?.toLowerCase().includes(q),
      );
    }

    return result;
  }, [orders, search]);

  const handleLoadOrder = useCallback(
    (order: Order) => {
      const tabId = loadOrder(order);
      if (tabId) {
        const tableId = order.tableId || order.table?.id;
        const tableName = order.table?.name ?? null;
        navigate({
          to: "/",
          search: {
            tableId: tableId || undefined,
            ...(tableName ? { tableName } : {}),
            // If no table, mark as loaded so the route guard won't redirect
            orderType: tableId ? undefined : "loaded",
          },
        });
      }
    },
    [loadOrder, navigate],
  );

  const handlePreviewOrder = useCallback(
    (order: Order) => {
      navigate({ to: `/invoices/${order.id}` });
    },
    [navigate],
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filters Row */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* Search */}
        <div className="flex-1 min-w-37 max-w-sm">
          <div className="relative">
            <Icon
              name="Search"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            />
            <Input
              placeholder="Search by order #, table, or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Status Filter */}
        <Select
          value={statusFilter}
          onChange={(opt) => setStatusFilter(opt.value)}
          options={STATUS_FILTER_OPTIONS}
          placeholder="Filter by status"
        />

        {/* Clear */}
        {(search || statusFilter !== "ALL") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setStatusFilter("ALL");
            }}
          >
            <Icon name="X" className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-40 bg-muted animate-pulse rounded-lg border"
            />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <Empty
          icon="ClipboardList"
          title="No ongoing orders"
          description="All orders have been completed or there are no active orders."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onLoad={handleLoadOrder}
              onPreview={handlePreviewOrder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =====================
// Order Card
// =====================

function OrderCard({
  order,
  onLoad,
  onPreview,
}: {
  order: Order;
  onLoad: (order: Order) => void;
  onPreview: (order: Order) => void;
}) {
  const statusConfig = STATUS_BADGE_CONFIG[order.status] ?? {
    label: order.status,
    className: "bg-muted text-muted-foreground",
  };

  const itemCount = order.items?.length ?? 0;
  const total = parseFloat(String(order.total ?? 0));
  const createdAgo = formatDistanceToNow(new Date(order.createdAt), {
    addSuffix: true,
  });

  return (
    <div className="group relative flex flex-col rounded-lg border bg-card p-4 transition-all hover:shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">
            {order.orderNumber ? `#${order.orderNumber}` : `Order`}
          </span>
          <Badge
            variant="outline"
            className={cn("text-xs", statusConfig.className)}
          >
            {statusConfig.label}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">{createdAgo}</span>
      </div>

      {/* Meta */}
      <div className="flex flex-col gap-1.5 text-xs text-muted-foreground mb-3 flex-1">
        {order.table && (
          <div className="flex items-center gap-1.5">
            <Icon name="LayoutGrid" className="h-3.5 w-3.5" />
            <span>{order.table.name}</span>
          </div>
        )}
        {order.customer && (
          <div className="flex items-center gap-1.5">
            <Icon name="User" className="h-3.5 w-3.5" />
            <span>{order.customer.name}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Icon name="ShoppingCart" className="h-3.5 w-3.5" />
          <span>
            {itemCount} item{itemCount !== 1 ? "s" : ""}
          </span>
        </div>
        {order.type && (
          <div className="flex items-center gap-1.5">
            <Icon name="ClipboardList" className="h-3.5 w-3.5" />
            <span className="capitalize">
              {order.type.replace(/_/g, " ").toLowerCase()}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t">
        <span className="font-bold text-sm">${total.toFixed(2)}</span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPreview(order)}
            className="gap-1.5"
          >
            <Icon name="Eye" className="h-3.5 w-3.5" />
            Preview
          </Button>
          <Button size="sm" onClick={() => onLoad(order)} className="gap-1.5">
            <Icon name="Upload" className="h-3.5 w-3.5" />
            Load
          </Button>
        </div>
      </div>
    </div>
  );
}
