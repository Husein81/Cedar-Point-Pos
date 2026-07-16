import { create } from "zustand";
import { devtools } from "zustand/middleware";

// Client/UI state only. Refundable orders, order details, and refund history
// are server state and live in TanStack Query (hooks/useRefund.ts) — never
// mirror them here.

interface RefundStoreState {
  // Order-browsing filters
  searchQuery: string;
  dateFrom: string | null;
  dateTo: string | null;
  page: number;

  // Selection + refund draft
  selectedOrderId: string | null;
  /** orderItemId -> quantity the cashier wants to refund now */
  quantities: Record<string, number>;
  /** Selected reason code from REFUND_REASONS ("" = none) */
  reason: string;
  /** Free-text detail appended to the reason */
  note: string;
}

interface RefundStoreActions {
  setSearchQuery: (query: string) => void;
  setDateRange: (from: string | null, to: string | null) => void;
  setPage: (page: number) => void;
  clearFilters: () => void;

  selectOrder: (orderId: string | null) => void;
  setQuantity: (orderItemId: string, quantity: number) => void;
  setQuantities: (quantities: Record<string, number>) => void;
  setReason: (reason: string) => void;
  setNote: (note: string) => void;
  resetDraft: () => void;

  resetStore: () => void;
}

type RefundStore = RefundStoreState & RefundStoreActions;

const initialState: RefundStoreState = {
  searchQuery: "",
  dateFrom: null,
  dateTo: null,
  page: 1,

  selectedOrderId: null,
  quantities: {},
  reason: "",
  note: "",
};

const emptyDraft = { quantities: {}, reason: "", note: "" };

export const useRefundStore = create<RefundStore>()(
  devtools(
    (set) => ({
      ...initialState,

      setSearchQuery: (searchQuery) => set({ searchQuery, page: 1 }),
      setDateRange: (dateFrom, dateTo) => set({ dateFrom, dateTo, page: 1 }),
      setPage: (page) => set({ page }),
      clearFilters: () =>
        set({ searchQuery: "", dateFrom: null, dateTo: null, page: 1 }),

      selectOrder: (selectedOrderId) =>
        set({ selectedOrderId, ...emptyDraft }),

      setQuantity: (orderItemId, quantity) =>
        set((state) => ({
          quantities: { ...state.quantities, [orderItemId]: quantity },
        })),
      setQuantities: (quantities) => set({ quantities }),
      setReason: (reason) => set({ reason }),
      setNote: (note) => set({ note }),
      resetDraft: () => set(emptyDraft),

      resetStore: () => set(initialState),
    }),
    { name: "refund-store" },
  ),
);
