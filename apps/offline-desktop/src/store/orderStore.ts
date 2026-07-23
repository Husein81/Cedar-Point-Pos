// Multi-tab draft order state — the client/UI-state counterpart to pos-desktop's
// orderStore. Each tab is an independent in-progress sale; nothing here is
// persisted server-side until checkout (draft orders are pure client state,
// mirroring pos-desktop's local-only draft tabs).

import { create } from "zustand";
import type { Product } from "@/shared/models";
import { DiscountType } from "@/shared/enums";
import { computeOrderTotals } from "@/shared/financial";

export type DraftItem = {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imagePath?: string | null;
  discount?: { value: number; type: DiscountType };
  notes?: string;
};

export type DraftOrder = {
  items: DraftItem[];
  customerId: string | null;
  customerName: string | null;
  discount: { value: number; type: DiscountType } | null;
};

export type OrderTab = {
  id: string;
  label: string;
  order: DraftOrder;
};

type State = {
  tabs: OrderTab[];
  activeTabId: string;
  maxTabs: number;
};

const MAX_TABS = 10;

const newItemId = () => crypto.randomUUID();
const newTabId = () => crypto.randomUUID();

const createEmptyOrder = (): DraftOrder => ({
  items: [],
  customerId: null,
  customerName: null,
  discount: null,
});

const createNewTab = (index: number): OrderTab => ({
  id: newTabId(),
  label: `Order ${index}`,
  order: createEmptyOrder(),
});

const renumberTabs = (tabs: OrderTab[]): OrderTab[] =>
  tabs.map((tab, index) => ({
    ...tab,
    // Only relabel tabs still on their default "Order N" name — a tab the
    // user hasn't customized shifts to stay sequential after a close.
    label: /^Order \d+$/.test(tab.label) ? `Order ${index + 1}` : tab.label,
  }));

type Actions = {
  createTab: () => string | null;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  canCreateNewTab: () => boolean;

  addItem: (item: Omit<DraftItem, "id">) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  updateItemPrice: (itemId: string, price: number) => void;
  updateItemDiscount: (
    itemId: string,
    discount: { value: number; type: DiscountType },
  ) => void;
  updateItemNotes: (itemId: string, notes: string) => void;
  removeItem: (itemId: string) => void;
  clearOrder: () => void;

  setDiscount: (discount: { value: number; type: DiscountType } | null) => void;
  setCustomer: (customerId: string | null, customerName: string | null) => void;

  getActiveOrder: () => DraftOrder | null;
  getActiveTab: () => OrderTab | null;
  getOrderSubtotal: (tabId?: string) => number;
  getDiscountAmount: (tabId?: string) => number;
};

const INITIAL_TAB = createNewTab(1);

export const useOrderStore = create<State & Actions>()((set, get) => ({
  tabs: [INITIAL_TAB],
  activeTabId: INITIAL_TAB.id,
  maxTabs: MAX_TABS,

  canCreateNewTab: () => get().tabs.length < get().maxTabs,

  createTab: () => {
    const state = get();
    if (!state.canCreateNewTab()) return null;

    const tab = createNewTab(state.tabs.length + 1);
    set({ tabs: [...state.tabs, tab], activeTabId: tab.id });
    return tab.id;
  },

  closeTab: (tabId) => {
    set((state) => {
      const remaining = state.tabs.filter((tab) => tab.id !== tabId);

      if (remaining.length === 0) {
        const fresh = createNewTab(1);
        return { tabs: [fresh], activeTabId: fresh.id };
      }

      const renumbered = renumberTabs(remaining);
      const activeTabId =
        state.activeTabId === tabId
          ? (renumbered[renumbered.length - 1]?.id ?? renumbered[0]!.id)
          : state.activeTabId;

      return { tabs: renumbered, activeTabId };
    });
  },

  setActiveTab: (tabId) => set({ activeTabId: tabId }),

  addItem: (item) =>
    set((state) => {
      const tabs = state.tabs.map((tab) => {
        if (tab.id !== state.activeTabId) return tab;

        const existing = tab.order.items.find(
          (i) => i.productId === item.productId && !i.discount && !i.notes,
        );

        const items = existing
          ? tab.order.items.map((i) =>
              i.id === existing.id
                ? { ...i, quantity: i.quantity + item.quantity }
                : i,
            )
          : [...tab.order.items, { ...item, id: newItemId() }];

        return { ...tab, order: { ...tab.order, items } };
      });

      return { tabs };
    }),

  updateItemQuantity: (itemId, quantity) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== state.activeTabId) return tab;
        if (quantity <= 0) {
          return {
            ...tab,
            order: {
              ...tab.order,
              items: tab.order.items.filter((i) => i.id !== itemId),
            },
          };
        }
        return {
          ...tab,
          order: {
            ...tab.order,
            items: tab.order.items.map((i) =>
              i.id === itemId ? { ...i, quantity } : i,
            ),
          },
        };
      }),
    })),

  updateItemPrice: (itemId, price) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id !== state.activeTabId
          ? tab
          : {
              ...tab,
              order: {
                ...tab.order,
                items: tab.order.items.map((i) =>
                  i.id === itemId ? { ...i, price } : i,
                ),
              },
            },
      ),
    })),

  updateItemDiscount: (itemId, discount) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id !== state.activeTabId
          ? tab
          : {
              ...tab,
              order: {
                ...tab.order,
                items: tab.order.items.map((i) =>
                  i.id === itemId ? { ...i, discount } : i,
                ),
              },
            },
      ),
    })),

  updateItemNotes: (itemId, notes) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id !== state.activeTabId
          ? tab
          : {
              ...tab,
              order: {
                ...tab.order,
                items: tab.order.items.map((i) =>
                  i.id === itemId ? { ...i, notes } : i,
                ),
              },
            },
      ),
    })),

  removeItem: (itemId) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id !== state.activeTabId
          ? tab
          : {
              ...tab,
              order: {
                ...tab.order,
                items: tab.order.items.filter((i) => i.id !== itemId),
              },
            },
      ),
    })),

  clearOrder: () =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id !== state.activeTabId
          ? tab
          : { ...tab, order: createEmptyOrder() },
      ),
    })),

  setDiscount: (discount) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id !== state.activeTabId
          ? tab
          : { ...tab, order: { ...tab.order, discount } },
      ),
    })),

  setCustomer: (customerId, customerName) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id !== state.activeTabId
          ? tab
          : { ...tab, order: { ...tab.order, customerId, customerName } },
      ),
    })),

  getActiveTab: () => {
    const state = get();
    return state.tabs.find((tab) => tab.id === state.activeTabId) ?? null;
  },

  getActiveOrder: () => get().getActiveTab()?.order ?? null,

  getOrderSubtotal: (tabId) => {
    const state = get();
    const tab = tabId
      ? state.tabs.find((t) => t.id === tabId)
      : state.getActiveTab();
    if (!tab) return 0;

    return computeOrderTotals({
      lines: tab.order.items.map((item) => ({
        quantity: item.quantity,
        unitPrice: item.price,
        discountType: item.discount?.type ?? null,
        discountValue: item.discount?.value ?? 0,
      })),
      discountType: null,
      discountValue: 0,
      taxRate: 0,
    }).subtotal;
  },

  // Order-level discount amount only (line discounts are already folded into
  // getOrderSubtotal, so this isolates just the order-level portion).
  getDiscountAmount: (tabId) => {
    const state = get();
    const tab = tabId
      ? state.tabs.find((t) => t.id === tabId)
      : state.getActiveTab();
    if (!tab || !tab.order.discount) return 0;

    return computeOrderTotals({
      lines: tab.order.items.map((item) => ({
        quantity: item.quantity,
        unitPrice: item.price,
        discountType: item.discount?.type ?? null,
        discountValue: item.discount?.value ?? 0,
      })),
      discountType: tab.order.discount.type,
      discountValue: tab.order.discount.value,
      taxRate: 0,
    }).discountAmount;
  },
}));

export const addProductToCart = (product: Product) => {
  useOrderStore.getState().addItem({
    productId: product.id,
    name: product.name,
    price: product.price,
    quantity: 1,
    imagePath: product.imagePath,
  });
};
