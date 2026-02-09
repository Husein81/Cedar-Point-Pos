import { OrderCart } from "@/components/orders/OrderCart";
import { OrderTabs } from "@/components/orders/OrderTabs";
import { ProductGrid } from "@/components/orders/ProductGrid";
import { Separator, Button, Icon } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import { useOrderStore } from "@/store/orderStore";
import { useEffect } from "react";

type Props = {
  tableId?: string;
  tableName?: string;
};

export function OrderPage({ tableId, tableName }: Props) {
  const navigate = useNavigate();
  const { createTabWithTable,  } = useOrderStore();

  useEffect(() => {
    if (tableId && tableName) {
      createTabWithTable(tableId, tableName);
    } 
  }, [tableId, tableName, createTabWithTable]);

  return (
    <div className="fixed top-10 inset-x-0 bottom-8 flex flex-col bg-background">
      {/* Table Context Header - Only visible when a table is selected */}
      {tableId && (
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
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Order for:</span>
              <span className="font-semibold text-lg">{tableName}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs - fixed at top (Hide when in specific table mode to avoid confusion, or keep specialized?) 
          User asked for Odoo style which focuses on the table. Only show tabs if NOT in table mode.
      */}
      {!tableId && <OrderTabs className="shrink-0 px-4 pt-2" />}

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
