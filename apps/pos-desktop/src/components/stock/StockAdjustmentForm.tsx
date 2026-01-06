import { useForm } from "@tanstack/react-form";
import { useMemo, useState } from "react";
import { Button, InputField, SelectField, TextareaField } from "@repo/ui";
import { useAdjustStock } from "@/hooks/useStock";
import { useModalStore } from "@/store/modalStore";
import { useProducts } from "@/hooks/useProduct";
import { stockApi } from "@/apis/stockApi";

type AdjustmentType = "STOCK_IN" | "STOCK_OUT" | "SET_STOCK";

interface StockAdjustmentFormProps {
  branchId: string;
  productId?: string;
  productName?: string;
  currentStock?: string;
}

/* ---------------------------------- helpers ---------------------------------- */

const ADJUSTMENT_OPTIONS = [
  { label: "Stock In (Add)", value: "STOCK_IN" },
  { label: "Stock Out (Remove)", value: "STOCK_OUT" },
  { label: "Set Stock (Override)", value: "SET_STOCK" },
];

const getQuantityMeta = (type: AdjustmentType) => {
  switch (type) {
    case "SET_STOCK":
      return {
        placeholder: "e.g. 100",
        subLabel: "Set the absolute stock level",
      };
    case "STOCK_OUT":
      return {
        placeholder: "e.g. 30",
        subLabel: "Quantity to remove from stock",
      };
    default:
      return {
        placeholder: "e.g. 50",
        subLabel: "Quantity to add to stock",
      };
  }
};

const buildDefaultReason = (
  type: AdjustmentType,
  quantity: number,
  minStock?: number
) => {
  const base =
    type === "SET_STOCK"
      ? `Stock set to ${quantity}`
      : type === "STOCK_IN"
        ? `Added ${quantity} units`
        : `Removed ${quantity} units`;

  return minStock !== undefined
    ? `${base} | Min stock set to ${minStock}`
    : base;
};

/* -------------------------------- component -------------------------------- */

export const StockAdjustmentForm = ({
  branchId,
  productId,
  productName,
  currentStock,
}: StockAdjustmentFormProps) => {
  const { closeModal } = useModalStore();
  const { data: products } = useProducts();
  const adjustStock = useAdjustStock();

  const [isValidating, setIsValidating] = useState(false);

  const form = useForm({
    defaultValues: {
      productId: productId ?? "",
      adjustmentType: "STOCK_IN" as AdjustmentType,
      quantity: "",
      minStock: "",
      reason: "",
    },

    onSubmit: async ({ value }) => {
      const quantity = Number(value.quantity);
      const minStock = value.minStock ? Number(value.minStock) : undefined;

      try {
        setIsValidating(true);

        if (value.adjustmentType === "STOCK_OUT") {
          const validation = await stockApi.validateStockAdjustment(
            branchId,
            value.productId,
            quantity,
            value.adjustmentType
          );

          if (!validation.valid) {
            throw new Error(validation.message ?? "Invalid stock adjustment");
          }
        }

        await adjustStock.mutateAsync({
          branchId,
          productId: value.productId,
          adjustmentType: value.adjustmentType,
          quantity,
          minStock,
          reason:
            value.reason ||
            buildDefaultReason(value.adjustmentType, quantity, minStock),
        });

        closeModal();
      } catch (err) {
        console.error("Stock adjustment failed", err);
      } finally {
        setIsValidating(false);
      }
    },
  });

  const adjustmentType = form.getFieldValue("adjustmentType");
  const quantityMeta = useMemo(
    () => getQuantityMeta(adjustmentType),
    [adjustmentType]
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="space-y-5"
    >
      {/* Product summary */}
      {productName && currentStock !== undefined && (
        <div className="rounded-md border p-3 bg-muted/40">
          <p className="text-sm font-medium">{productName}</p>
          <p className="text-xs text-muted-foreground">
            Current stock: {currentStock}
          </p>
        </div>
      )}

      {/* Product selector */}
      {!productId && (
        <form.Field
          name="productId"
          validators={{
            onChange: ({ value }) =>
              !value ? "Product is required" : undefined,
          }}
        >
          {(field) => (
            <SelectField
              label="Product"
              placeholder="Select product"
              field={field}
              options={
                products?.map((p) => ({
                  label: `${p.name}${p.sku ? ` (${p.sku})` : ""}`,
                  value: p.id,
                })) ?? []
              }
            />
          )}
        </form.Field>
      )}

      {/* Adjustment type */}
      <form.Field name="adjustmentType">
        {(field) => (
          <SelectField
            label="Adjustment Type"
            placeholder="Select adjustment"
            field={field}
            options={ADJUSTMENT_OPTIONS}
          />
        )}
      </form.Field>

      {/* Quantity */}
      <form.Field name="quantity">
        {(field) => (
          <InputField
            label="Quantity"
            required
            type="number"
            step="0.01"
            field={field}
            placeholder={quantityMeta.placeholder}
            subLabel={quantityMeta.subLabel}
          />
        )}
      </form.Field>

      {/* Min stock */}
      <form.Field name="minStock">
        {(field) => (
          <InputField
            label="Minimum Stock (Optional)"
            type="number"
            step="0.01"
            field={field}
            placeholder="Enter minimum stock"
            subLabel="Used for low-stock alerts"
          />
        )}
      </form.Field>

      {/* Reason */}
      <form.Field name="reason">
        {(field) => (
          <TextareaField
            label="Reason (Optional)"
            placeholder="Explain why this adjustment is made"
            field={field}
          />
        )}
      </form.Field>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" type="button" onClick={closeModal}>
          Cancel
        </Button>

        <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              disabled={!canSubmit || isSubmitting || isValidating}
            >
              {isValidating
                ? "Validating…"
                : isSubmitting
                  ? "Processing…"
                  : "Apply Adjustment"}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
};
