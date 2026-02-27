import { PurchaseOrderItemType } from "@repo/types";
import { useForm } from "@tanstack/react-form";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCreatePurchaseOrder } from "@/hooks/usePurchaseOrder";
import { useProducts } from "@/hooks/useProduct";
import { useBranchStore } from "@/store/branchStore";
import { useModalStore } from "@/store/modalStore";
import { Button, Icon, InputField, Shad, TextareaField } from "@repo/ui";
import { SupplierSelector } from "./SupplierSelector";

type ProductDraftItem = {
  rowId: string;
  itemType: "PRODUCT";
  productId: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  notes?: string;
};

type CustomDraftItem = {
  rowId: string;
  itemType: "CUSTOM";
  itemName: string;
  quantity: number;
  unitCost: number;
  notes?: string;
};

type DraftItem = ProductDraftItem | CustomDraftItem;
type DraftItemPatch = Partial<
  Pick<DraftItem, "itemName" | "quantity" | "unitCost" | "notes">
>;

const createRowId = () =>
  `poi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const CreatePurchaseOrderForm = () => {
  const { closeModal } = useModalStore();
  const createPurchaseOrder = useCreatePurchaseOrder();
  const { branchId } = useBranchStore();

  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [itemMode, setItemMode] = useState<"PRODUCT" | "CUSTOM">(
    PurchaseOrderItemType.PRODUCT,
  );

  const { data: allProducts } = useProducts();

  const [productSearch, setProductSearch] = useState("");
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [stagingProductId, setStagingProductId] = useState("");
  const [stagingProductName, setStagingProductName] = useState("");
  const [stagingProductQty, setStagingProductQty] = useState(1);
  const [stagingProductUnitCost, setStagingProductUnitCost] = useState(0);
  const [stagingProductNotes, setStagingProductNotes] = useState("");

  const [stagingCustomName, setStagingCustomName] = useState("");
  const [stagingCustomQty, setStagingCustomQty] = useState(1);
  const [stagingCustomUnitCost, setStagingCustomUnitCost] = useState(0);
  const [stagingCustomNotes, setStagingCustomNotes] = useState("");

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return [];
    return (allProducts ?? []).filter((product) =>
      product.name.toLowerCase().includes(query),
    );
  }, [allProducts, productSearch]);

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0),
    [items],
  );

  const canSubmit = Boolean(branchId && supplierId && items.length > 0);

  const form = useForm({
    defaultValues: {
      orderNumber: "",
      notes: "",
    },
    onSubmit: async ({ value }) => {
      if (!branchId || !supplierId || items.length === 0) return;
      try {
        await createPurchaseOrder.mutateAsync({
          supplierId,
          branchId,
          orderNumber: value.orderNumber.trim() || undefined,
          notes: value.notes.trim() || undefined,
          items: items.map((item) => {
            if (item.itemType === PurchaseOrderItemType.PRODUCT) {
              return {
                itemType: PurchaseOrderItemType.PRODUCT,
                productId: item.productId,
                itemName: item.itemName.trim() || undefined,
                quantity: item.quantity,
                unitCost: item.unitCost,
                notes: item.notes?.trim() || undefined,
              };
            }

            return {
              itemType: PurchaseOrderItemType.CUSTOM,
              itemName: item.itemName.trim(),
              quantity: item.quantity,
              unitCost: item.unitCost,
              notes: item.notes?.trim() || undefined,
            };
          }),
        });

        closeModal();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to create purchase order";
        toast.error(message);
      }
    },
  });

  const handleSelectProduct = (
    id: string,
    name: string,
    defaultUnitCost: number,
  ) => {
    setStagingProductId(id);
    setStagingProductName(name);
    setStagingProductUnitCost(defaultUnitCost);
    setProductSearch(name);
    setProductPickerOpen(false);
  };

  const addProductItem = () => {
    if (!stagingProductId || stagingProductQty <= 0) return;

    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.itemType === PurchaseOrderItemType.PRODUCT &&
          item.productId === stagingProductId,
      );

      if (existingIndex >= 0) {
        const next = [...prev];
        const existing = next[existingIndex];
        if (!existing || existing.itemType !== PurchaseOrderItemType.PRODUCT) {
          return prev;
        }

        next[existingIndex] = {
          ...existing,
          quantity: existing.quantity + stagingProductQty,
          unitCost: stagingProductUnitCost,
          notes: stagingProductNotes || existing.notes,
        };
        return next;
      }

      return [
        ...prev,
        {
          rowId: createRowId(),
          itemType: PurchaseOrderItemType.PRODUCT,
          productId: stagingProductId,
          itemName: stagingProductName,
          quantity: stagingProductQty,
          unitCost: stagingProductUnitCost,
          notes: stagingProductNotes || undefined,
        },
      ];
    });

    setStagingProductId("");
    setStagingProductName("");
    setProductSearch("");
    setStagingProductQty(1);
    setStagingProductUnitCost(0);
    setStagingProductNotes("");
  };

  const addCustomItem = () => {
    if (!stagingCustomName.trim() || stagingCustomQty <= 0) return;

    setItems((prev) => [
      ...prev,
      {
        rowId: createRowId(),
        itemType: PurchaseOrderItemType.CUSTOM,
        itemName: stagingCustomName.trim(),
        quantity: stagingCustomQty,
        unitCost: stagingCustomUnitCost,
        notes: stagingCustomNotes || undefined,
      },
    ]);

    setStagingCustomName("");
    setStagingCustomQty(1);
    setStagingCustomUnitCost(0);
    setStagingCustomNotes("");
  };

  const updateItem = (rowId: string, patch: DraftItemPatch) => {
    setItems((prev) =>
      prev.map((item) => (item.rowId === rowId ? { ...item, ...patch } : item)),
    );
  };

  const removeItem = (rowId: string) => {
    setItems((prev) => prev.filter((item) => item.rowId !== rowId));
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-5"
    >
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Supplier <span className="text-destructive">*</span>
        </label>
        <SupplierSelector
          value={supplierId || null}
          onValueChange={setSupplierId}
          className="w-full"
        />
      </div>

      <form.Field name="orderNumber">
        {(field) => (
          <InputField
            label="Order Number (optional)"
            field={field}
            placeholder="Auto-generated if left blank"
          />
        )}
      </form.Field>

      <form.Field name="notes">
        {(field) => (
          <TextareaField
            label="Notes (optional)"
            field={field}
            placeholder="Delivery notes, payment terms, etc."
            className="h-16 resize-none text-sm"
          />
        )}
      </form.Field>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">
            Items <span className="text-destructive">*</span>
          </label>
          <span className="text-xs text-muted-foreground">
            {items.length} item{items.length === 1 ? "" : "s"}
          </span>
        </div>

        {items.length > 0 && (
          <div className="divide-y rounded-md border text-sm">
            {items.map((item) => (
              <div key={item.rowId} className="space-y-2 px-3 py-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium">
                        {item.itemType}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={item.itemName}
                      onChange={(event) =>
                        updateItem(item.rowId, { itemName: event.target.value })
                      }
                      className="w-full rounded border border-input bg-background px-2 py-1 text-sm"
                      aria-label="Item name"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.rowId)}
                    className="mt-1 text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Icon name="Trash2" className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(item.rowId, {
                        quantity: Math.max(1, Number(event.target.value || 1)),
                      })
                    }
                    className="w-20 rounded border border-input bg-background px-2 py-1 text-center text-xs"
                    aria-label="Quantity"
                  />
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.unitCost}
                    onChange={(event) =>
                      updateItem(item.rowId, {
                        unitCost: Math.max(0, Number(event.target.value || 0)),
                      })
                    }
                    className="w-28 rounded border border-input bg-background px-2 py-1 text-right text-xs"
                    aria-label="Unit cost"
                  />
                  <input
                    type="text"
                    value={item.notes ?? ""}
                    onChange={(event) =>
                      updateItem(item.rowId, { notes: event.target.value })
                    }
                    placeholder="Notes"
                    className="min-w-0 flex-1 rounded border border-input bg-background px-2 py-1 text-xs"
                    aria-label="Item notes"
                  />
                  <div className="w-24 text-right text-xs font-medium leading-7">
                    ${(item.quantity * item.unitCost).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
            <div className="flex justify-between bg-muted/40 px-3 py-2 text-sm font-semibold">
              <span>Total</span>
              <span>${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="space-y-3 rounded-md border bg-muted/20 p-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={
                itemMode === PurchaseOrderItemType.PRODUCT
                  ? "default"
                  : "outline"
              }
              onClick={() => setItemMode(PurchaseOrderItemType.PRODUCT)}
            >
              Product Item
            </Button>
            <Button
              type="button"
              size="sm"
              variant={
                itemMode === PurchaseOrderItemType.CUSTOM ? "default" : "outline"
              }
              onClick={() => setItemMode(PurchaseOrderItemType.CUSTOM)}
            >
              Custom Item
            </Button>
          </div>

          {itemMode === PurchaseOrderItemType.PRODUCT ? (
            <div className="space-y-2">
              <div className="relative">
                <div className="flex items-center gap-1 rounded-md border bg-background px-2 py-1.5">
                  <Icon
                    name="Search"
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                  />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(event) => {
                      const value = event.target.value;
                      setProductSearch(value);
                      setProductPickerOpen(true);
                      if (value !== stagingProductName) {
                        setStagingProductId("");
                        setStagingProductName("");
                      }
                    }}
                    onFocus={() => setProductPickerOpen(true)}
                    onBlur={() => setTimeout(() => setProductPickerOpen(false), 120)}
                    className="flex-1 bg-transparent text-sm outline-none"
                  />
                  {stagingProductId && (
                    <Icon name="Check" className="h-3.5 w-3.5 text-green-500" />
                  )}
                </div>

                {productPickerOpen && productSearch.trim().length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-40 overflow-y-auto rounded-md border bg-popover shadow-md">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onMouseDown={() =>
                            handleSelectProduct(
                              product.id,
                              product.name,
                              Number(product.cost ?? 0),
                            )
                          }
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                        >
                          <span>{product.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ${Number(product.cost ?? 0).toFixed(2)}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        No products found
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  value={stagingProductQty}
                  onChange={(event) =>
                    setStagingProductQty(
                      Math.max(1, Number(event.target.value || 1)),
                    )
                  }
                  className="w-20 rounded border border-input bg-background px-2 py-1.5 text-center text-sm"
                  aria-label="Product quantity"
                />
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={stagingProductUnitCost}
                  onChange={(event) =>
                    setStagingProductUnitCost(
                      Math.max(0, Number(event.target.value || 0)),
                    )
                  }
                  className="w-28 rounded border border-input bg-background px-2 py-1.5 text-right text-sm"
                  aria-label="Product unit cost"
                />
                <input
                  type="text"
                  value={stagingProductNotes}
                  onChange={(event) => setStagingProductNotes(event.target.value)}
                  placeholder="Notes"
                  className="min-w-0 flex-1 rounded border border-input bg-background px-2 py-1.5 text-sm"
                  aria-label="Product notes"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addProductItem}
                  disabled={!stagingProductId}
                >
                  <Icon name="Plus" className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={stagingCustomName}
                onChange={(event) => setStagingCustomName(event.target.value)}
                placeholder="Custom item name"
                className="min-w-0 flex-[2] rounded border border-input bg-background px-2 py-1.5 text-sm"
                aria-label="Custom item name"
              />
              <input
                type="number"
                min={1}
                value={stagingCustomQty}
                onChange={(event) =>
                  setStagingCustomQty(Math.max(1, Number(event.target.value || 1)))
                }
                className="w-20 rounded border border-input bg-background px-2 py-1.5 text-center text-sm"
                aria-label="Custom quantity"
              />
              <input
                type="number"
                min={0}
                step={0.01}
                value={stagingCustomUnitCost}
                onChange={(event) =>
                  setStagingCustomUnitCost(
                    Math.max(0, Number(event.target.value || 0)),
                  )
                }
                className="w-28 rounded border border-input bg-background px-2 py-1.5 text-right text-sm"
                aria-label="Custom unit cost"
              />
              <input
                type="text"
                value={stagingCustomNotes}
                onChange={(event) => setStagingCustomNotes(event.target.value)}
                placeholder="Notes"
                className="min-w-0 flex-1 rounded border border-input bg-background px-2 py-1.5 text-sm"
                aria-label="Custom notes"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addCustomItem}
                disabled={!stagingCustomName.trim()}
              >
                <Icon name="Plus" className="h-4 w-4" />
                Add
              </Button>
            </div>
          )}
        </div>
      </div>

      <Shad.DialogFooter className="flex items-center gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={closeModal}
          disabled={createPurchaseOrder.isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isSubmitting={createPurchaseOrder.isPending}
          disabled={createPurchaseOrder.isPending || !canSubmit}
        >
          <Icon name="ClipboardList" className="h-4 w-4" />
          Create Purchase Order
        </Button>
      </Shad.DialogFooter>
    </form>
  );
};
