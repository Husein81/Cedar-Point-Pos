import { useMemo, useState } from "react";
import { useOrders } from "@/hooks/useOrder";
import { useOrderStore } from "@/store/orderStore";
import { useModalStore } from "@/store/modalStore";
import { useBranchStore } from "@/store/branchStore";
import type { ServerOrderWithPayments } from "@/dto/order.dto";
import { ACTIVE_ORDER_STATUSES } from "@repo/types";
import { Icon, Input, Shad, toast } from "@repo/ui";

export function LoadOrderModal() {
  const { closeModal } = useModalStore();
  const { loadOrder } = useOrderStore();
  const { branchId } = useBranchStore();

  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, error } = useOrders({ branchId: branchId ?? undefined });

  const openOrders = useMemo(() => {
    const orders = data?.data ?? [];

    return orders.filter((order) =>
      (ACTIVE_ORDER_STATUSES as readonly string[]).includes(order.status),
    );
  }, [data]);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return openOrders;

    return openOrders.filter((order) => {
      const orderNumber = order.orderNumber?.toLowerCase() ?? "";
      const tableName =
        (order as unknown as { table?: { name?: string } }).table?.name?.toLowerCase() ??
        "";
      const customerName =
        (order as unknown as { customer?: { name?: string } }).customer?.name?.toLowerCase() ??
        "";

      return (
        orderNumber.includes(query) ||
        tableName.includes(query) ||
        customerName.includes(query)
      );
    });
  }, [openOrders, searchQuery]);

  const handleSelect = (order: (typeof filteredOrders)[number]) => {
    const tabId = loadOrder(order as unknown as ServerOrderWithPayments);
    if (!tabId) {
      toast.error("Tab limit reached — close a tab to open this order");
      return;
    }
    closeModal();
  };

  return (
    <div className="px-2">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon name="FolderOpen" className="w-5 h-5 text-primary" />
        </div>
        <div>
          <Shad.DialogTitle className="text-lg font-semibold">
            Load Order
          </Shad.DialogTitle>
          <p className="text-sm text-muted-foreground">
            Resume an open order in a new tab
          </p>
        </div>
      </div>

      <div className="relative mb-3">
        <Icon
          name="Search"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
        />
        <Input
          placeholder="Search by order #, table, or customer..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          autoFocus
        />
      </div>

      <Shad.ScrollArea className="max-h-96">
        <div className="flex flex-col gap-1 pr-3">
          {isLoading && (
            <div className="flex items-center justify-center py-10">
              <Icon
                name="LoaderCircle"
                className="w-6 h-6 animate-spin text-muted-foreground"
              />
            </div>
          )}

          {!isLoading && error && (
            <div className="text-center py-10">
              <Icon
                name="AlertCircle"
                className="w-10 h-10 text-destructive mx-auto mb-2"
              />
              <p className="text-sm text-muted-foreground">
                Failed to load open orders
              </p>
            </div>
          )}

          {!isLoading && !error && filteredOrders.length === 0 && (
            <div className="text-center py-10">
              <Icon
                name="Search"
                className="w-10 h-10 text-muted-foreground mx-auto mb-2"
              />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No matching orders" : "No open orders"}
              </p>
            </div>
          )}

          {!isLoading &&
            !error &&
            filteredOrders.map((order) => {
              const tableName = (order as unknown as { table?: { name?: string } })
                .table?.name;
              const customerName = (
                order as unknown as { customer?: { name?: string } }
              ).customer?.name;

              return (
                <button
                  key={order.id}
                  type="button"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-border hover:bg-accent/50 transition-colors text-left w-full"
                  onClick={() => handleSelect(order)}
                >
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 shrink-0">
                    <Icon name="Receipt" className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {order.orderNumber ? `#${order.orderNumber}` : order.id}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[tableName, customerName].filter(Boolean).join(" · ") ||
                        order.status}
                    </p>
                  </div>
                  <Icon
                    name="ChevronRight"
                    className="h-4 w-4 text-muted-foreground shrink-0"
                  />
                </button>
              );
            })}
        </div>
        <Shad.ScrollBar />
      </Shad.ScrollArea>
    </div>
  );
}
