import { Product } from "@repo/types";
import { cn, Icon, Shad } from "@repo/ui";
import { formatPrice } from "./config";
import { useOrderStore } from "@/store/orderStore";

type Props = {
  product: Product;
};

const ProductCard = ({ product }: Props) => {
  const { addItem, getActiveOrder } = useOrderStore();

  const { items } = getActiveOrder() || { items: [] };
  const item = items.find((i) => i.productId === product.id);
  const totalStock =
    product.inventory?.reduce((sum, inv) => sum + Number(inv.stock), 0) ?? 0;

  const isOutOfStock = totalStock === 0;

  const handleAddItem = () => {
    if (isOutOfStock) return;

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
        isOutOfStock
          ? "opacity-60 cursor-not-allowed"
          : "cursor-pointer hover:ring-1 hover:ring-primary/40 active:scale-[0.98]"
      )}
    >
      {item && (
        <div className="absolute bottom-1 right-1 px-2 py-0.5 rounded-md bg-accent/40 backdrop-blur text-xs font-bold text-primary shadow">
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
