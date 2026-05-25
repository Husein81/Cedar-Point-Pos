import type { PurchaseOrderItemForm } from "@/dto/purchaseOrder.dto";
import { useBranches } from "@/hooks/useBranch";
import { useProducts } from "@/hooks/useProduct";
import { useCreatePurchaseOrder } from "@/hooks/usePurchaseOrder";
import { useSearchSuppliers } from "@/hooks/useSupplier";
import { useBranchStore } from "@/store/branchStore";
import { useModalStore } from "@/store/modalStore";
import {
  Button,
  Combobox,
  Icon,
  Input,
  InputField,
  Label,
  Separator,
  TextareaField,
} from "@repo/ui";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";

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
      className="space-y-6 px-2 pb-2"
    >
      {/* Section: Order details */}
      <section className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>
              Supplier <span className="text-destructive">*</span>
            </Label>
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
                    <p className="text-xs text-destructive">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </>
              )}
            </form.Field>
          </div>

          <div className="space-y-2">
            <Label>
              Branch <span className="text-destructive">*</span>
            </Label>
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
                    <p className="text-xs text-destructive">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </>
              )}
            </form.Field>
          </div>
        </div>

        <form.Field name="orderNumber">
          {(field) => (
            <InputField
              label="Order Number"
              field={field}
              placeholder="e.g. PO-2024-001 (optional)"
            />
          )}
        </form.Field>

        <form.Field name="notes">
          {(field) => (
            <TextareaField
              label="Notes"
              field={field}
              placeholder="Any notes for this purchase order"
            />
          )}
        </form.Field>
      </section>

      <Separator />

      {/* Section: Items */}
      <form.Field name="items" mode="array">
        {(field) => (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Items</h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {field.state.value.length}
                </span>
              </div>
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
                  className="group rounded-lg border bg-muted/20 p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    {field.state.value.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => field.removeValue(i)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Icon name="Trash2" className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs">
                        Product <span className="text-destructive">*</span>
                      </Label>
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

                    <div className="grid grid-cols-3 gap-3">
                      <form.Field
                        name={`items[${i}].quantity`}
                        validators={{
                          onChange: ({ value }) =>
                            value <= 0 ? "Must be > 0" : undefined,
                        }}
                      >
                        {(subField) => (
                          <div className="space-y-2">
                            <Label className="text-xs">
                              Quantity{" "}
                              <span className="text-destructive">*</span>
                            </Label>
                            <Input
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
                            />
                            {subField.state.meta.errors.length > 0 && (
                              <p className="text-xs text-destructive">
                                {subField.state.meta.errors[0]}
                              </p>
                            )}
                          </div>
                        )}
                      </form.Field>

                      <form.Field
                        name={`items[${i}].unitCost`}
                        validators={{
                          onChange: ({ value }) =>
                            value < 0 ? "Cannot be negative" : undefined,
                        }}
                      >
                        {(subField) => (
                          <div className="space-y-2">
                            <Label className="text-xs">
                              Unit Cost{" "}
                              <span className="text-destructive">*</span>
                            </Label>
                            <Input
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
                            />
                            {subField.state.meta.errors.length > 0 && (
                              <p className="text-xs text-destructive">
                                {subField.state.meta.errors[0]}
                              </p>
                            )}
                          </div>
                        )}
                      </form.Field>

                      <form.Subscribe
                        selector={(state) => [
                          state.values.items[i]?.quantity,
                          state.values.items[i]?.unitCost,
                        ]}
                      >
                        {([qty, cost]) => {
                          const total = (qty ?? 0) * (cost ?? 0);
                          return (
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">
                                Line Total
                              </Label>
                              <div className="flex h-9 items-center justify-end rounded-md border border-dashed border-input bg-background px-3 text-sm font-semibold tabular-nums">
                                ${total.toFixed(2)}
                              </div>
                            </div>
                          );
                        }}
                      </form.Subscribe>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </form.Field>

      <Separator />

      {/* Footer: Grand total + actions */}
      <form.Subscribe selector={(state) => state.values.items}>
        {(items) => {
          const grandTotal = items.reduce(
            (sum, item) => sum + (item.quantity ?? 0) * (item.unitCost ?? 0),
            0
          );
          const itemCount = items.length;
          return (
            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </span>
                <span className="text-sm font-medium">Order Total</span>
              </div>
              <span className="text-2xl font-bold tabular-nums">
                ${grandTotal.toFixed(2)}
              </span>
            </div>
          );
        }}
      </form.Subscribe>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={closeModal}>
          Cancel
        </Button>
        <Button
          type="submit"
          iconName="Check"
          isSubmitting={createMutation.isPending}
          disabled={createMutation.isPending}
        >
          Create Purchase Order
        </Button>
      </div>
    </form>
  );
};
