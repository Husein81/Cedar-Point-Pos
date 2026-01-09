import { createFileRoute } from "@tanstack/react-router";
import { OrderTabs } from "@/components/orders/OrderTabs";
import { ProductGrid } from "@/components/orders/ProductGrid";
import { OrderCart } from "@/components/orders/OrderCart";
import { OrderSummary } from "@/components/orders/OrderSummary";
import { Separator } from "@repo/ui";

export const Route = createFileRoute("/orders/")({
  component: OrderPage,
});

function OrderPage() {
  return (
    // Fixed position to break out of scrollable parent - orders page never scrolls
    // bottom-8 leaves room for Footer (h-8)
    <div className="fixed top-10 left-12 right-0 bottom-8 flex flex-col bg-background z-10">
      {/* Tabs - fixed at top */}
      <OrderTabs className="shrink-0 px-4 pt-2" />

      {/* Main layout - takes remaining height */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Left: Product selection - scrollable */}
        <div className="flex-1 p-4 min-w-0 min-h-0 overflow-hidden">
          <ProductGrid className="h-full" />
        </div>

        <Separator orientation="vertical" className="hidden md:block" />

        {/* Right: Cart & Summary - fixed width panel */}
        <div className="w-full md:w-112.5 shrink-0 flex flex-col border-l border-border min-h-0 overflow-hidden">
          {/* Cart items - scrollable */}
          <div className="flex-1 min-h-0 p-4 overflow-hidden">
            <OrderCart className="h-full" />
          </div>
          {/* Summary - always visible */}
          <Separator />
          <div className="shrink-0 p-4 bg-muted/20">
            <OrderSummary />
          </div>
        </div>
      </div>
    </div>
  );
}
