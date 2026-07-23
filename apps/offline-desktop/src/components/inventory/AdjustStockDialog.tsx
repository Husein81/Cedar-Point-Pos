import { useEffect, useState } from "react";
import { Button, Input, Label, Shad } from "@repo/ui";
import { useAdjustStock } from "@/hooks/useInventory";
import { useProducts } from "@/hooks/useProduct";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const AdjustStockDialog = ({ open, onOpenChange }: Props) => {
  const adjustStock = useAdjustStock();

  const [search, setSearch] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  const { data } = useProducts({
    page: 1,
    pageSize: 10,
    search: search || undefined,
    activeOnly: false,
    lowStockOnly: false,
  });

  useEffect(() => {
    if (open) {
      setSearch("");
      setProductId("");
      setQuantity("");
      setReason("");
    }
  }, [open]);

  const handleSubmit = async () => {
    await adjustStock.mutateAsync({
      productId,
      quantity: Number(quantity),
      reason,
    });
    onOpenChange(false);
  };

  return (
    <Shad.Dialog open={open} onOpenChange={onOpenChange}>
      <Shad.DialogContent className="max-w-sm">
        <Shad.DialogHeader>
          <Shad.DialogTitle>Adjust Stock</Shad.DialogTitle>
          <Shad.DialogDescription>
            Positive adds stock, negative removes it
          </Shad.DialogDescription>
        </Shad.DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Product</Label>
            <Input
              placeholder="Search product..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setProductId("");
              }}
            />
            {search && !productId && (
              <div className="rounded-md border max-h-40 overflow-y-auto divide-y">
                {data?.items.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                    onClick={() => {
                      setProductId(product.id);
                      setSearch(product.name);
                    }}
                  >
                    {product.name}
                    {product.trackInventory && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {product.stock} in stock
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Quantity (+/-)</Label>
            <Input
              type="number"
              placeholder="e.g. 10 or -5"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Reason</Label>
            <Input
              placeholder="e.g. Damaged, Stock count"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <Shad.DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={
              !productId ||
              !Number(quantity) ||
              !reason ||
              adjustStock.isPending
            }
            isSubmitting={adjustStock.isPending}
            onClick={handleSubmit}
          >
            Adjust
          </Button>
        </Shad.DialogFooter>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
};
