import { ProductGrid } from "./ProductGrid";
import { OrderCart } from "./OrderCart";
import { OrderTabs } from "./OrderTabs";

type Props = {
  currencySymbol: string;
  taxRate: number;
};

export function OrderPage({ currencySymbol, taxRate }: Props) {
  return (
    <div className="fixed top-10 inset-x-0 bottom-0 flex flex-col bg-background">
      <OrderTabs />

      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        <div className="flex-1 p-4 min-h-0 overflow-hidden">
          <ProductGrid currencySymbol={currencySymbol} />
        </div>

        <div className="w-full md:w-100 lg:w-110 2xl:w-120 shrink-0 flex flex-col border-l border-border min-h-0 overflow-hidden">
          <OrderCart currencySymbol={currencySymbol} taxRate={taxRate} />
        </div>
      </div>
    </div>
  );
}
