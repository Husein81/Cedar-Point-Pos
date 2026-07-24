import { useState } from "react";
import { Button, Input, Label, Empty, Icon, InputField } from "@repo/ui";
import { useAddOfferGroupItem } from "@/hooks/useOffers";
import { useProducts } from "@/hooks/useProduct";
import { useBaseCurrency } from "@/hooks/useCurrency";
import { useModalStore } from "@/store/modalStore";
import type { Product } from "@repo/types";
import { useForm } from "@tanstack/react-form";

type OfferGroupItemFormProps = {
  offerId: string;
  groupId: string;
};

export const OfferGroupItemForm = ({
  offerId,
  groupId,
}: OfferGroupItemFormProps) => {
  const { closeModal } = useModalStore();
  const { format: formatMoney } = useBaseCurrency();
  const { data: products, isLoading: productsLoading } = useProducts();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );

  const addItem = useAddOfferGroupItem();

  const filteredProducts = (products ?? []).filter((p: Product) => {
    if (!p.isActive || p.deletedAt) return false;
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

  const form = useForm({
    defaultValues: {
      extraPrice: 0,
    },
    onSubmit: async ({ value }) => {
      if (!selectedProductId) return;
      try {
        await addItem.mutateAsync({
          offerId,
          groupId,
          data: { productId: selectedProductId, extraPrice: value.extraPrice },
        });
        closeModal();
      } catch (error) {
        console.error(error);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    form.handleSubmit();
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
                {formatMoney(product.price)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Selected Product Info */}
      {selectedProduct && (
        <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
          Selected:{" "}
          <span className="font-medium text-foreground">
            {selectedProduct.name}
          </span>{" "}
          ({formatMoney(selectedProduct.price)})
        </div>
      )}

      {/* Extra Price */}
      <form.Field name="extraPrice">
        {(field) => (
          <InputField
            label="Extra Price"
            placeholder="0.00"
            field={field}
            subLabel="Additional charge on top of the offer base price for this product."
          />
        )}
      </form.Field>

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
          disabled={!selectedProductId}
          isSubmitting={addItem.isPending}
        >
          {addItem.isPending ? "Adding..." : "Add Product"}
        </Button>
      </div>
    </form>
  );
};
