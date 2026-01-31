import { useEffect, useRef, useState, useCallback } from "react";
import {
  Button,
  Empty,
  Icon,
  Input,
  Separator,
  Shad,
  Textarea,
} from "@repo/ui";
import { useScannerRefundStore } from "@/store/scannerRefundStore";
import { useBranchStore } from "@/store/branchStore";
import {
  useLookupRefundable,
  useValidateRefund,
  useCreateRefund,
} from "@/hooks/useRefund";
import { ScannerCartItem } from "./ScannerCartItem";
import { WarningList } from "./WarningBanner";
import { ManagerOverrideModal } from "./ManagerOverrideModal";
import type { LookupRefundableItem } from "@/dto/refund.dto";
import { useDebounce } from "@/hooks/useDebounce";

/**
 * ScannerRefundPage - Scanner-First Refund Station
 *
 * Entry modes:
 * 1. SCAN BARCODE: Auto-focused input catches scanner input
 * 2. SCAN RECEIPT: Lookup order by receipt number (future)
 * 3. MANUAL REFUND: Search product and enter details
 *
 * Layout:
 * - Top: Large scanner input (always focused)
 * - Middle: Lookup result selector
 * - Bottom: Cart + Summary + Submit
 */
export const ScannerRefundPage = () => {
  const { branchId } = useBranchStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    scanInput,
    setScanInput,
    clearScanInput,
    lastLookupResult,
    setLookupResult,
    setLookupError,
    lookupError,
    cartItems,
    addToCart,
    addManualItem,
    removeFromCart,
    setRefundQuantity,
    toggleDamaged,
    clearCart,
    reason,
    setReason,
    paymentMethod,
    setBranchId,
    warnings,
    setWarnings,
    setRequiresManagerOverride,
    acknowledgedWarnings,
    acknowledgeWarning,
    setManagerOverrideReason,
    clearWarnings,
    status,
    setStatus,
    processError,
    setProcessError,
    getRefundTotal,
    hasItems,
    hasManualItems,
    resetStore,
  } = useScannerRefundStore();

  const [showOrderPicker, setShowOrderPicker] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);

  // Debounce the scan input for API calls
  const debouncedScanInput = useDebounce(scanInput, 300);

  // Lookup query
  const {
    data: lookupData,
    isLoading: isLookingUp,
    error: lookupQueryError,
  } = useLookupRefundable(debouncedScanInput);

  // Validate mutation
  const validateMutation = useValidateRefund();

  // Create refund mutation
  const createRefundMutation = useCreateRefund();

  // Set branch on mount
  useEffect(() => {
    if (branchId) {
      setBranchId(branchId);
    }
  }, [branchId, setBranchId]);

  // Handle lookup result
  useEffect(() => {
    if (lookupData && lookupData.found && lookupData.product) {
      setLookupResult(lookupData);
      setShowOrderPicker(lookupData.refundableItems?.length > 0 || false);
    } else if (lookupData && !lookupData.found) {
      setLookupError(lookupData.message || "Product not found");
      setShowOrderPicker(false);
    }
  }, [lookupData, setLookupResult, setLookupError]);

  // Handle lookup error
  useEffect(() => {
    if (lookupQueryError) {
      const errorMessage =
        (lookupQueryError as any)?.response?.data?.message ||
        "Product not found";
      setLookupError(errorMessage);
      setShowOrderPicker(false);
    }
  }, [lookupQueryError, setLookupError]);

  // Auto-focus input on mount and after actions
  useEffect(() => {
    inputRef.current?.focus();
  }, [cartItems.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => resetStore();
  }, [resetStore]);

  // Handle selecting an order item to refund
  const handleSelectOrderItem = useCallback(
    (orderItem: LookupRefundableItem) => {
      if (!lastLookupResult || !lastLookupResult.product) return;

      addToCart(lastLookupResult.product, orderItem);
      clearScanInput();
      setShowOrderPicker(false);
      inputRef.current?.focus();
    },
    [lastLookupResult, addToCart, clearScanInput]
  );

  // Handle adding a manual refund
  const handleAddManualRefund = useCallback(() => {
    if (!lastLookupResult || !lastLookupResult.product) return;

    addManualItem(lastLookupResult.product, 1, lastLookupResult.product.price);
    clearScanInput();
    setShowOrderPicker(false);
    inputRef.current?.focus();
  }, [lastLookupResult, addManualItem, clearScanInput]);

  // Handle validating before submit
  const handleValidateAndSubmit = async () => {
    if (!hasItems()) return;

    setStatus("validating");
    clearWarnings();

    try {
      // Build validation payload
      const hasManual = hasManualItems();
      const orderLinkedItems = cartItems.filter(
        (item) => !item.isManualRefund && item.orderItemId
      );
      const manualItems = cartItems.filter((item) => item.isManualRefund);

      // Group by orderId for order-linked items
      const orderGroups: Record<
        string,
        Array<{ orderItemId: string; quantity: number }>
      > = {};
      for (const item of orderLinkedItems) {
        if (item.orderId && item.orderItemId) {
          const orderId = item.orderId;
          if (!orderGroups[orderId]) {
            orderGroups[orderId] = [];
          }
          orderGroups[orderId]!.push({
            orderItemId: item.orderItemId,
            quantity: item.refundQuantity,
          });
        }
      }

      // For now, validate first order (multi-order refund is complex)
      const firstOrderId = Object.keys(orderGroups)[0];

      const validationResult = await validateMutation.mutateAsync({
        orderId: firstOrderId,
        items: firstOrderId ? orderGroups[firstOrderId] : undefined,
        manualRefund: hasManual,
        manualItems: manualItems.map((item) => ({
          productId: item.productId,
          quantity: item.refundQuantity,
          unitPrice: item.unitPrice,
        })),
        branchId: branchId || undefined,
      });

      setWarnings(validationResult.warnings);
      setRequiresManagerOverride(validationResult.requiresManagerOverride);

      if (validationResult.requiresManagerOverride) {
        setShowManagerModal(true);
        setStatus("awaiting-approval");
      } else if (validationResult.warnings.length === 0) {
        // No warnings - submit directly
        await submitRefund();
      } else {
        // Has warnings but no manager override needed
        setStatus("idle");
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || "Validation failed";
      setProcessError(errorMessage);
      setStatus("error");
    }
  };

  // Handle submitting the refund
  const submitRefund = async (overrideReason?: string) => {
    setStatus("processing");

    try {
      const hasManual = hasManualItems();
      const orderLinkedItems = cartItems.filter(
        (item) => !item.isManualRefund && item.orderItemId
      );
      const manualItems = cartItems.filter((item) => item.isManualRefund);

      // Group by orderId
      const orderGroups: Record<
        string,
        Array<{ orderItemId: string; quantity: number }>
      > = {};
      for (const item of orderLinkedItems) {
        if (item.orderId && item.orderItemId) {
          const orderId = item.orderId;
          if (!orderGroups[orderId]) {
            orderGroups[orderId] = [];
          }
          orderGroups[orderId]!.push({
            orderItemId: item.orderItemId,
            quantity: item.refundQuantity,
          });
        }
      }

      const firstOrderId = Object.keys(orderGroups)[0];
      const hasDamagedItems = cartItems.some((item) => item.isDamaged);

      await createRefundMutation.mutateAsync({
        orderId: firstOrderId,
        items: firstOrderId ? orderGroups[firstOrderId] : undefined,
        manualRefund: hasManual || !firstOrderId,
        manualItems: manualItems.map((item) => ({
          productId: item.productId,
          quantity: item.refundQuantity,
          unitPrice: item.unitPrice,
        })),
        branchId: branchId || undefined,
        reason: reason || undefined,
        paymentMethod,
        isDamaged: hasDamagedItems,
        restockInventory: !hasDamagedItems,
        managerOverride: !!overrideReason,
        managerOverrideReason: overrideReason,
        acknowledgedWarnings: acknowledgedWarnings,
      });

      setStatus("success");
      setShowManagerModal(false);

      // Clear cart after short delay to show success
      setTimeout(() => {
        clearCart();
        inputRef.current?.focus();
      }, 1500);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || "Refund failed";
      setProcessError(errorMessage);
      setStatus("error");
      setShowManagerModal(false);
    }
  };

  // Handle manager override approval
  const handleManagerApprove = async (overrideReason: string) => {
    setManagerOverrideReason(overrideReason);
    await submitRefund(overrideReason);
  };

  const refundTotal = getRefundTotal();

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-destructive/10 grid place-items-center">
              <Icon name="RotateCcw" className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Scan to Refund</h1>
              <p className="text-xs text-muted-foreground">
                Scan barcode or search by SKU
              </p>
            </div>
          </div>

          {hasItems() && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCart}
              className="text-muted-foreground"
            >
              <Icon name="Trash2" className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Scanner Input */}
      <div className="px-4 py-4 border-b bg-background">
        <div className="relative">
          <Icon
            name="Search"
            className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
          />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Scan barcode or enter SKU..."
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            className="h-14 pl-12 pr-12 text-lg font-mono"
            autoFocus
          />
          {scanInput && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearScanInput}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <Icon name="X" className="h-4 w-4" />
            </Button>
          )}
          {isLookingUp && (
            <div className="absolute right-12 top-1/2 -translate-y-1/2">
              <Icon
                name="Loader2"
                className="h-5 w-5 animate-spin text-muted-foreground"
              />
            </div>
          )}
        </div>

        {/* Lookup Error */}
        {lookupError && (
          <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
            <Icon name="AlertCircle" className="h-4 w-4 shrink-0" />
            <span>{lookupError}</span>
          </div>
        )}

        {/* Order Picker Dropdown */}
        {showOrderPicker && lastLookupResult && lastLookupResult.product && (
          <div className="mt-3 rounded-lg border bg-background shadow-lg overflow-hidden">
            <div className="p-3 bg-muted/50 border-b flex items-center gap-3">
              {lastLookupResult.product.imageUrl ? (
                <img
                  src={lastLookupResult.product.imageUrl}
                  alt=""
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-muted grid place-items-center">
                  <Icon
                    name="Package"
                    className="h-5 w-5 text-muted-foreground"
                  />
                </div>
              )}
              <div className="flex-1">
                <p className="font-semibold">{lastLookupResult.product.name}</p>
                <p className="text-xs text-muted-foreground">
                  {lastLookupResult.product.sku ||
                    lastLookupResult.product.barcode}
                </p>
              </div>
              <p className="text-sm font-medium">
                ${lastLookupResult.product.price.toFixed(2)}
              </p>
            </div>

            {lastLookupResult.refundableItems &&
              lastLookupResult.refundableItems.length > 0 && (
                <div className="max-h-48 overflow-y-auto">
                  <p className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/30">
                    Recent Orders (click to add)
                  </p>
                  {lastLookupResult.refundableItems.map((item) => (
                    <button
                      key={item.orderItemId}
                      onClick={() => handleSelectOrderItem(item)}
                      className="w-full px-3 py-2 text-left hover:bg-muted/50 flex items-center justify-between transition"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {item.orderNumber ||
                            `Order ${item.orderId.slice(-6)}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.orderDate
                            ? new Date(item.orderDate).toLocaleDateString()
                            : "N/A"}{" "}
                          • Qty: {item.refundableQuantity} refundable
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          $
                          {(item.unitPrice * item.refundableQuantity).toFixed(
                            2
                          )}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

            {lastLookupResult.canManualRefund && (
              <div className="p-2 border-t bg-orange-50/50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddManualRefund}
                  className="w-full text-orange-700 border-orange-300 hover:bg-orange-100"
                >
                  <Icon name="AlertCircle" className="h-4 w-4 mr-2" />
                  Manual Refund (No Receipt)
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cart */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Shad.ScrollArea className="h-full">
          <div className="p-4 space-y-3">
            {cartItems.length === 0 ? (
              <Empty
                title="No items to refund"
                description="Scan a barcode to look up refundable items."
                icon="ScanLine"
              />
            ) : (
              <>
                {cartItems.map((item) => (
                  <ScannerCartItem
                    key={item.id}
                    item={item}
                    onQuantityChange={(qty) => setRefundQuantity(item.id, qty)}
                    onToggleDamaged={() => toggleDamaged(item.id)}
                    onRemove={() => removeFromCart(item.id)}
                  />
                ))}

                {/* Warnings */}
                {warnings.length > 0 && (
                  <div className="pt-2">
                    <WarningList
                      warnings={warnings}
                      acknowledgedWarnings={acknowledgedWarnings}
                      onAcknowledge={acknowledgeWarning}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </Shad.ScrollArea>
      </div>

      <Separator />

      {/* Bottom Summary */}
      <div className="shrink-0 border-t bg-background px-4 py-4 space-y-3">
        {/* Reason */}
        <div className="grid gap-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Refund Reason
          </label>
          <Textarea
            placeholder="Why is this being refunded? (recommended)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="h-14 resize-none text-sm"
          />
        </div>

        {/* Totals */}
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Refund Amount</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {cartItems.length} item{cartItems.length !== 1 ? "s" : ""}
              </p>
            </div>
            <p className="text-3xl font-bold text-destructive tabular-nums">
              ${refundTotal.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Error */}
        {processError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <div className="flex gap-2">
              <Icon name="AlertCircle" className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="font-medium">{processError}</span>
            </div>
          </div>
        )}

        {/* Success */}
        {status === "success" && (
          <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800">
            <div className="flex gap-2 items-center">
              <Icon name="CircleCheck" className="w-5 h-5 shrink-0" />
              <span className="font-medium">
                Refund processed successfully!
              </span>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button
          size="lg"
          variant="destructive"
          className="w-full h-12 text-base font-semibold"
          disabled={
            !hasItems() || status === "processing" || status === "validating"
          }
          onClick={handleValidateAndSubmit}
        >
          {status === "validating" ? (
            <>
              <Icon name="Loader2" className="w-5 h-5 mr-2 animate-spin" />
              Validating...
            </>
          ) : status === "processing" ? (
            <>
              <Icon name="Loader2" className="w-5 h-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Icon name="RotateCcw" className="w-5 h-5 mr-2" />
              Process Refund
            </>
          )}
        </Button>
      </div>

      {/* Manager Override Modal */}
      <ManagerOverrideModal
        isOpen={showManagerModal}
        onClose={() => {
          setShowManagerModal(false);
          setStatus("idle");
        }}
        onApprove={handleManagerApprove}
        warnings={warnings}
        refundTotal={refundTotal}
        isProcessing={status === "processing"}
      />
    </div>
  );
};
