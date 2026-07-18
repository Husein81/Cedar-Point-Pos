import { memo } from "react";
import { useBranchStore } from "@/store/branchStore";
import { useModalStore } from "@/store/modalStore";
import { useOrderStore } from "@/store/orderStore";
import { SelectedModifier } from "@/types/modifiers";
import { Product } from "@repo/types";
import { cn, Icon } from "@repo/ui";
import { useProductModifiers } from "@/hooks/useModifiers";
import { formatPrice } from "./config";
import { ModifierModal } from "./ModifierModal";

const LOW_STOCK_THRESHOLD = 5;

type Props = {
  product: Product;
};

const ProductCard = memo(function ProductCard({ product }: Props) {
  const addItem = useOrderStore((s) => s.addItem);
  // Narrow subscription: this card only re-renders when ITS quantity changes,
  // not on every cart mutation.
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

  const { openModal } = useModalStore();
  const { branchId } = useBranchStore();

  const { data: modifiers } = useProductModifiers(
    product.id,
    product.isModifiable,
  );

  const stock = Number(
    product.inventory?.find((i) => i.branchId === branchId)?.stock ??
      product.inventory?.reduce((a, b) => a + Number(b.stock), 0) ??
      0,
  );

  const isOutOfStock = stock <= 0;
  const isLowStock = !isOutOfStock && stock <= LOW_STOCK_THRESHOLD;
  const hasModifiers =
    product.isModifiable && (product.modifiers?.length ?? 0) > 0;

  const handleModifierConfirm = (
    selected: SelectedModifier[],
    quantity: number,
  ) => {
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price) || 0,
      quantity,
      imageUrl: product.imageUrl,
      modifiers: selected.map((m) => ({
        modifierId: m.modifierId,
        name: m.name,
        price: m.price,
      })),
    });
  };

  const handleAdd = () => {
    if (isOutOfStock) return;

    if (product.isModifiable && modifiers?.modifierGroups?.length) {
      openModal(
        product.name,
        <ModifierModal product={product} onConfirm={handleModifierConfirm} />,
        "Customize",
      );
      return;
    }

    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price) || 0,
      quantity: 1,
      imageUrl: product.imageUrl,
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
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt=""
            loading="lazy"
            draggable={false}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon name="Package" className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}

        {/* Price */}
        <div className="absolute left-2 top-2 rounded-md bg-background/90 px-2 py-1 text-xs font-bold tabular-nums shadow-sm backdrop-blur-sm">
          ${formatPrice(Number(product.price))}
        </div>

        {/* Customizable */}
        {hasModifiers && (
          <div
            title="Customizable"
            className="absolute right-2 top-2 rounded-md bg-background/90 p-1 shadow-sm backdrop-blur-sm"
          >
            <Icon name="Settings2" className="size-4 text-muted-foreground" />
          </div>
        )}

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
          className="h-1 w-full shrink-0"
          style={{ background: product.category.color.hex }}
        />
      )}
    </button>
  );
});

export default ProductCard;
