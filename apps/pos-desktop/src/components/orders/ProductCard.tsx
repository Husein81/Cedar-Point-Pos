import { useBranchStore } from "@/store/branchStore";
import { useModalStore } from "@/store/modalStore";
import { useOrderStore } from "@/store/orderStore";
import { SelectedModifier } from "@/types/modifiers";
import { Product } from "@repo/types";
import { cn, Icon } from "@repo/ui";
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

  const stock =
    product.inventory?.find((i) => i.branchId === branchId)?.stock ??
    product.inventory?.reduce((a, b) => a + Number(b.stock), 0) ??
    0;

  const isOutOfStock = Number(stock) <= 0;
  const qty = item?.quantity ?? 0;

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
    <button
      onClick={handleAdd}
      disabled={isOutOfStock}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border bg-white dark:bg-gray-800 text-left",
        "transition active:scale-[0.98]",
        "hover:shadow-md hover:border-primary/30",
        isOutOfStock && "opacity-50 grayscale cursor-not-allowed",
      )}
    >
      <div className="relative aspect-square w-full bg-gray-50 dark:bg-gray-800">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon name="Package" className="h-10 w-10 text-gray-300" />
          </div>
        )}

        <div className="absolute left-2 top-2 rounded-md bg-input/90 px-2 py-1 text-xs font-bold shadow">
          ${formatPrice(Number(product.price))}
        </div>

        <Activity
          mode={
            product.isModifiable && product.modifiers?.length! > 0
              ? "visible"
              : "hidden"
          }
        >
          <div className="absolute right-2 top-2 rounded-md bg-input/90 px-2 py-1 text-xs font-bold shadow">
            <Icon name="Settings2" className="size-4" />
          </div>
        </Activity>

        {/* OUT OF STOCK */}
        <Activity mode={isOutOfStock ? "visible" : "hidden"}>
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-red-500">
              Unavailable
            </span>
          </div>
        </Activity>
      </div>

      <div className="flex items-center justify-between gap-2 px-2 py-1">
        <p className="truncate text-xs font-medium text-gray-700">
          {product.name}
        </p>

        <div
          className={cn("flex h-7 w-7 items-center justify-center rounded-md")}
        >
          {qty > 0 && (
            <div className="absolute bottom-2 right-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-white shadow">
              {qty}
            </div>
          )}
        </div>
      </div>

      {product.category?.color && (
        <div
          className="h-1 w-full"
          style={{ background: product.category.color.hex }}
        />
      )}
    </button>
  );
};

export default ProductCard;
