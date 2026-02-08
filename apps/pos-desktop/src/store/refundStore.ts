import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { RefundableInfo, RefundableItem } from "@/dto/refund.dto";
import type { OrderStatus, PaymentMethod } from "@repo/types";

// =====================
// Types
// =====================

/**
 * Refund Cart Item - represents an item being refunded
 * Separate from sales cart to prevent cross-contamination
 */
export interface RefundCartItem {
  orderItemId: string;
  productId: string;
  productName: string;
  productSku: string | null;
  productImageUrl: string | null;
  originalQuantity: number;
  refundedQuantity: number; // Already refunded in previous refunds
  refundableQuantity: number; // Max that CAN be refunded
  refundQuantity: number; // Amount user wants to refund NOW
  unitPrice: number;
  lineTotal: number; // refundQuantity * unitPrice
  isSelected: boolean; // For partial refund selection
}

/**
 * Order summary for the orders list
 */
export interface RefundOrderSummary {
  id: string;
  orderNumber: string | null;
  createdAt: string;
  completedAt: string | null;
  total: number;
  status: OrderStatus;
  paymentMethod: string | null;
  customerName: string | null;
  itemCount: number;
}

/**
 * Refund history for an order
 */
export interface RefundHistoryItem {
  id: string;
  refundedAt: string;
  totalAmount: number;
  reason: string | null;
  isPartialRefund?: boolean;
  itemCount: number;
}

/**
 * Refund status for tracking
 */
export type RefundProcessStatus =
  | "idle"
  | "loading"
  | "processing"
  | "success"
  | "error";

// =====================
// Store State
// =====================

interface RefundStoreState {
  // Orders List State
  orders: RefundOrderSummary[];
  ordersLoading: boolean;
  ordersError: string | null;
  ordersTotalCount: number;
  ordersCurrentPage: number;
  ordersPageSize: number;

  // Search & Filter
  searchQuery: string;
  filterDateFrom: string | null;
  filterDateTo: string | null;
  filterStatus: OrderStatus | null;

  // Selected Order State
  selectedOrderId: string | null;
  selectedOrderDetails: RefundableInfo | null;
  selectedOrderLoading: boolean;
  selectedOrderError: string | null;

  // Refund Cart State (isolated from sales)
  refundCartItems: RefundCartItem[];
  refundReason: string;
  refundPaymentMethod: PaymentMethod;

  // Refund History for Selected Order
  refundHistory: RefundHistoryItem[];
  refundHistoryLoading: boolean;

  // Processing State
  processStatus: RefundProcessStatus;
  processError: string | null;

  // Lock to prevent concurrent refunds
  isRefundLocked: boolean;
}

interface RefundStoreActions {
  // Orders List Actions
  setOrders: (orders: RefundOrderSummary[], totalCount: number) => void;
  setOrdersLoading: (loading: boolean) => void;
  setOrdersError: (error: string | null) => void;
  setOrdersPage: (page: number) => void;

  // Search & Filter Actions
  setSearchQuery: (query: string) => void;
  setFilterDateFrom: (date: string | null) => void;
  setFilterDateTo: (date: string | null) => void;
  setFilterStatus: (status: OrderStatus | null) => void;
  clearFilters: () => void;

  // Order Selection Actions
  selectOrder: (orderId: string | null) => void;
  setSelectedOrderDetails: (details: RefundableInfo | null) => void;
  setSelectedOrderLoading: (loading: boolean) => void;
  setSelectedOrderError: (error: string | null) => void;

  // Refund Cart Actions
  initializeRefundCart: (items: RefundableItem[]) => void;
  setRefundQuantity: (orderItemId: string, quantity: number) => void;
  toggleItemSelection: (orderItemId: string) => void;
  selectAllItems: () => void;
  deselectAllItems: () => void;
  setRefundReason: (reason: string) => void;
  setRefundPaymentMethod: (method: PaymentMethod) => void;
  clearRefundCart: () => void;

  // Quick Actions
  selectFullRefund: () => void;

  // Refund History Actions
  setRefundHistory: (history: RefundHistoryItem[]) => void;
  setRefundHistoryLoading: (loading: boolean) => void;

  // Processing Actions
  setProcessStatus: (status: RefundProcessStatus) => void;
  setProcessError: (error: string | null) => void;
  setRefundLocked: (locked: boolean) => void;

  // Computed Getters
  getSelectedItems: () => RefundCartItem[];
  getRefundTotal: () => number;
  canProcessRefund: () => boolean;
  hasRefundableItems: () => boolean;
  isFullRefund: () => boolean;

  // Reset
  resetStore: () => void;
}

type RefundStore = RefundStoreState & RefundStoreActions;

// =====================
// Initial State
// =====================

const initialState: RefundStoreState = {
  // Orders List
  orders: [],
  ordersLoading: false,
  ordersError: null,
  ordersTotalCount: 0,
  ordersCurrentPage: 1,
  ordersPageSize: 12,

  // Search & Filter
  searchQuery: "",
  filterDateFrom: null,
  filterDateTo: null,
  filterStatus: null,

  // Selected Order
  selectedOrderId: null,
  selectedOrderDetails: null,
  selectedOrderLoading: false,
  selectedOrderError: null,

  // Refund Cart
  refundCartItems: [],
  refundReason: "",
  refundPaymentMethod: "CASH",

  // Refund History
  refundHistory: [],
  refundHistoryLoading: false,

  // Processing
  processStatus: "idle",
  processError: null,
  isRefundLocked: false,
};

// =====================
// Store Implementation
// =====================

export const useRefundStore = create<RefundStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Orders List Actions
      setOrders: (orders, totalCount) =>
        set({ orders, ordersTotalCount: totalCount }),
      setOrdersLoading: (ordersLoading) => set({ ordersLoading }),
      setOrdersError: (ordersError) => set({ ordersError }),
      setOrdersPage: (ordersCurrentPage) => set({ ordersCurrentPage }),

      // Search & Filter Actions
      setSearchQuery: (searchQuery) =>
        set({ searchQuery, ordersCurrentPage: 1 }),
      setFilterDateFrom: (filterDateFrom) =>
        set({ filterDateFrom, ordersCurrentPage: 1 }),
      setFilterDateTo: (filterDateTo) =>
        set({ filterDateTo, ordersCurrentPage: 1 }),
      setFilterStatus: (filterStatus) =>
        set({ filterStatus, ordersCurrentPage: 1 }),
      clearFilters: () =>
        set({
          searchQuery: "",
          filterDateFrom: null,
          filterDateTo: null,
          filterStatus: null,
          ordersCurrentPage: 1,
        }),

      // Order Selection Actions
      selectOrder: (orderId) =>
        set({
          selectedOrderId: orderId,
          selectedOrderDetails: null,
          selectedOrderError: null,
          refundCartItems: [],
          refundReason: "",
          refundHistory: [],
          processStatus: "idle",
          processError: null,
        }),

      setSelectedOrderDetails: (details) =>
        set({ selectedOrderDetails: details }),
      setSelectedOrderLoading: (selectedOrderLoading) =>
        set({ selectedOrderLoading }),
      setSelectedOrderError: (selectedOrderError) =>
        set({ selectedOrderError }),

      // Refund Cart Actions
      initializeRefundCart: (items) => {
        const cartItems: RefundCartItem[] = items.map((item) => ({
          orderItemId: item.orderItemId,
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          productImageUrl: item.productImageUrl,
          originalQuantity: item.quantity,
          refundedQuantity: item.refundedQuantity,
          refundableQuantity: item.refundableQuantity,
          refundQuantity: 0, // Start with 0 - user must select
          unitPrice: item.unitPrice,
          lineTotal: 0,
          isSelected: false,
        }));
        set({ refundCartItems: cartItems });
      },

      setRefundQuantity: (orderItemId, quantity) => {
        const { refundCartItems } = get();
        const updatedItems = refundCartItems.map((item) => {
          if (item.orderItemId === orderItemId) {
            // Clamp quantity to valid range
            const validQty = Math.max(
              0,
              Math.min(quantity, item.refundableQuantity),
            );
            return {
              ...item,
              refundQuantity: validQty,
              lineTotal: validQty * item.unitPrice,
              isSelected: validQty > 0,
            };
          }
          return item;
        });
        set({ refundCartItems: updatedItems });
      },

      toggleItemSelection: (orderItemId) => {
        const { refundCartItems } = get();
        const updatedItems = refundCartItems.map((item) => {
          if (item.orderItemId === orderItemId) {
            const newSelected = !item.isSelected;
            const newQty = newSelected ? item.refundableQuantity : 0;
            return {
              ...item,
              isSelected: newSelected,
              refundQuantity: newQty,
              lineTotal: newQty * item.unitPrice,
            };
          }
          return item;
        });
        set({ refundCartItems: updatedItems });
      },

      selectAllItems: () => {
        const { refundCartItems } = get();
        const updatedItems = refundCartItems.map((item) => {
          if (item.refundableQuantity > 0) {
            return {
              ...item,
              isSelected: true,
              refundQuantity: item.refundableQuantity,
              lineTotal: item.refundableQuantity * item.unitPrice,
            };
          }
          return item;
        });
        set({ refundCartItems: updatedItems });
      },

      deselectAllItems: () => {
        const { refundCartItems } = get();
        const updatedItems = refundCartItems.map((item) => ({
          ...item,
          isSelected: false,
          refundQuantity: 0,
          lineTotal: 0,
        }));
        set({ refundCartItems: updatedItems });
      },

      setRefundReason: (refundReason) => set({ refundReason }),
      setRefundPaymentMethod: (refundPaymentMethod) =>
        set({ refundPaymentMethod }),

      clearRefundCart: () =>
        set({
          refundCartItems: [],
          refundReason: "",
          processStatus: "idle",
          processError: null,
        }),

      // Quick Actions
      selectFullRefund: () => {
        get().selectAllItems();
      },

      // Refund History Actions
      setRefundHistory: (refundHistory) => set({ refundHistory }),
      setRefundHistoryLoading: (refundHistoryLoading) =>
        set({ refundHistoryLoading }),

      // Processing Actions
      setProcessStatus: (processStatus) => set({ processStatus }),
      setProcessError: (processError) => set({ processError }),
      setRefundLocked: (isRefundLocked) => set({ isRefundLocked }),

      // Computed Getters
      getSelectedItems: () => {
        const { refundCartItems } = get();
        return refundCartItems.filter(
          (item) => item.isSelected && item.refundQuantity > 0,
        );
      },

      getRefundTotal: () => {
        const { refundCartItems } = get();
        return refundCartItems.reduce((sum, item) => sum + item.lineTotal, 0);
      },

      canProcessRefund: () => {
        const { refundCartItems, isRefundLocked, processStatus } = get();
        const hasSelectedItems = refundCartItems.some(
          (item) => item.isSelected && item.refundQuantity > 0,
        );
        return (
          hasSelectedItems && !isRefundLocked && processStatus !== "processing"
        );
      },

      hasRefundableItems: () => {
        const { refundCartItems } = get();
        return refundCartItems.some((item) => item.refundableQuantity > 0);
      },

      isFullRefund: () => {
        const { refundCartItems } = get();
        return refundCartItems.every(
          (item) =>
            item.refundableQuantity === 0 ||
            item.refundQuantity === item.refundableQuantity,
        );
      },

      // Reset
      resetStore: () => set(initialState),
    }),
    { name: "refund-store" },
  ),
);
