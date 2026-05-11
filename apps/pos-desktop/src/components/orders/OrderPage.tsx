import { OrderCart } from "@/components/orders/OrderCart";
import { OrderTabs } from "@/components/orders/OrderTabs";
import { ProductGrid } from "@/components/orders/ProductGrid";
import { Separator, Button, Icon } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import { useOrderStore } from "@/store/orderStore";
import { OrderType } from "@repo/types";
import { useEffect, useLayoutEffect, useRef } from "react";

type Props = {
  tableId?: string;
  tableName?: string;
  orderType?: string;
  showBackToTables?: boolean;
  isLoadedOrder?: boolean;
};

export function OrderPage({
  tableId,
  tableName,
  orderType: _orderType,
  showBackToTables,
  isLoadedOrder,
}: Props) {
  const navigate = useNavigate();
  const {
    createTabWithTable,
    createTab,
    getActiveOrder,
    setTable,
    setOrderType,
  } = useOrderStore();
  const order = getActiveOrder();
  const activeTableId = showBackToTables
    ? tableId
    : (order?.tableId ?? tableId);
  const activeTableName = order?.tableName ?? null;

  // Use useLayoutEffect to switch/create the table tab synchronously
  // before the browser paints, preventing the stale-table flash.
  const tableInitRef = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (tableId && tableName) {
      // Only re-run if the target table actually changed
      if (tableInitRef.current !== tableId) {
        tableInitRef.current = tableId;
        createTabWithTable(tableId, tableName);
      }
    } else {
      tableInitRef.current = null;
    }
  }, [tableId, tableName, createTabWithTable]);

  // For new takeaway orders, ensure the active tab is clean.
  // Skip this for loaded orders — their state was already hydrated by loadOrder.
  useEffect(() => {
    if (!showBackToTables || isLoadedOrder) return;

    const active = getActiveOrder();
    if (!active) return;

    const isDineIn = !!active.tableId || active.type === OrderType.DINE_IN;

    if (isDineIn) {
      createTab();
      setTable(null, null);
      setOrderType(OrderType.TAKEAWAY);
    } else if (active.type !== OrderType.TAKEAWAY) {
      setOrderType(OrderType.TAKEAWAY);
    }
  }, [
    showBackToTables,
    isLoadedOrder,
    createTab,
    getActiveOrder,
    setOrderType,
    setTable,
  ]);

  const hasTables = activeTableId || showBackToTables;

  return (
    <div className="fixed top-10 inset-x-0 bottom-0 flex flex-col bg-background">
      <OrderTabs
        className="shrink-0 px-4 pt-2"
        leftElement={
          hasTables && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: "/tables" })}
              className="h-7 mb-1 text-muted-foreground"
            >
              <Icon name="LayoutGrid" className="w-4 h-4" />
              <span className="hidden lg:inline">Tables</span>
            </Button>
          )
        }
      />

      {/* Main layout - takes remaining height */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Left: Product selection - scrollable */}
        <div className="flex-1 p-4 min-h-0 overflow-hidden">
          <ProductGrid />
        </div>

        <Separator orientation="vertical" className="hidden md:block" />

        {/* Right: Cart Panel - fixed width, contains inline keypad */}
        <div className="w-full md:w-120 shrink-0 flex flex-col border-l border-border min-h-0 overflow-hidden">
          <OrderCart />
        </div>
      </div>
    </div>
  );
}
