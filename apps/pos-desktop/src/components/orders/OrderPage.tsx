import { OrderCart } from "@/components/orders/OrderCart";
import { OrderTabs } from "@/components/orders/OrderTabs";
import { ProductGrid } from "@/components/orders/ProductGrid";
import { Separator } from "@repo/ui";

export function OrderPage() {
  return (
    <div className="fixed top-10 inset-x-0 bottom-8 flex flex-col bg-background">
      {/* Tabs - fixed at top */}
      <OrderTabs className="shrink-0 px-4 pt-2" />

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
