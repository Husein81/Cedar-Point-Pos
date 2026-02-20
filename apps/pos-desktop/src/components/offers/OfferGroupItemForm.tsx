import { useState } from "react";
import { Button, Input, Label, Empty, Icon } from "@repo/ui";
import { useAddOfferGroupItem } from "@/hooks/useOffers";
import { useProducts } from "@/hooks/useProduct";
import { useModalStore } from "@/store/modalStore";
import type { Product } from "@repo/types";

type OfferGroupItemFormProps = {
  offerId: string;
  groupId: string;
};

export const OfferGroupItemForm = ({
  offerId,
  groupId,
}: OfferGroupItemFormProps) => {
  const { closeModal } = useModalStore();
  const { data: products, isLoading: productsLoading } = useProducts();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [extraPrice, setExtraPrice] = useState("0");

  const addItem = useAddOfferGroupItem();

  const filteredProducts = (products ?? []).filter((p: Product) => {
    if (!p.isActive || p.isDeleted) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.barcode?.toLowerCase().includes(q)
    );
  });

  const selectedProduct = products?.find(
    (p: Product) => p.id === selectedProductId,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProductId) return;
    const parsedExtra = parseFloat(extraPrice);
    if (isNaN(parsedExtra) || parsedExtra < 0) return;

    addItem.mutate(
      {
        offerId,
        groupId,
        data: { productId: selectedProductId, extraPrice: parsedExtra },
      },
      { onSuccess: () => closeModal() },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      {/* Product Search */}
      <div className="space-y-2">
        <Label>Select Product</Label>
        <div className="relative">
          <Icon
            name="Search"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>
      </div>

      {/* Product List */}
      <div className="border rounded-lg max-h-48 overflow-y-auto">
        {productsLoading ? (
          <div className="flex justify-center p-4">
            <Icon name="LoaderCircle" className="animate-spin h-5 w-5" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-4">
            <Empty title="No products found" />
          </div>
        ) : (
          filteredProducts.map((product: Product) => (
            <div
              key={product.id}
              className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                selectedProductId === product.id
                  ? "bg-primary/10 border-l-2 border-primary"
                  : "hover:bg-muted/50"
              }`}
              onClick={() => setSelectedProductId(product.id)}
            >
              <span className="text-sm">{product.name}</span>
              <span className="text-xs text-muted-foreground">
                ${Number(product.price).toFixed(2)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Selected Product Info */}
      {selectedProduct && (
        <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
          Selected: <span className="font-medium text-foreground">{selectedProduct.name}</span>{" "}
          (${Number(selectedProduct.price).toFixed(2)})
        </div>
      )}

      {/* Extra Price */}
      <div className="space-y-2">
        <Label htmlFor="extra-price">Extra Price</Label>
        <Input
          id="extra-price"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={extraPrice}
          onChange={(e) => setExtraPrice(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Additional charge on top of the offer base price for this product.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={closeModal}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={addItem.isPending || !selectedProductId}
        >
          {addItem.isPending ? "Adding..." : "Add Product"}
        </Button>
      </div>
    </form>
  );
};
