import { useCreatePurchaseOrder } from "@/hooks/usePurchaseOrder";
import { useProducts } from "@/hooks/useProduct";
import { useSearchSuppliers } from "@/hooks/useSupplier";
import { useBranches } from "@/hooks/useBranch";
import { useBranchStore } from "@/store/branchStore";
import { useModalStore } from "@/store/modalStore";
import { Button, Combobox, InputField, TextareaField } from "@repo/ui";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import type { PurchaseOrderItemForm } from "@/dto/purchaseOrder.dto";

const EMPTY_ITEM: PurchaseOrderItemForm = {
  productId: "",
  quantity: 1,
  unitCost: 0,
  notes: undefined,
};

export const PurchaseOrderForm = () => {
  const closeModal = useModalStore((state) => state.closeModal);
  const { branchId: currentBranchId } = useBranchStore();
  const createMutation = useCreatePurchaseOrder();

  const [supplierSearch, setSupplierSearch] = useState("");
  const { data: supplierResults, isLoading: suppliersLoading } =
    useSearchSuppliers(supplierSearch, true);

  const { data: branches } = useBranches();
  const { data: products } = useProducts();

  const supplierOptions =
    supplierResults?.map((s) => ({
      value: s.id,
      label: s.name,
      description: s.companyName ?? undefined,
    })) ?? [];

  const branchOptions =
    branches?.map((b) => ({ value: b.id, label: b.name })) ?? [];

  const productOptions =
    products?.map((p) => ({
      value: p.id,
      label: p.name,
      description: p.sku ?? undefined,
    })) ?? [];

  const form = useForm({
    defaultValues: {
      supplierId: "",
      branchId: currentBranchId ?? "",
      orderNumber: "",
      notes: "",
      items: [{ ...EMPTY_ITEM }] as PurchaseOrderItemForm[],
    },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync({
        supplierId: value.supplierId,
        branchId: value.branchId,
        orderNumber: value.orderNumber || undefined,
        notes: value.notes || undefined,
        items: value.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          notes: item.notes || undefined,
        })),
      });
      closeModal();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      {/* Supplier */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Supplier <span className="text-destructive">*</span>
        </label>
        <form.Field
          name="supplierId"
          validators={{
            onChange: ({ value }) =>
              !value ? "Supplier is required" : undefined,
          }}
        >
          {(field) => (
            <>
              <Combobox
                options={supplierOptions}
                value={field.state.value}
                onValueChange={(val) => field.handleChange(val ?? "")}
                placeholder="Select supplier..."
                searchPlaceholder="Search suppliers..."
                isLoading={suppliersLoading}
                searchQuery={supplierSearch}
                onSearchChange={setSupplierSearch}
                shouldFilter={false}
              />
              {field.state.meta.errors.length > 0 && (
                <p className="text-sm text-destructive">
                  {field.state.meta.errors[0]}
                </p>
              )}
            </>
          )}
        </form.Field>
      </div>

      {/* Branch */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Branch <span className="text-destructive">*</span>
        </label>
        <form.Field
          name="branchId"
          validators={{
            onChange: ({ value }) =>
              !value ? "Branch is required" : undefined,
          }}
        >
          {(field) => (
            <>
              <Combobox
                options={branchOptions}
                value={field.state.value}
                onValueChange={(val) => field.handleChange(val ?? "")}
                placeholder="Select branch..."
              />
              {field.state.meta.errors.length > 0 && (
                <p className="text-sm text-destructive">
                  {field.state.meta.errors[0]}
                </p>
              )}
            </>
          )}
        </form.Field>
      </div>

      {/* Order Number */}
      <form.Field name="orderNumber">
        {(field) => (
          <InputField
            label="Order Number"
            field={field}
            placeholder="e.g. PO-2024-001 (optional)"
          />
        )}
      </form.Field>

      {/* Notes */}
      <form.Field name="notes">
        {(field) => (
          <TextareaField
            label="Notes"
            field={field}
            placeholder="Any notes for this purchase order"
          />
        )}
      </form.Field>

      {/* Items */}
      <form.Field name="items" mode="array">
        {(field) => (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Items <span className="text-destructive">*</span>
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                iconName="Plus"
                onClick={() => field.pushValue({ ...EMPTY_ITEM })}
              >
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {field.state.value.map((_, i) => (
                <div
                  key={i}
                  className="border rounded-lg p-3 space-y-3 bg-muted/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Item {i + 1}
                    </span>
                    {field.state.value.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        iconName="Trash2"
                        onClick={() => field.removeValue(i)}
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      />
                    )}
                  </div>

                  {/* Product */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium">
                      Product <span className="text-destructive">*</span>
                    </label>
                    <form.Field
                      name={`items[${i}].productId`}
                      validators={{
                        onChange: ({ value }) =>
                          !value ? "Product is required" : undefined,
                      }}
                    >
                      {(subField) => (
                        <>
                          <Combobox
                            options={productOptions}
                            value={subField.state.value}
                            onValueChange={(val) =>
                              subField.handleChange(val ?? "")
                            }
                            placeholder="Select product..."
                            searchPlaceholder="Search products..."
                          />
                          {subField.state.meta.errors.length > 0 && (
                            <p className="text-xs text-destructive">
                              {subField.state.meta.errors[0]}
                            </p>
                          )}
                        </>
                      )}
                    </form.Field>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Quantity */}
                    <form.Field
                      name={`items[${i}].quantity`}
                      validators={{
                        onChange: ({ value }) =>
                          value <= 0 ? "Must be greater than 0" : undefined,
                      }}
                    >
                      {(subField) => (
                        <div className="space-y-1">
                          <label className="text-xs font-medium">
                            Quantity <span className="text-destructive">*</span>
                          </label>
                          <input
                            type="number"
                            min="0.001"
                            step="any"
                            title="Quantity"
                            placeholder="0"
                            value={subField.state.value}
                            onChange={(e) =>
                              subField.handleChange(
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          />
                          {subField.state.meta.errors.length > 0 && (
                            <p className="text-xs text-destructive">
                              {subField.state.meta.errors[0]}
                            </p>
                          )}
                        </div>
                      )}
                    </form.Field>

                    {/* Unit Cost */}
                    <form.Field
                      name={`items[${i}].unitCost`}
                      validators={{
                        onChange: ({ value }) =>
                          value < 0 ? "Cannot be negative" : undefined,
                      }}
                    >
                      {(subField) => (
                        <div className="space-y-1">
                          <label className="text-xs font-medium">
                            Unit Cost <span className="text-destructive">*</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            title="Unit cost"
                            placeholder="0.00"
                            value={subField.state.value}
                            onChange={(e) =>
                              subField.handleChange(
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          />
                          {subField.state.meta.errors.length > 0 && (
                            <p className="text-xs text-destructive">
                              {subField.state.meta.errors[0]}
                            </p>
                          )}
                        </div>
                      )}
                    </form.Field>
                  </div>

                  {/* Computed total for this item */}
                  <form.Subscribe
                    selector={(state) => [
                      state.values.items[i]?.quantity,
                      state.values.items[i]?.unitCost,
                    ]}
                  >
                    {([qty, cost]) => {
                      const total = (qty ?? 0) * (cost ?? 0);
                      return (
                        <p className="text-xs text-muted-foreground text-right">
                          Total:{" "}
                          <span className="font-medium text-foreground">
                            ${total.toFixed(2)}
                          </span>
                        </p>
                      );
                    }}
                  </form.Subscribe>
                </div>
              ))}
            </div>
          </div>
        )}
      </form.Field>

      {/* Grand total */}
      <form.Subscribe
        selector={(state) => state.values.items}
      >
        {(items) => {
          const grandTotal = items.reduce(
            (sum, item) => sum + (item.quantity ?? 0) * (item.unitCost ?? 0),
            0
          );
          return (
            <div className="flex justify-between items-center border-t pt-3">
              <span className="font-medium">Total</span>
              <span className="text-lg font-bold">${grandTotal.toFixed(2)}</span>
            </div>
          );
        }}
      </form.Subscribe>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={closeModal}>
          Cancel
        </Button>
        <Button
          type="submit"
          isSubmitting={createMutation.isPending}
          disabled={createMutation.isPending}
        >
          Create Purchase Order
        </Button>
      </div>
    </form>
  );
};
