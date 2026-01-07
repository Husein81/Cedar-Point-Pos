import { OrderTabs } from "@/components/orders/OrderTabs";
import { ProductGrid } from "@/components/orders/ProductGrid";
import { OrderCart } from "@/components/orders/OrderCart";
import { OrderSummary } from "@/components/orders/OrderSummary";
import { Separator, Shad } from "@repo/ui";

export default function OrderPage() {
  return (
    <div className="flex flex-col h-full w-full gap-4 p-2 md:p-4">
      {/* Tabs */}
      <OrderTabs className="mb-2 -mt-8" />

      {/* Main layout: left (products) / right (cart+summary) */}
      <div className="flex-1 flex flex-col md:flex-row gap-4">
        {/* Left: Product selection */}
        <Shad.ScrollArea className="flex-1">
          <ProductGrid className="" />
        </Shad.ScrollArea>
        <Separator orientation="vertical" />
        {/* Right: Cart & Summary */}
        <div className="w-full md:w-100 flex flex-col gap-4">
          <OrderCart className="flex-1" />
          <OrderSummary />
        </div>
      </div>
    </div>
  );
}
