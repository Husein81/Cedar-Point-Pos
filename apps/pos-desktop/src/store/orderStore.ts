import { useAuthStore } from "@/store/authStore";
import { OrderStatus, OrderType } from "@repo/types";
import type { Order as ServerOrder } from "@repo/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// =====================
// Types
// =====================
export type DiscountType = "PERCENTAGE" | "FIXED";

export type OrderItemModifier = {
  modifierId: string;
  name: string;
  price: number;
};

export type OrderItem = {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  imageUrl?: string | null;
  modifiers?: OrderItemModifier[]; // Restaurant modifiers
  discount?: {
    value: number;
    type: "PERCENTAGE" | "FIXED";
  };
  sentToKitchen?: boolean;
};

export type OrderDiscount = {
  type: DiscountType;
  value: number;
};

export type Order = {
  id: string;
  status: OrderStatus;
  type?: OrderType;
  items: OrderItem[];
  discount: OrderDiscount | null;
  shippingFee: number;
  includeVAT: boolean;
  paidAmount: number;
  customerId: string | null;
  customerName: string | null;
  customerAddress: string | null;
  tableId: string | null;
  tableName: string | null;
  notes: string;
  createdAt: Date;
  modifiedAt: Date;
};

export type OrderTab = {
  id: string;
  label: string;
  order: Order;
};

type ServerOrderWithPayments = ServerOrder & {
  payments?: Array<{ amount?: number | string | null }>;
};

// =====================
// Helpers
// =====================

const generateTabId = (): string => {
  return `tab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const generateOrderId = (): string => {
  return `order-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const getDefaultOrderType = (): OrderType => {
  const businessType = useAuthStore.getState().user?.tenant?.businessType;
  return businessType === "RETAIL" ? OrderType.RETAIL : OrderType.DINE_IN;
};

const createEmptyOrder = (overrides: Partial<Order> = {}): Order => ({
  id: generateOrderId(),
  status: "DRAFT",
  items: [],
  type: getDefaultOrderType(),
  discount: null,
  shippingFee: 0,
  includeVAT: false,
  paidAmount: 0,
  customerId: null,
  customerName: null,
  customerAddress: null,
  tableId: null,
  tableName: null,
  notes: "",
  createdAt: new Date(),
  modifiedAt: new Date(),
  ...overrides,
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
  createTabWithTable: (tableId: string, tableName: string) => string | null;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;

  // Order actions (operates on active tab)
  addItem: (item: Omit<OrderItem, "id">) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  updateItemPrice: (itemId: string, price: number) => void;
  updateItemDiscount: (
    itemId: string,
    discount: { value: number; type: "PERCENTAGE" | "FIXED" },
  ) => void;
  updateItemModifiers: (itemId: string, modifiers: OrderItemModifier[]) => void; // New
  updateItemNotes: (itemId: string, notes: string) => void;
  removeItem: (itemId: string) => void;
  clearOrder: () => void;

  // Discount actions
  setDiscount: (discount: OrderDiscount | null) => void;

  // Shipping fee actions
  setShippingFee: (fee: number) => void;

  // VAT actions
  toggleVAT: () => void;

  // Customer actions
  setCustomer: (
    customerId: string | null,
    customerName: string | null,
    customerAddress?: string | null,
  ) => void;

  // Table actions
  setTable: (tableId: string | null, tableName: string | null) => void;

  // Order notes
  // Kitchen
  markItemsSentToKitchen: () => void;
  getUnsentItems: () => OrderItem[];

  // Order status
  setOrderStatus: (status: OrderStatus) => void;
  setOrderType: (type?: string) => void;

  // Update the order ID on the active tab (e.g. after server creation)
  updateOrderId: (newId: string) => void;

  // Load existing server order into a new tab
  loadOrder: (
    serverOrder: ServerOrder,
    forceRefresh?: boolean,
  ) => string | null;

  // Computed helpers
  getActiveOrder: () => Order | null;
  getOrderSubtotal: (tabId?: string) => number;
  getDiscountAmount: (tabId?: string) => number;
  getVATAmount: (tabId?: string) => number;
  hasUnsavedChanges: (tabId: string) => boolean;
  canCreateNewTab: () => boolean;
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

      createTabWithTable: (tableId: string, tableName: string) => {
        const state = get();

        // First, check if there's already a tab with this table
        const existingTab = state.tabs.find((t) => t.order.tableId === tableId);
        if (existingTab) {
          set({ activeTabId: existingTab.id });
          return existingTab.id;
        }

        // Check if the current active tab is empty and can be reused
        const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
        if (
          activeTab &&
          activeTab.order.items.length === 0 &&
          !activeTab.order.tableId
        ) {
          // Reuse the empty tab
          set({
            tabs: state.tabs.map((t) =>
              t.id === activeTab.id
                ? {
                    ...t,
                    order: {
                      ...t.order,
                      tableId,
                      tableName,
                      type: OrderType.DINE_IN,
                      modifiedAt: new Date(),
                    },
                  }
                : t,
            ),
          });
          return activeTab.id;
        }

        // Create a new tab if we have room
        if (state.tabs.length >= state.maxTabs) {
          // Evict a stale tab: prefer tabs with server-persisted table
          // orders that aren't the active tab (least likely to still
          // be relevant). This prevents silent failures when the user
          // keeps navigating to different tables from the tables page.
          const staleTab = state.tabs.find(
            (t) =>
              t.id !== state.activeTabId &&
              t.order.tableId &&
              !t.order.id.startsWith("order-"),
          );

          if (staleTab) {
            const filtered = state.tabs.filter((t) => t.id !== staleTab.id);
            const newTab: OrderTab = {
              id: generateTabId(),
              label: `Order ${filtered.length + 1}`,
              order: {
                ...createEmptyOrder({ type: OrderType.DINE_IN }),
                tableId,
                tableName,
              },
            };
            const updatedTabs = renumberTabs([...filtered, newTab]);
            set({ tabs: updatedTabs, activeTabId: newTab.id });
            return newTab.id;
          }

          // No stale tab to evict — try evicting any non-active empty tab
          const emptyTab = state.tabs.find(
            (t) => t.id !== state.activeTabId && t.order.items.length === 0,
          );

          if (emptyTab) {
            const filtered = state.tabs.filter((t) => t.id !== emptyTab.id);
            const newTab: OrderTab = {
              id: generateTabId(),
              label: `Order ${filtered.length + 1}`,
              order: {
                ...createEmptyOrder({ type: OrderType.DINE_IN }),
                tableId,
                tableName,
              },
            };
            const updatedTabs = renumberTabs([...filtered, newTab]);
            set({ tabs: updatedTabs, activeTabId: newTab.id });
            return newTab.id;
          }

          return null;
        }

        const newTabNumber = state.tabs.length + 1;
        const newTab: OrderTab = {
          id: generateTabId(),
          label: `Order ${newTabNumber}`,
          order: {
            ...createEmptyOrder({ type: OrderType.DINE_IN }),
            tableId,
            tableName,
          },
        };
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

      // =====================
      // Order Item Actions
      // =====================

      addItem: (item: Omit<OrderItem, "id">) => {
        const state = get();
        if (!state.activeTabId) {
          return;
        }

        set({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== state.activeTabId) return tab;

            // For items with modifiers, check if exact same modifiers exist
            // Different modifiers = separate line items
            const existingItemIndex = tab.order.items.findIndex((i) => {
              if (i.productId !== item.productId) return false;
              if (i.sentToKitchen) return false;

              // If product is not modifiable or no modifiers, merge by productId
              if (!item.modifiers || item.modifiers.length === 0) {
                return !i.modifiers || i.modifiers.length === 0;
              }

              // Compare modifiers
              if (
                !i.modifiers ||
                i.modifiers.length !== item.modifiers.length
              ) {
                return false;
              }

              const itemModIds = new Set(
                item.modifiers.map((m) => m.modifierId),
              );
              const existingModIds = new Set(
                i.modifiers.map((m) => m.modifierId),
              );

              // Check if both sets are equal
              if (itemModIds.size !== existingModIds.size) return false;
              for (const id of itemModIds) {
                if (!existingModIds.has(id)) return false;
              }

              return true;
            });

            let newItems: OrderItem[];
            if (existingItemIndex !== -1) {
              // Update quantity of existing item
              newItems = tab.order.items.map((i, index) =>
                index === existingItemIndex
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i,
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
        const validQuantity = Math.max(0, quantity);

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
                    : item,
                ),
                modifiedAt: new Date(),
              },
            };
          }),
        });
      },

      updateItemPrice: (itemId: string, price: number) => {
        const state = get();
        if (!state.activeTabId) return;

        // Ensure price is at least 0
        const validPrice = Math.max(0, price);

        set({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== state.activeTabId) return tab;

            return {
              ...tab,
              order: {
                ...tab.order,
                items: tab.order.items.map((item) =>
                  item.id === itemId ? { ...item, price: validPrice } : item,
                ),
                modifiedAt: new Date(),
              },
            };
          }),
        });
      },

      updateItemDiscount: (
        itemId: string,
        discount: { value: number; type: "PERCENTAGE" | "FIXED" },
      ) => {
        const state = get();
        if (!state.activeTabId) return;

        set({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== state.activeTabId) return tab;

            return {
              ...tab,
              order: {
                ...tab.order,
                items: tab.order.items.map((item) =>
                  item.id === itemId ? { ...item, discount } : item,
                ),
                modifiedAt: new Date(),
              },
            };
          }),
        });
      },

      updateItemModifiers: (itemId: string, modifiers: OrderItemModifier[]) => {
        const state = get();
        if (!state.activeTabId) return;

        set({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== state.activeTabId) return tab;

            return {
              ...tab,
              order: {
                ...tab.order,
                items: tab.order.items.map((item) =>
                  item.id === itemId ? { ...item, modifiers } : item,
                ),
                modifiedAt: new Date(),
              },
            };
          }),
        });
      },

      updateItemNotes: (itemId: string, notes: string) => {
        const state = get();
        if (!state.activeTabId) return;

        set({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== state.activeTabId) return tab;

            return {
              ...tab,
              order: {
                ...tab.order,
                items: tab.order.items.map((item) =>
                  item.id === itemId
                    ? { ...item, notes: notes || undefined }
                    : item,
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
                paidAmount: 0,
                type: getDefaultOrderType(),
                customerId: null,
                customerName: null,
                tableId: null,
                tableName: null,
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

      setShippingFee: (fee: number) => {
        const state = get();
        if (!state.activeTabId) return;

        set({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== state.activeTabId) return tab;

            return {
              ...tab,
              order: {
                ...tab.order,
                shippingFee: Math.max(0, fee),
                modifiedAt: new Date(),
              },
            };
          }),
        });
      },

      // =====================
      // VAT Actions
      // =====================
      toggleVAT: () => {
        const state = get();
        if (!state.activeTabId) return;

        set({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== state.activeTabId) return tab;

            return {
              ...tab,
              order: {
                ...tab.order,
                includeVAT: !tab.order.includeVAT,
                modifiedAt: new Date(),
              },
            };
          }),
        });
      },

      // =====================
      // Customer Actions
      // =====================

      setCustomer: (
        customerId: string | null,
        customerName: string | null,
        customerAddress?: string | null,
      ) => {
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
                customerAddress: customerAddress ?? null,
                modifiedAt: new Date(),
              },
            };
          }),
        });
      },

      // =====================
      // Table Actions
      // =====================

      setTable: (tableId: string | null, tableName: string | null) => {
        const state = get();
        if (!state.activeTabId) return;

        set({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== state.activeTabId) return tab;

            return {
              ...tab,
              order: {
                ...tab.order,
                tableId,
                tableName,
                ...(tableId ? { type: OrderType.DINE_IN } : {}),
                modifiedAt: new Date(),
              },
            };
          }),
        });
      },

      // =====================
      // Order Status & Type
      // =====================

      markItemsSentToKitchen: () => {
        const state = get();
        if (!state.activeTabId) return;

        set({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== state.activeTabId) return tab;

            return {
              ...tab,
              order: {
                ...tab.order,
                items: tab.order.items.map((item) => ({
                  ...item,
                  sentToKitchen: true,
                })),
                modifiedAt: new Date(),
              },
            };
          }),
        });
      },

      getUnsentItems: () => {
        const state = get();
        const order = state.tabs.find((t) => t.id === state.activeTabId)?.order;
        if (!order) return [];
        return order.items.filter((i) => !i.sentToKitchen);
      },

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

      setOrderType: (type?: string) => {
        const state = get();
        if (!state.activeTabId) return;

        set({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== state.activeTabId) return tab;

            return {
              ...tab,
              order: {
                ...tab.order,
                type: type ? (type as OrderType) : undefined,
                modifiedAt: new Date(),
              },
            };
          }),
        });
      },

      updateOrderId: (newId: string) => {
        const state = get();
        if (!state.activeTabId) return;

        set({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== state.activeTabId) return tab;
            return {
              ...tab,
              order: { ...tab.order, id: newId, modifiedAt: new Date() },
            };
          }),
        });
      },

      loadOrder: (
        serverOrder: ServerOrderWithPayments,
        forceRefresh?: boolean,
      ) => {
        const state = get();

        // Check if this server order is already loaded in a tab
        const existingTab = state.tabs.find(
          (t) => t.order.id === serverOrder.id,
        );
        if (existingTab) {
          if (!forceRefresh) {
            set({ activeTabId: existingTab.id });
            return existingTab.id;
          }
          // forceRefresh: fall through to re-hydrate the order data below
        }

        // Try to reuse the current active tab if it's empty
        const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
        const canReuse =
          activeTab &&
          activeTab.order.items.length === 0 &&
          !activeTab.order.tableId &&
          !activeTab.order.customerId;

        // Determine if items were already sent to kitchen based on order status
        const wasSentToKitchen =
          serverOrder.status === "SENT_TO_KITCHEN" ||
          serverOrder.status === "IN_PROGRESS" ||
          serverOrder.status === "CONFIRMED" ||
          serverOrder.status === "READY";

        // Map server order items to local OrderItem format
        const items: OrderItem[] = (serverOrder.items || []).map((si) => ({
          id: si.id,
          productId: si.productId,
          name: si.product?.name || "Unknown",
          price: parseFloat(String(si.unitPrice ?? 0)),
          quantity: parseInt(String(si.quantity), 10) || 1,
          notes: si.notes || undefined,
          imageUrl: si.product?.imageUrl || null,
          modifiers:
            si.modifiers?.map((m: any) => ({
              modifierId: m.modifierId || m.modifier?.id || m.id,
              name: m.modifier?.name || m.name || "",
              price: parseFloat(String(m.price ?? 0)),
            })) || [],
          sentToKitchen: wasSentToKitchen,
          discount: si.discount
            ? {
                value: si.discount.value,
                type: si.discount.type,
              }
            : undefined,
        }));

        const hydratedOrder: Order = {
          id: serverOrder.id,
          status: serverOrder.status as OrderStatus,
          type: serverOrder.type as OrderType | undefined,
          items,
          discount: serverOrder.discount
            ? {
                value: parseFloat(String(serverOrder.discount)),
                type: "FIXED" as DiscountType,
              }
            : null,
          shippingFee: parseFloat(String(serverOrder.shippingFee ?? 0)),
          includeVAT: serverOrder.includeVAT ?? false,
          paidAmount: (serverOrder.payments || []).reduce(
            (sum, p) => sum + Number(p.amount ?? 0),
            0,
          ),
          customerId: serverOrder.customerId || null,
          customerName: serverOrder.customer?.name || null,
          customerAddress: serverOrder.customer?.address || null,
          tableId: serverOrder.tableId || null,
          tableName: serverOrder.table?.name || null,
          notes: "",
          createdAt: new Date(serverOrder.createdAt),
          modifiedAt: new Date(),
        };

        if (forceRefresh && existingTab) {
          // Re-hydrate existing tab with fresh server data
          set({
            tabs: state.tabs.map((t) =>
              t.id === existingTab.id
                ? {
                    ...t,
                    label: serverOrder.orderNumber
                      ? `#${serverOrder.orderNumber}`
                      : t.label,
                    order: hydratedOrder,
                  }
                : t,
            ),
            activeTabId: existingTab.id,
          });
          return existingTab.id;
        }

        if (canReuse && activeTab) {
          set({
            tabs: state.tabs.map((t) =>
              t.id === activeTab.id
                ? {
                    ...t,
                    label: serverOrder.orderNumber
                      ? `#${serverOrder.orderNumber}`
                      : t.label,
                    order: hydratedOrder,
                  }
                : t,
            ),
          });
          return activeTab.id;
        }

        // Create a new tab if we have room
        if (state.tabs.length >= state.maxTabs) {
          return null;
        }

        const newTab: OrderTab = {
          id: generateTabId(),
          label: serverOrder.orderNumber
            ? `#${serverOrder.orderNumber}`
            : `Order ${state.tabs.length + 1}`,
          order: hydratedOrder,
        };

        set({
          tabs: [...state.tabs, newTab],
          activeTabId: newTab.id,
        });

        return newTab.id;
      },

      // =====================
      // Computed Helpers
      // =====================

      getActiveOrder: () => {
        const state = get();
        const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
        return activeTab?.order ?? null;
      },

      getOrderSubtotal: (tabId?: string) => {
        const state = get();
        const targetTabId = tabId ?? state.activeTabId;
        const tab = state.tabs.find((t) => t.id === targetTabId);

        if (!tab) return 0;

        // Calculate subtotal with item-level discounts applied
        return tab.order.items.reduce((sum, item) => {
          // Calculate base price + modifiers
          const modifiersTotal =
            item.modifiers?.reduce((modSum, mod) => modSum + mod.price, 0) || 0;
          const unitPrice = item.price + modifiersTotal;
          const lineTotal = unitPrice * item.quantity;

          // Apply item-level discount if present
          let itemDiscount = 0;
          if (item.discount) {
            if (item.discount.type === "PERCENTAGE") {
              itemDiscount = lineTotal * (item.discount.value / 100);
            } else {
              // FIXED discount
              itemDiscount = item.discount.value;
            }
          }

          return sum + (lineTotal - itemDiscount);
        }, 0);
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

      getVATAmount: (tabId?: string) => {
        const state = get();
        const targetTabId = tabId ?? state.activeTabId;
        const tab = state.tabs.find((t) => t.id === targetTabId);
        if (!tab?.order.includeVAT) return 0;

        const subtotal = state.getOrderSubtotal(tabId);
        const discount = state.getDiscountAmount(tabId);
        const shippingFee = tab?.order.shippingFee ?? 0;
        const subtotalAfterDiscountAndShipping = Math.max(
          0,
          subtotal - discount + shippingFee,
        );

        // 11% VAT
        return parseFloat((subtotalAfterDiscountAndShipping * 0.11).toFixed(2));
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
    }),
    {
      name: "pos-order-store",
      // Only persist essential data, not computed functions
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        maxTabs: state.maxTabs,
      }),
    },
  ),
);
