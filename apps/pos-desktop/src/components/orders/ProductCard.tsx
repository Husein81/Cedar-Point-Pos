import { useBranchStore } from "@/store/branchStore";
import { useModalStore } from "@/store/modalStore";
import { useOrderStore } from "@/store/orderStore";
import { SelectedModifier } from "@/types/modifiers";
import { Product } from "@repo/types";
import { cn, Icon, Shad } from "@repo/ui";
import { useProductModifiers } from "@/hooks/useModifiers";
import { formatPrice } from "./config";
import { ModifierModal } from "./ModifierModal";
import { Activity } from "react";

type Props = {
  product: Product;
};

const ProductCard = ({ product }: Props) => {
  const { addItem, getActiveOrder } = useOrderStore();
  const { openModal } = useModalStore();
  const { branchId } = useBranchStore();
  const { data: modifiers } = useProductModifiers(
    product.id,
    product.isModifiable,
  );

  const { items } = getActiveOrder() || { items: [] };

  const item = items.find((i) => i.productId === product.id);

  // Get branch-specific stock (more accurate than summing all branches)
  const branchInventory = product.inventory?.find(
    (inv) => inv.branchId === branchId,
  );
  const currentStock = branchInventory ? Number(branchInventory.stock) : 0;

  // Fallback to total stock if no branch-specific inventory
  const totalStock =
    product.inventory?.reduce((sum, inv) => sum + Number(inv.stock), 0) ?? 0;
  const displayStock = branchInventory ? currentStock : totalStock;

  const isOutOfStock = displayStock <= 0;

  // Calculate resulting stock after adding one more (or current cart quantity + 1)
  const cartQuantity = item?.quantity ?? 0;
  const resultingStockIfAdded = displayStock - (cartQuantity + 1);
  const isNegative = resultingStockIfAdded < 0 || isOutOfStock;

  const handleAddItem = () => {
    // If product is modifiable, check if it has modifiers
    if (product.isModifiable) {
      // If no modifiers to configure, add directly
      if (
        !modifiers ||
        !modifiers.modifierGroups ||
        modifiers.modifierGroups.length === 0
      ) {
        addItem({
          productId: product.id,
          name: product.name,
          price: Number(product.price) || 0,
          quantity: 1,
          imageUrl: product.imageUrl,
        });
        return;
      }

      // Has modifiers, show modal
      openModal(
        product?.name,
        <ModifierModal product={product} onConfirm={handleModifierConfirm} />,
        "Customize your item",
      );
      return;
    }

    // Otherwise add directly
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price) || 0,
      quantity: 1,
      imageUrl: product.imageUrl,
    });
  };

  const handleModifierConfirm = (
    modifiers: SelectedModifier[],
    quantity: number,
  ) => {
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price) || 0,
      quantity,
      imageUrl: product.imageUrl,
      modifiers: modifiers.map((m) => ({
        modifierId: m.modifierId,
        name: m.name,
        price: m.price,
      })),
    });
  };

  return (
    <Shad.Card
      onClick={handleAddItem}
      className={cn(
        "relative overflow-hidden rounded-sm border h-40 p-0",
        "bg-background transition",
        "cursor-pointer",
        isOutOfStock
          ? "opacity-60"
          : "hover:ring-1 hover:ring-primary/40 active:scale-[0.98]",
        isNegative && !isOutOfStock && "ring-1 ring-amber-400",
      )}
    >
      {/* Cart quantity badge */}
      {item && (
        <div
          className={cn(
            "absolute bottom-2 right-1 px-2 py-0.5 rounded-md backdrop-blur text-xs font-bold shadow",
            isNegative
              ? "bg-amber-500/90 text-white"
              : "bg-accent/40 text-primary",
          )}
        >
          {`${item.quantity}`}
        </div>
      )}

      {/* IMAGE (≈ 85–90%) */}
      <div className="relative h-2/3 w-full bg-muted">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            draggable={false}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/40">
            <Icon name="Package" className="w-8 h-8 text-muted-foreground/60" />
          </div>
        )}

        {/* PRICE OVERLAY */}
        <div className="absolute top-1 right-1 px-2 py-0.5 rounded-md bg-background/90 backdrop-blur text-xs font-bold text-primary shadow">
          ${formatPrice(Number(product.price))}
        </div>

        {/* OUT OF STOCK OVERLAY */}
        <Activity mode={isOutOfStock ? "visible" : "hidden"}>
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="px-3 py-1 text-xs font-semibold text-white bg-destructive rounded">
              OUT OF STOCK
            </span>
          </div>
        </Activity>
      </div>
      <div className="px-2 flex items-center">
        <p className="text-xs font-medium truncate leading-tight">
          {product.name}
        </p>
      </div>
      <Activity mode={product.category?.color ? "visible" : "hidden"}>
        <div
          className="rounded-lg"
          style={{
            border: `2px solid ${product.category?.color?.hex || "transparent"}`,
          }}
        />
      </Activity>
    </Shad.Card>
  );
};

export default ProductCard;
