import { ProductDocument } from "@/db";
import { Icon } from "@repo/ui";

type Props = {
  product: ProductDocument;
  categoryColorHex?: string;
  onClick?: () => void;
};

export function OfflineProductCard({
  product,
  categoryColorHex,

  onClick,
}: Props) {
  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col rounded-lg border border-border bg-card hover:border-primary hover:shadow-md transition-all cursor-pointer h-full overflow-hidden"
    >
      {/* Image or placeholder */}
      <div className="relative h-32 bg-muted rounded-t-lg flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <Icon name="Image" className="w-8 h-8 text-muted-foreground" />
        )}
      </div>

      {/* Product info */}
      <div className="flex flex-1 flex-col justify-between p-3 gap-2">
        <div>
          <h3 className="font-semibold text-sm line-clamp-2 text-foreground">
            {product.name}
          </h3>
          {(product.sku || product.barcode) && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {product.sku && `SKU: ${product.sku}`}
              {product.sku && product.barcode && " • "}
              {product.barcode && `${product.barcode}`}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          {product.price && (
            <span className="font-bold text-sm text-primary">
              ${Number(product.price).toFixed(2)}
            </span>
          )}
          <div className="flex gap-1">
            {!product.isSynced && (
              <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-700">
                pending
              </span>
            )}
            {product.isLocalOnly && (
              <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700">
                local
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Color bar at bottom */}
      {categoryColorHex && (
        <div
          className="h-1 w-full"
          style={{ backgroundColor: categoryColorHex }}
        />
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/10 transition-colors" />
    </div>
  );
}
