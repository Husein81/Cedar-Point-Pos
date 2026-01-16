import { Product } from "@repo/types";
import { cn, Icon, Shad } from "@repo/ui";
import { formatPrice } from "./config";
import { useOrderStore } from "@/store/orderStore";
import { useBranchStore } from "@/store/branchStore";

type Props = {
  product: Product;
};

const ProductCard = ({ product }: Props) => {
  const { addItem, getActiveOrder } = useOrderStore();
  const { branchId } = useBranchStore();

  const { items } = getActiveOrder() || { items: [] };
  const item = items.find((i) => i.productId === product.id);

  // Get branch-specific stock (more accurate than summing all branches)
  const branchInventory = product.inventory?.find(
    (inv) => inv.branchId === branchId
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
  const wouldGoNegative = resultingStockIfAdded < 0 || isOutOfStock;

  const handleAddItem = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price) || 0,
      quantity: 1,
      imageUrl: product.imageUrl,
    });
  };

  return (
    <Shad.Card
      onClick={handleAddItem}
      className={cn(
        "relative overflow-hidden rounded-md border",
        "h-37.5 w-full p-0",
        "bg-background transition",
        "cursor-pointer",
        isOutOfStock
          ? "opacity-60"
          : "hover:ring-1 hover:ring-primary/40 active:scale-[0.98]",
        wouldGoNegative && !isOutOfStock && "ring-1 ring-amber-400"
      )}
    >
      {/* Cart quantity badge */}
      {item && (
        <div
          className={cn(
            "absolute bottom-1 right-1 px-2 py-0.5 rounded-md backdrop-blur text-xs font-bold shadow",
            wouldGoNegative
              ? "bg-amber-500/90 text-white"
              : "bg-accent/40 text-primary"
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
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="px-3 py-1 text-xs font-semibold text-white bg-destructive rounded">
              OUT OF STOCK
            </span>
          </div>
        )}
      </div>
      <div className="h-[15%] px-2 flex items-center">
        <p className="text-xs font-medium truncate leading-tight">
          {product.name}
        </p>
      </div>
    </Shad.Card>
  );
};

export default ProductCard;
