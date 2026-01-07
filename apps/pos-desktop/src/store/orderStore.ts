import { create } from "zustand";
import { persist } from "zustand/middleware";

// =====================
// Types
// =====================

export type OrderStatus = "DRAFT" | "ON_HOLD" | "COMPLETED";

export type DiscountType = "PERCENTAGE" | "FIXED";

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export interface OrderDiscount {
  type: DiscountType;
  value: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  items: OrderItem[];
  discount: OrderDiscount | null;
  customerId: string | null;
  customerName: string | null;
  notes: string;
  createdAt: Date;
  modifiedAt: Date;
}

export interface OrderTab {
  id: string;
  label: string;
  order: Order;
}

// =====================
// Helpers
// =====================

const generateTabId = (): string => {
  return `tab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const generateOrderId = (): string => {
  return `order-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const createEmptyOrder = (): Order => ({
  id: generateOrderId(),
  status: "DRAFT",
  items: [],
  discount: null,
  customerId: null,
  customerName: null,
  notes: "",
  createdAt: new Date(),
  modifiedAt: new Date(),
});

const createNewTab = (tabNumber: number): OrderTab => ({
  id: generateTabId(),
  label: `Order ${tabNumber}`,
  order: createEmptyOrder(),
});

const renumberTabs = (tabs: OrderTab[]): OrderTab[] => {
  return tabs.map((tab, index) => ({
    ...tab,
    label: `Order ${index + 1}`,
  }));
};

// =====================
// Store State & Actions
// =====================

interface OrderStoreState {
  // Tab management
  tabs: OrderTab[];
  activeTabId: string | null;
  maxTabs: number;

  // Tab actions
  createTab: () => string | null;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  renameTab: (tabId: string, newLabel: string) => void;

  // Order actions (operates on active tab)
  addItem: (item: Omit<OrderItem, "id">) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearOrder: () => void;

  // Discount actions
  setDiscount: (discount: OrderDiscount | null) => void;

  // Customer actions
  setCustomer: (customerId: string | null, customerName: string | null) => void;

  // Order notes
  setOrderNotes: (notes: string) => void;

  // Order status
  setOrderStatus: (status: OrderStatus) => void;
  holdOrder: () => void;
  resumeOrder: () => void;

  // Computed helpers
  getActiveOrder: () => Order | null;
  getActiveTab: () => OrderTab | null;
  getOrderSubtotal: (tabId?: string) => number;
  getDiscountAmount: (tabId?: string) => number;
  getOrderTotal: (tabId?: string) => number;
  hasUnsavedChanges: (tabId: string) => boolean;
  canCreateNewTab: () => boolean;

  // Utility
  reset: () => void;
}

const INITIAL_TAB = createNewTab(1);

export const useOrderStore = create<OrderStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      tabs: [INITIAL_TAB],
      activeTabId: INITIAL_TAB.id,
      maxTabs: 5,

      // =====================
      // Tab Management
      // =====================

      createTab: () => {
        const state = get();
        if (state.tabs.length >= state.maxTabs) {
          return null;
        }
        const newTabNumber = state.tabs.length + 1;
        const newTab = createNewTab(newTabNumber);
        const updatedTabs = renumberTabs([...state.tabs, newTab]);

        set({
          tabs: updatedTabs,
          activeTabId: newTab.id,
        });

        return newTab.id;
      },

      closeTab: (tabId: string) => {
        const state = get();
        const tabIndex = state.tabs.findIndex((t) => t.id === tabId);

        if (tabIndex === -1) return;

        // Don't allow closing the last tab
        if (state.tabs.length === 1) {
          // Instead, clear the order in the last tab
          const firstTab = state.tabs[0];
          if (firstTab) {
            set({
              tabs: [createNewTab(1)].map((t) => ({
                ...t,
                id: firstTab.id, // Keep the same ID
              })),
            });
          }
          return;
        }

        const newTabs = state.tabs.filter((t) => t.id !== tabId);
        const renumberedTabs = renumberTabs(newTabs);

        // If closing active tab, switch to adjacent tab
        let newActiveTabId = state.activeTabId;
        if (state.activeTabId === tabId) {
          const newIndex = Math.min(tabIndex, renumberedTabs.length - 1);
          const newTab = renumberedTabs[newIndex];
          newActiveTabId = newTab ? newTab.id : (renumberedTabs[0]?.id ?? null);
        }

        set({
          tabs: renumberedTabs,
          activeTabId: newActiveTabId,
        });
      },

      setActiveTab: (tabId: string) => {
        const state = get();
        if (state.tabs.some((t) => t.id === tabId)) {
          set({ activeTabId: tabId });
        }
      },

      renameTab: (tabId: string, newLabel: string) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId ? { ...tab, label: newLabel } : tab
          ),
        }));
      },

      // =====================
      // Order Item Actions
      // =====================

      addItem: (item: Omit<OrderItem, "id">) => {
        const state = get();
        if (!state.activeTabId) return;

        set({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== state.activeTabId) return tab;

            // Check if item already exists in order
            const existingItemIndex = tab.order.items.findIndex(
              (i) => i.productId === item.productId
            );

            let newItems: OrderItem[];
            if (existingItemIndex !== -1) {
              // Update quantity of existing item
              newItems = tab.order.items.map((i, index) =>
                index === existingItemIndex
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              );
            } else {
              // Add new item
              const newItem: OrderItem = {
                ...item,
                id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              };
              newItems = [...tab.order.items, newItem];
            }

            return {
              ...tab,
              order: {
                ...tab.order,
                items: newItems,
                modifiedAt: new Date(),
              },
            };
          }),
        });
      },

      updateItemQuantity: (itemId: string, quantity: number) => {
        const state = get();
        if (!state.activeTabId) return;

        // Ensure quantity is at least 1
        const validQuantity = Math.max(1, quantity);

        set({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== state.activeTabId) return tab;

            return {
              ...tab,
              order: {
                ...tab.order,
                items: tab.order.items.map((item) =>
                  item.id === itemId
                    ? { ...item, quantity: validQuantity }
                    : item
                ),
                modifiedAt: new Date(),
              },
            };
          }),
        });
      },

      removeItem: (itemId: string) => {
        const state = get();
        if (!state.activeTabId) return;

        set({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== state.activeTabId) return tab;

            return {
              ...tab,
              order: {
                ...tab.order,
                items: tab.order.items.filter((item) => item.id !== itemId),
                modifiedAt: new Date(),
              },
            };
          }),
        });
      },

      clearOrder: () => {
        const state = get();
        if (!state.activeTabId) return;

        set({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== state.activeTabId) return tab;

            return {
              ...tab,
              order: {
                ...tab.order,
                items: [],
                discount: null,
                notes: "",
                modifiedAt: new Date(),
              },
            };
          }),
        });
      },

      // =====================
      // Discount Actions
      // =====================

      setDiscount: (discount: OrderDiscount | null) => {
        const state = get();
        if (!state.activeTabId) return;

        set({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== state.activeTabId) return tab;

            return {
              ...tab,
              order: {
                ...tab.order,
                discount,
                modifiedAt: new Date(),
              },
            };
          }),
        });
      },

      // =====================
      // Customer Actions
      // =====================

      setCustomer: (customerId: string | null, customerName: string | null) => {
        const state = get();
        if (!state.activeTabId) return;

        set({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== state.activeTabId) return tab;

            return {
              ...tab,
              order: {
                ...tab.order,
                customerId,
                customerName,
                modifiedAt: new Date(),
              },
            };
          }),
        });
      },

      // =====================
      // Order Notes
      // =====================

      setOrderNotes: (notes: string) => {
        const state = get();
        if (!state.activeTabId) return;

        set({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== state.activeTabId) return tab;

            return {
              ...tab,
              order: {
                ...tab.order,
                notes,
                modifiedAt: new Date(),
              },
            };
          }),
        });
      },

      // =====================
      // Order Status
      // =====================

      setOrderStatus: (status: OrderStatus) => {
        const state = get();
        if (!state.activeTabId) return;

        set({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== state.activeTabId) return tab;

            return {
              ...tab,
              order: {
                ...tab.order,
                status,
                modifiedAt: new Date(),
              },
            };
          }),
        });
      },

      holdOrder: () => {
        get().setOrderStatus("ON_HOLD");
      },

      resumeOrder: () => {
        get().setOrderStatus("DRAFT");
      },

      // =====================
      // Computed Helpers
      // =====================

      getActiveOrder: () => {
        const state = get();
        const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
        return activeTab?.order ?? null;
      },

      getActiveTab: () => {
        const state = get();
        return state.tabs.find((t) => t.id === state.activeTabId) ?? null;
      },

      getOrderSubtotal: (tabId?: string) => {
        const state = get();
        const targetTabId = tabId ?? state.activeTabId;
        const tab = state.tabs.find((t) => t.id === targetTabId);

        if (!tab) return 0;

        return tab.order.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
      },

      getDiscountAmount: (tabId?: string) => {
        const state = get();
        const targetTabId = tabId ?? state.activeTabId;
        const tab = state.tabs.find((t) => t.id === targetTabId);

        if (!tab?.order.discount) return 0;

        const subtotal = state.getOrderSubtotal(targetTabId ?? undefined);
        const { type, value } = tab.order.discount;

        if (type === "PERCENTAGE") {
          return (subtotal * Math.min(value, 100)) / 100;
        }

        // Fixed discount - cannot exceed subtotal
        return Math.min(value, subtotal);
      },

      getOrderTotal: (tabId?: string) => {
        const state = get();
        const subtotal = state.getOrderSubtotal(tabId);
        const discount = state.getDiscountAmount(tabId);
        return Math.max(0, subtotal - discount);
      },

      hasUnsavedChanges: (tabId: string) => {
        const state = get();
        const tab = state.tabs.find((t) => t.id === tabId);
        return tab ? tab.order.items.length > 0 : false;
      },

      canCreateNewTab: () => {
        const state = get();
        return state.tabs.length < state.maxTabs;
      },

      // =====================
      // Utility
      // =====================

      reset: () => {
        const newTab = createNewTab(1);
        set({
          tabs: [newTab],
          activeTabId: newTab.id,
        });
      },
    }),
    {
      name: "pos-order-store",
      // Only persist essential data, not computed functions
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        maxTabs: state.maxTabs,
      }),
    }
  )
);
