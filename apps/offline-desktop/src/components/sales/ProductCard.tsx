import { memo } from "react";
import { useOrderStore } from "@/store/orderStore";
import type { Category, Product } from "@/shared/models";
import { cn, Icon } from "@repo/ui";
import { formatMoney } from "@/utils/format";

const LOW_STOCK_THRESHOLD = 5;

type ProductWithCategory = Product & {
  category?: Category | null;
};

type Props = {
  product: ProductWithCategory;
  currencySymbol: string;
};

const ProductCard = memo(function ProductCard({
  product,
  currencySymbol,
}: Props) {
  const addItem = useOrderStore((s) => s.addItem);
  // Narrow subscription: this card only re-renders when ITS quantity changes.
  const qty = useOrderStore(
    (s) =>
      s
        .getActiveOrder()
        ?.items.reduce(
          (sum, item) =>
            item.productId === product.id ? sum + item.quantity : sum,
          0,
        ) ?? 0,
  );

  const stock = product.stock;
  const isOutOfStock = product.trackInventory && stock <= 0;
  const isLowStock =
    product.trackInventory && !isOutOfStock && stock <= LOW_STOCK_THRESHOLD;

  const handleAdd = () => {
    if (isOutOfStock) return;
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      imagePath: product.imagePath,
    });
  };

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={isOutOfStock}
      aria-label={`Add ${product.name}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left",
        "transition-all duration-150",
        "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md",
        "active:translate-y-0 active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isOutOfStock && "cursor-not-allowed opacity-50 grayscale",
      )}
    >
      <div className="relative aspect-square w-full bg-muted/40">
        {product.imagePath ? (
          <img
            src={product.imagePath}
            alt=""
            loading="lazy"
            draggable={false}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon
              name="Package"
              className="h-10 w-10 text-muted-foreground/30"
            />
          </div>
        )}

        {/* Price */}
        <div className="absolute left-2 top-2 rounded-md bg-background/90 px-2 py-1 text-xs font-bold tabular-nums shadow-sm backdrop-blur-sm">
          {formatMoney(product.price, currencySymbol)}
        </div>

        {/* Low stock */}
        {isLowStock && (
          <div className="absolute bottom-2 left-2 rounded-md bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
            {stock} left
          </div>
        )}

        {/* In-cart quantity */}
        {qty > 0 && (
          <div className="animate-in zoom-in absolute bottom-2 right-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold tabular-nums text-primary-foreground shadow-md duration-150">
            {qty}
          </div>
        )}

        {/* Sold out */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-md bg-background px-2 py-1 text-xs font-semibold text-destructive">
              Sold out
            </span>
          </div>
        )}
      </div>

      <div className="flex min-h-9 items-center px-2 py-1.5">
        <p className="line-clamp-2 text-xs font-medium leading-tight text-foreground">
          {product.name}
        </p>
      </div>
      {product.category?.color && (
        <div
          aria-hidden
          className="h-1 w-full"
          style={{ background: product.category.color.hex }}
        />
      )}
    </button>
  );
});

export default ProductCard;
