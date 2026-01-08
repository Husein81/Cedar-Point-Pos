import { Product } from "@repo/types";
import { cn, Icon, Shad } from "@repo/ui";
import { formatPrice } from "./config";

type Props = {
  product: Product;
  onClick: () => void;
};

// Format currency for Lebanese retail (LBP)
const ProductCard = ({ product, onClick }: Props) => {
  const hasImage = !!product.imageUrl;

  return (
    <Shad.Card
      onClick={onClick}
      className={cn(
        "flex flex-col p-0 gap-0 h-full w-full overflow-hidden group/card cursor-pointer",
        "border-border/50",
        "hover:border-primary/30 hover:shadow-md",
        "transition-all duration-200 active:scale-[0.98]"
      )}
    >
      {/* Image Container - edge-to-edge, premium look */}
      <div className="relative w-full h-40 overflow-hidden bg-muted/20 shrink-0 border-b border-border/50">
        {hasImage ? (
          <img
            src={product.imageUrl!}
            alt={product.name}
            className="w-full h-full object-cover object-center transition-transform duration-300 group-hover/card:scale-105"
            draggable={false}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-muted/30 to-muted/60">
            <Icon
              name="Package"
              className="w-10 h-10 text-muted-foreground/50"
            />
          </div>
        )}
      </div>

      {/* Content - clean hierarchy */}
      <div className="flex flex-col p-3 gap-1.5 flex-1">
        <p className="text-sm font-medium leading-tight line-clamp-2 h-10 cursor-default text-left">
          {product.name}
        </p>

        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-primary">
            ${formatPrice(Number(product.price))}
          </span>
        </div>

        <p className="text-xs text-muted-foreground/70 truncate font-mono h-4 text-left">
          {product.barcode ?? ""}
        </p>
      </div>
    </Shad.Card>
  );
};
export default ProductCard;
