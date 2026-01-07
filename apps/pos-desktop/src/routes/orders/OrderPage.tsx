import { OrderTabs } from "@/components/orders/OrderTabs";
import { ProductGrid } from "@/components/orders/ProductGrid";
import { OrderCart } from "@/components/orders/OrderCart";
import { OrderSummary } from "@/components/orders/OrderSummary";

export default function OrderPage() {
  return (
    <div className="flex flex-col h-full w-full gap-4 p-2 md:p-4">
      {/* Tabs */}
      <OrderTabs className="mb-2" />

      {/* Main layout: left (products) / right (cart+summary) */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
        {/* Left: Product selection */}
        <div className="flex-1 min-w-0">
          <ProductGrid className="h-full" />
        </div>
        {/* Right: Cart & Summary */}
        <div className="w-full md:w-100 flex flex-col gap-4 min-h-0">
          <OrderCart className="flex-1 min-h-0" />
          <OrderSummary />
        </div>
      </div>
    </div>
  );
}
