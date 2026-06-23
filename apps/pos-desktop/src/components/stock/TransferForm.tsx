import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Button, InputField, SelectField, TextareaField } from "@repo/ui";
import { useBranchStore } from "@/store/branchStore";
import { useModalStore } from "@/store/modalStore";
import { useProducts } from "@/hooks/useProduct";
import { useBranches } from "@/hooks/useBranch";
import { useCreateTransfer } from "@/hooks/useTransfers";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface TransferLineItem {
  productId: string;
  quantity: string;
}

export function TransferForm() {
  const { branchId } = useBranchStore();
  const { closeModal } = useModalStore();

  const { data: products } = useProducts();
  const { data: branches } = useBranches();
  const { mutateAsync: createTransfer, isPending } = useCreateTransfer();

  const [items, setItems] = useState<TransferLineItem[]>([
    { productId: "", quantity: "" },
  ]);

  // Exclude current branch from destination list
  const destinationBranches =
    branches?.filter((b) => b.id !== branchId) ?? [];

  const form = useForm({
    defaultValues: {
      toBranchId: "",
      notes: "",
    },
    onSubmit: async ({ value }) => {
      const validItems = items.filter(
        (i) => i.productId && Number(i.quantity) > 0
      );
      if (validItems.length === 0) {
        toast.error("Add at least one product with a valid quantity.");
        return;
      }

      // Prevent duplicate products in the same transfer
      const productIds = validItems.map((i) => i.productId);
      if (new Set(productIds).size !== productIds.length) {
        toast.error("Duplicate products found. Each product can only appear once.");
        return;
      }

      await createTransfer({
        fromBranchId: branchId!,
        toBranchId: value.toBranchId,
        notes: value.notes || undefined,
        items: validItems.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
        })),
      });

      closeModal();
    },
  });

  const handleAddItem = () => {
    setItems((prev) => [...prev, { productId: "", quantity: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof TransferLineItem,
    value: string
  ) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const usedProductIds = items.map((i) => i.productId).filter(Boolean);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="space-y-5"
    >
      {/* From Branch (read-only info) */}
      <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
        <span className="text-muted-foreground">From: </span>
        <span className="font-medium">Current Branch</span>
      </div>

      {/* Destination Branch */}
      <form.Field
        name="toBranchId"
        validators={{
          onChange: ({ value }) =>
            !value ? "Destination branch is required" : undefined,
        }}
      >
        {(field) => (
          <SelectField
            label="Destination Branch"
            placeholder="Select destination branch"
            field={field}
            options={destinationBranches.map((b) => ({
              label: b.name,
              value: b.id,
            }))}
          />
        )}
      </form.Field>

      {/* Product Line Items */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Products to Transfer</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAddItem}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Product
          </Button>
        </div>

        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex gap-2 items-center">
              {/* Product select */}
              <div className="flex-1">
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={item.productId}
                  onChange={(e) =>
                    handleItemChange(index, "productId", e.target.value)
                  }
                >
                  <option value="" disabled>
                    Select product…
                  </option>
                  {products?.map((p) => (
                    <option
                      key={p.id}
                      value={p.id}
                      disabled={
                        usedProductIds.includes(p.id) &&
                        p.id !== item.productId
                      }
                    >
                      {p.name}
                      {p.sku ? ` (${p.sku})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity input */}
              <div className="w-24">
                <input
                  type="number"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Qty"
                  value={item.quantity}
                  min="0.01"
                  step="0.01"
                  onChange={(e) =>
                    handleItemChange(index, "quantity", e.target.value)
                  }
                />
              </div>

              {/* Remove item */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveItem(index)}
                disabled={items.length === 1}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <form.Field name="notes">
        {(field) => (
          <TextareaField
            label="Notes (Optional)"
            placeholder="Reason for this transfer…"
            field={field}
          />
        )}
      </form.Field>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="outline" onClick={closeModal}>
          Cancel
        </Button>
        <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              disabled={!canSubmit || (isSubmitting as boolean) || isPending}
            >
              {isPending ? "Creating…" : "Create Transfer"}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
