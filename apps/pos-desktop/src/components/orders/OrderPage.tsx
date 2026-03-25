import { OrderCart } from "@/components/orders/OrderCart";
import { OrderTabs } from "@/components/orders/OrderTabs";
import { OfflineProductBrowser } from "@/components/products/offline";
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

  const tableInitRef = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (tableId && tableName) {
      if (tableInitRef.current !== tableId) {
        tableInitRef.current = tableId;
        createTabWithTable(tableId, tableName);
      }
    } else {
      tableInitRef.current = null;
    }
  }, [tableId, tableName, createTabWithTable]);

  useEffect(() => {
    if (!showBackToTables || isLoadedOrder) return;

    const active = getActiveOrder();
    if (!active) return;

    const isClean = !active.tableId && active.items.length === 0;
    const isTakeaway = active.type === OrderType.TAKEAWAY;

    if (!isClean || !isTakeaway) {
      if (active.items.length > 0 || active.tableId) {
        createTab();
      }

      setTable(null, null);
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

  return (
    <div className="fixed top-10 inset-x-0 bottom-0 flex flex-col bg-background">
      {(activeTableId || showBackToTables) && (
        <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b bg-muted/20">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: "/tables" })}
              className="gap-2 h-8"
            >
              <Icon name="ArrowLeft" className="w-4 h-4" />
              Back to Tables
            </Button>
            {activeTableId && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Order for:</span>
                <span className="font-semibold text-lg">{activeTableName}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {!activeTableId && <OrderTabs className="shrink-0 px-4 pt-2" />}

      {/* Main layout - takes remaining height */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        <div className="flex-1 p-4 min-h-0 overflow-hidden">
          <OfflineProductBrowser />
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
