import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type {
  LookupRefundableItem,
  LookupRefundableResult,
  RefundPaymentMethod,
  RefundWarning,
} from "@/dto/refund.dto";

// =====================
// Types
// =====================

/**
 * Scanner Refund Cart Item - represents an item being refunded
 * Can be either order-linked (has orderItemId) or manual (no order)
 */
export interface ScannerRefundCartItem {
  // Unique key for React
  id: string;

  // Product info
  productId: string;
  productName: string;
  productSku: string | null;
  productBarcode: string | null;
  productImageUrl: string | null;

  // Order info (null for manual refunds)
  orderItemId: string | null;
  orderId: string | null;
  orderNumber: string | null;
  orderDate: string | null;

  // Quantities
  originalQuantity: number; // Original order qty (or 1 for manual)
  refundedQuantity: number; // Already refunded
  refundableQuantity: number; // Max refundable
  refundQuantity: number; // User wants to refund NOW

  // Pricing
  unitPrice: number;
  lineTotal: number;

  // Flags
  isManualRefund: boolean;
  isDamaged: boolean;
}

/**
 * Refund processing status
 */
export type ScannerRefundStatus =
  | "idle"
  | "scanning"
  | "validating"
  | "awaiting-approval"
  | "processing"
  | "success"
  | "error";

// =====================
// Store State
// =====================

interface ScannerRefundStoreState {
  // Scanner Input
  scanInput: string;
  isScanning: boolean;

  // Last Lookup Result
  lastLookupResult: LookupRefundableResult | null;
  lookupError: string | null;

  // Cart Items
  cartItems: ScannerRefundCartItem[];

  // Refund Details
  reason: string;
  paymentMethod: RefundPaymentMethod;
  branchId: string | null;

  // Warnings & Approval
  warnings: RefundWarning[];
  requiresManagerOverride: boolean;
  acknowledgedWarnings: string[];
  managerOverrideReason: string;

  // Processing
  status: ScannerRefundStatus;
  processError: string | null;
}

interface ScannerRefundStoreActions {
  // Scanner Input
  setScanInput: (input: string) => void;
  setIsScanning: (scanning: boolean) => void;
  clearScanInput: () => void;

  // Lookup Result
  setLookupResult: (result: LookupRefundableResult | null) => void;
  setLookupError: (error: string | null) => void;

  // Cart Actions
  addToCart: (
    product: LookupRefundableResult["product"],
    orderItem: LookupRefundableItem | null
  ) => void;
  addManualItem: (
    product: LookupRefundableResult["product"],
    quantity: number,
    unitPrice: number
  ) => void;
  removeFromCart: (itemId: string) => void;
  setRefundQuantity: (itemId: string, quantity: number) => void;
  toggleDamaged: (itemId: string) => void;
  clearCart: () => void;

  // Refund Details
  setReason: (reason: string) => void;
  setPaymentMethod: (method: RefundPaymentMethod) => void;
  setBranchId: (branchId: string) => void;

  // Warnings & Approval
  setWarnings: (warnings: RefundWarning[]) => void;
  setRequiresManagerOverride: (required: boolean) => void;
  acknowledgeWarning: (warningCode: string) => void;
  setManagerOverrideReason: (reason: string) => void;
  clearWarnings: () => void;

  // Processing
  setStatus: (status: ScannerRefundStatus) => void;
  setProcessError: (error: string | null) => void;

  // Computed
  getRefundTotal: () => number;
  hasItems: () => boolean;
  canSubmit: () => boolean;
  hasManualItems: () => boolean;

  // Reset
  resetStore: () => void;
}

type ScannerRefundStore = ScannerRefundStoreState & ScannerRefundStoreActions;

// =====================
// Initial State
// =====================

const initialState: ScannerRefundStoreState = {
  // Scanner
  scanInput: "",
  isScanning: false,

  // Lookup
  lastLookupResult: null,
  lookupError: null,

  // Cart
  cartItems: [],

  // Details
  reason: "",
  paymentMethod: "CASH",
  branchId: null,

  // Warnings
  warnings: [],
  requiresManagerOverride: false,
  acknowledgedWarnings: [],
  managerOverrideReason: "",

  // Processing
  status: "idle",
  processError: null,
};

// =====================
// Store Implementation
// =====================

export const useScannerRefundStore = create<ScannerRefundStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Scanner Input
      setScanInput: (scanInput) => set({ scanInput }),
      setIsScanning: (isScanning) => set({ isScanning }),
      clearScanInput: () =>
        set({ scanInput: "", lastLookupResult: null, lookupError: null }),

      // Lookup Result
      setLookupResult: (lastLookupResult) =>
        set({ lastLookupResult, lookupError: null }),
      setLookupError: (lookupError) =>
        set({ lookupError, lastLookupResult: null }),

      // Cart Actions
      addToCart: (product, orderItem) => {
        if (!product) {
          console.error("Cannot add to cart: product is null");
          return;
        }

        const { cartItems } = get();

        // Check if this exact item is already in cart
        if (orderItem) {
          const exists = cartItems.find(
            (item) => item.orderItemId === orderItem.orderItemId
          );
          if (exists) {
            // Already in cart - could increment quantity instead
            return;
          }
        }

        const newItem: ScannerRefundCartItem = {
          id: orderItem
            ? `order-${orderItem.orderItemId}`
            : `manual-${product.id}-${Date.now()}`,
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          productBarcode: product.barcode,
          productImageUrl: product.imageUrl,
          orderItemId: orderItem?.orderItemId || null,
          orderId: orderItem?.orderId || null,
          orderNumber: orderItem?.orderNumber || null,
          orderDate: orderItem?.orderDate || null,
          originalQuantity: orderItem?.quantity || 1,
          refundedQuantity: orderItem?.refundedQuantity || 0,
          refundableQuantity: orderItem?.refundableQuantity || 1,
          refundQuantity: orderItem?.refundableQuantity || 1,
          unitPrice: orderItem?.unitPrice || product.price,
          lineTotal:
            (orderItem?.refundableQuantity || 1) *
            (orderItem?.unitPrice || product.price),
          isManualRefund: !orderItem,
          isDamaged: false,
        };

        set({ cartItems: [...cartItems, newItem] });
      },

      addManualItem: (product, quantity, unitPrice) => {
        if (!product) {
          console.error("Cannot add manual item: product is null");
          return;
        }

        const { cartItems } = get();

        const newItem: ScannerRefundCartItem = {
          id: `manual-${product.id}-${Date.now()}`,
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          productBarcode: product.barcode,
          productImageUrl: product.imageUrl,
          orderItemId: null,
          orderId: null,
          orderNumber: null,
          orderDate: null,
          originalQuantity: quantity,
          refundedQuantity: 0,
          refundableQuantity: quantity,
          refundQuantity: quantity,
          unitPrice,
          lineTotal: quantity * unitPrice,
          isManualRefund: true,
          isDamaged: false,
        };

        set({ cartItems: [...cartItems, newItem] });
      },

      removeFromCart: (itemId) => {
        const { cartItems } = get();
        set({ cartItems: cartItems.filter((item) => item.id !== itemId) });
      },

      setRefundQuantity: (itemId, quantity) => {
        const { cartItems } = get();
        const updatedItems = cartItems.map((item) => {
          if (item.id === itemId) {
            const validQty = Math.max(
              1,
              Math.min(quantity, item.refundableQuantity)
            );
            return {
              ...item,
              refundQuantity: validQty,
              lineTotal: validQty * item.unitPrice,
            };
          }
          return item;
        });
        set({ cartItems: updatedItems });
      },

      toggleDamaged: (itemId) => {
        const { cartItems } = get();
        const updatedItems = cartItems.map((item) => {
          if (item.id === itemId) {
            return { ...item, isDamaged: !item.isDamaged };
          }
          return item;
        });
        set({ cartItems: updatedItems });
      },

      clearCart: () =>
        set({
          cartItems: [],
          reason: "",
          warnings: [],
          acknowledgedWarnings: [],
          requiresManagerOverride: false,
          managerOverrideReason: "",
          status: "idle",
          processError: null,
        }),

      // Refund Details
      setReason: (reason) => set({ reason }),
      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      setBranchId: (branchId) => set({ branchId }),

      // Warnings & Approval
      setWarnings: (warnings) => set({ warnings }),
      setRequiresManagerOverride: (requiresManagerOverride) =>
        set({ requiresManagerOverride }),
      acknowledgeWarning: (warningCode) => {
        const { acknowledgedWarnings } = get();
        if (!acknowledgedWarnings.includes(warningCode)) {
          set({ acknowledgedWarnings: [...acknowledgedWarnings, warningCode] });
        }
      },
      setManagerOverrideReason: (managerOverrideReason) =>
        set({ managerOverrideReason }),
      clearWarnings: () =>
        set({
          warnings: [],
          acknowledgedWarnings: [],
          requiresManagerOverride: false,
          managerOverrideReason: "",
        }),

      // Processing
      setStatus: (status) => set({ status }),
      setProcessError: (processError) => set({ processError }),

      // Computed
      getRefundTotal: () => {
        const { cartItems } = get();
        return cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
      },

      hasItems: () => get().cartItems.length > 0,

      canSubmit: () => {
        const {
          cartItems,
          status,
          requiresManagerOverride,
          managerOverrideReason,
          warnings,
          acknowledgedWarnings,
        } = get();

        if (cartItems.length === 0) return false;
        if (status === "processing") return false;

        // Check if all warnings are acknowledged
        const unacknowledgedWarnings = warnings.filter(
          (w) => w.severity !== "INFO" && !acknowledgedWarnings.includes(w.code)
        );
        if (unacknowledgedWarnings.length > 0) return false;

        // Check manager override
        if (requiresManagerOverride && !managerOverrideReason) return false;

        return true;
      },

      hasManualItems: () => get().cartItems.some((item) => item.isManualRefund),

      // Reset
      resetStore: () => set(initialState),
    }),
    { name: "scanner-refund-store" }
  )
);
