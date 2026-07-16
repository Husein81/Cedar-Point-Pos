import { useForm } from "@tanstack/react-form";
import { useMemo, useState, useCallback, useEffect } from "react";
import { Button, InputField, SelectField, TextareaField } from "@repo/ui";
import { useAdjustStock } from "@/hooks/useStock";
import { useModalStore } from "@/store/modalStore";
import { useProducts } from "@/hooks/useProduct";
import { stockApi } from "@/apis/stockApi";
import {
  validateStockAdjustment,
  calculateStockPreview,
} from "@/utils/inventoryUtils";
import { AdjustmentType } from "@/dto/inventory.dto";
import {
  ADJUSTMENT_OPTIONS,
  buildDefaultReason,
  getQuantityMeta,
} from "./config";

interface StockAdjustmentFormProps {
  branchId: string;
  productId?: string;
  productName?: string;
  currentStock?: string;
}

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
  const [validationMessage, setValidationMessage] = useState<{
    message: string;
    severity: "error" | "warning" | "info";
  } | null>(null);
  const [stockPreview, setStockPreview] = useState<{
    before: number;
    after: number;
    change: number;
  } | null>(null);

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

        // Validate before submit (only STOCK_OUT)
        await validateBeforeSubmit(
          value.productId,
          quantity,
          value.adjustmentType,
        );

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
  const quantity = form.getFieldValue("quantity");
  const minStock = form.getFieldValue("minStock");

  const quantityMeta = useMemo(
    () => getQuantityMeta(adjustmentType),
    [adjustmentType],
  );

  // Live validation and preview
  useEffect(() => {
    const currentStockNum = currentStock ? Number(currentStock) : 0;
    const quantityNum = quantity ? Number(quantity) : 0;
    const minStockNum = minStock ? Number(minStock) : undefined;

    if (quantityNum > 0) {
      // Validate
      const validation = validateStockAdjustment(
        adjustmentType,
        quantityNum,
        currentStockNum,
        minStockNum,
      );

      if (!validation.valid || validation.severity === "warning") {
        setValidationMessage({
          message: validation.message || "",
          severity: validation.severity,
        });
      } else {
        setValidationMessage(null);
      }

      // Calculate preview
      const preview = calculateStockPreview(
        adjustmentType,
        quantityNum,
        currentStockNum,
      );
      setStockPreview(preview);
    } else {
      setValidationMessage(null);
      setStockPreview(null);
    }
  }, [adjustmentType, quantity, currentStock, minStock]);

  // Optimized validation - only for STOCK_OUT
  const validateBeforeSubmit = useCallback(
    async (productId: string, quantity: number, type: AdjustmentType) => {
      // Only validate STOCK_OUT via API (backend check)
      if (type !== "STOCK_OUT") return true;

      try {
        const validation = await stockApi.validateStockAdjustment(
          branchId,
          productId,
          quantity,
          type,
        );

        if (!validation.valid) {
          throw new Error(validation.message ?? "Invalid stock adjustment");
        }
        return true;
      } catch (error) {
        throw error;
      }
    },
    [branchId],
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

      {/* Validation message */}
      {validationMessage && (
        <div
          className={`rounded-md border p-3 text-sm ${
            validationMessage.severity === "error"
              ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200"
              : "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-200"
          }`}
        >
          {validationMessage.message}
        </div>
      )}

      {/* Stock preview */}
      {stockPreview && (
        <div className="rounded-md border p-3 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
            Preview
          </p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-blue-700 dark:text-blue-300">
              {stockPreview.before}
            </span>
            <span className="text-blue-500">→</span>
            <span className="font-medium text-blue-900 dark:text-blue-100">
              {stockPreview.after}
            </span>
            <span
              className={`ml-auto font-medium ${
                stockPreview.change > 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {stockPreview.change > 0 ? "+" : ""}
              {stockPreview.change}
            </span>
          </div>
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
              isSubmitting={isSubmitting || isValidating}
              disabled={!canSubmit || isSubmitting || isValidating}
            >
              {"Apply Adjustment"}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
};
