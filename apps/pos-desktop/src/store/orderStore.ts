import {
  AdditionalCustomer,
  Order,
  OrderDiscount,
  OrderItem,
  OrderItemModifier,
  OrderTab,
  ServerOrderWithPayments,
} from "@/dto/order.dto";
import { OrderStatus, OrderType } from "@repo/types";
import { VAT_RATE } from "@/constants/finance";
import { getItemLineTotal } from "@/utils/financial";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  generateTabId,
  renumberTabs,
  createNewTab,
  createEmptyOrder,
  generateOrderId,
  hydrateOrderFromServer,
} from "./config";

type LastCompletedOrder = {
  order: Order;
  orderNumber: string;
  tenantName: string;
  branchName: string;
  branchAddress?: string;
  branchPhone?: string;
  loyaltyApplied?: {
    points: number;
    discount: number;
  };
};

type SplitItem = {
  itemId: string;
  quantity: number;
};

type State = {
  tabs: OrderTab[];
  activeTabId: string | null;
  maxTabs: number;
  lastCompletedOrder?: LastCompletedOrder;
};

type Actions = {
  // Tab actions
  createTab: () => string | null;
  createTabWithTable: (tableId: string, tableName: string) => string | null;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  splitToNewTab: (splits: SplitItem[]) => string | null;
  revertSplit: (
    originalTabId: string,
    originalItems: OrderItem[],
    splitTabId: string,
  ) => void;

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
  addAdditionalCustomer: (customer: AdditionalCustomer) => void;
  removeAdditionalCustomer: (customerId: string) => void;

  // Table actions
  setTable: (tableId: string | null, tableName: string | null) => void;
  setGuestCount: (count?: number) => void;

  // Order notes
  // Kitchen
  markItemsSentToKitchen: () => void;
  getUnsentItems: () => OrderItem[];

  // Order status
  setOrderStatus: (status: OrderStatus) => void;
  setOrderType: (type?: string) => void;

  // Update the order ID on the active tab (e.g. after server creation)
  updateOrderId: (newId: string) => void;
  updateOrderNumber: (newNumber: string) => void;

  // Load existing server order into a new tab
  loadOrder: (
    serverOrder: ServerOrderWithPayments,
    forceRefresh?: boolean,
  ) => string | null;

  // Re-hydrate one specific tab with authoritative server data (used to
  // reconcile an optimistic local change once the server confirms it, when
  // the tab's local order id won't match the server's for a lookup by id).
  hydrateTab: (tabId: string, serverOrder: ServerOrderWithPayments) => void;

  // Computed helpers
  getActiveOrder: () => Order | null;
  getOrderSubtotal: (tabId?: string) => number;
  getDiscountAmount: (tabId?: string) => number;
  getVATAmount: (tabId?: string) => number;
  hasUnsavedChanges: (tabId: string) => boolean;
  canCreateNewTab: () => boolean;

  setLastCompletedOrder: (data?: LastCompletedOrder) => void;
  reset: () => void;
};

type OrderStore = State & Actions;

const INITIAL_TAB = createNewTab(1);

export const useOrderStore = create<OrderStore>()(
  persist(
    (set, get) => ({
      tabs: [INITIAL_TAB],
      activeTabId: INITIAL_TAB.id,
      maxTabs: 15,
      lastCompletedOrder: undefined,

      setLastCompletedOrder: (data) => set({ lastCompletedOrder: data }),

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

          // No stale tab to evict - try evicting any non-active empty tab
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

      splitToNewTab: (splits: { itemId: string; quantity: number }[]) => {
        const state = get();
        if (!state.activeTabId) return null;
        if (state.tabs.length >= state.maxTabs) return null;

        const currentTab = state.tabs.find((t) => t.id === state.activeTabId);
        if (!currentTab) return null;

        const splitItems: OrderItem[] = [];
        const remainingItems: OrderItem[] = [];

        currentTab.order.items.forEach((item) => {
          const split = splits.find((s) => s.itemId === item.id);
          if (split && split.quantity > 0) {
            const qtyToSplit = Math.min(item.quantity, split.quantity);
            if (qtyToSplit > 0) {
              // Add to split items
              splitItems.push({
                ...item,
                quantity: qtyToSplit,
                id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              });
            }

            const qtyRemaining = item.quantity - qtyToSplit;
            if (qtyRemaining > 0) {
              remainingItems.push({ ...item, quantity: qtyRemaining });
            }
          } else {
            remainingItems.push(item);
          }
        });

        if (splitItems.length === 0) return null;

        const newTab: OrderTab = {
          id: generateTabId(),
          label: `Split from ${currentTab.label}`,
          order: {
            ...createEmptyOrder({
              type: currentTab.order.type || OrderType.DINE_IN,
            }),
            tableId: currentTab.order.tableId,
            tableName: currentTab.order.tableName,
            customerId: currentTab.order.customerId,
            customerName: currentTab.order.customerName,
            customerAddress: currentTab.order.customerAddress,
            items: splitItems,
          },
        };

        const updatedTabs = renumberTabs(
          state.tabs
            .map((t) =>
              t.id === state.activeTabId
                ? {
                    ...t,
                    order: {
                      ...t.order,
                      items: remainingItems,
                      modifiedAt: new Date(),
                    },
                  }
                : t,
            )
            .concat(newTab),
        );

        set({
          tabs: updatedTabs,
          activeTabId: newTab.id,
        });

        return newTab.id;
      },

      /**
       * Undo an optimistic split shown to the user before the server
       * confirmed it — closes the split-off tab and restores the original
       * tab's pre-split items only if they haven't been edited since the
       * split was initiated. Always removes the split tab and reconciles
       * the active tab even if the original tab no longer exists.
       */
      revertSplit: (
        originalTabId: string,
        originalItems: OrderItem[],
        splitTabId: string,
      ) => {
        const state = get();
        const originalTab = state.tabs.find((t) => t.id === originalTabId);

        // Only restore items if the original tab still exists AND its items
        // haven't been edited since the split snapshot was captured. If items
        // have changed, preserve those edits and only remove the split tab.
        const itemsMatch =
          originalTab &&
          originalTab.order.items.length === originalItems.length &&
          originalTab.order.items.every((current, idx) => {
            const orig = originalItems[idx];
            return (
              current.id === orig?.id &&
              current.quantity === orig.quantity &&
              current.price === orig.price &&
              current.notes === orig.notes &&
              (current.discount?.value === orig.discount?.value ||
                (current.discount == null && orig.discount == null))
            );
          });

        const updatedTabs = renumberTabs(
          state.tabs
            .filter((t) => t.id !== splitTabId)
            .map((t) =>
              t.id === originalTabId && itemsMatch
                ? {
                    ...t,
                    order: {
                      ...t.order,
                      items: originalItems,
                      modifiedAt: new Date(),
                    },
                  }
                : t,
            ),
        );

        // If original tab no longer exists or was the only tab after removing
        // the split tab, pick a sensible active tab. Otherwise keep current.
        let newActiveTabId = state.activeTabId;
        if (state.activeTabId === splitTabId) {
          // Active was the split tab — switch to original if it exists,
          // otherwise pick the first remaining tab.
          newActiveTabId = originalTab
            ? originalTabId
            : (updatedTabs[0]?.id ?? null);
        }

        set({
          tabs: updatedTabs,
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
              order: { ...createEmptyOrder(), id: generateOrderId() },
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
                // A customer can't be both primary and additional.
                additionalCustomers: customerId
                  ? tab.order.additionalCustomers.filter(
                      (c) => c.id !== customerId,
                    )
                  : tab.order.additionalCustomers,
                modifiedAt: new Date(),
              },
            };
          }),
        });
      },

      addAdditionalCustomer: (customer: AdditionalCustomer) => {
        const state = get();
        if (!state.activeTabId) return;

        set({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== state.activeTabId) return tab;

            const { order } = tab;
            // Skip if it's already the primary or already added.
            if (order.customerId === customer.id) return tab;
            if (order.additionalCustomers.some((c) => c.id === customer.id))
              return tab;

            return {
              ...tab,
              order: {
                ...order,
                additionalCustomers: [...order.additionalCustomers, customer],
                modifiedAt: new Date(),
              },
            };
          }),
        });
      },

      removeAdditionalCustomer: (customerId: string) => {
        const state = get();
        if (!state.activeTabId) return;

        set({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== state.activeTabId) return tab;

            return {
              ...tab,
              order: {
                ...tab.order,
                additionalCustomers: tab.order.additionalCustomers.filter(
                  (c) => c.id !== customerId,
                ),
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

      setGuestCount: (count?: number) => {
        const state = get();
        if (!state.activeTabId) return;

        set({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== state.activeTabId) return tab;

            return {
              ...tab,
              order: {
                ...tab.order,
                guestCount: count,
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

      updateOrderNumber: (newNumber: string) => {
        const state = get();
        if (!state.activeTabId) return;

        set({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== state.activeTabId) return tab;
            return {
              ...tab,
              order: {
                ...tab.order,
                orderNumber: newNumber,
                modifiedAt: new Date(),
              },
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

        const hydratedOrder = hydrateOrderFromServer(
          serverOrder,
          existingTab?.order.tableName ?? null,
        );

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

      hydrateTab: (tabId: string, serverOrder: ServerOrderWithPayments) => {
        const state = get();
        const tab = state.tabs.find((t) => t.id === tabId);
        if (!tab) return;

        const hydratedOrder = hydrateOrderFromServer(
          serverOrder,
          tab.order.tableName,
        );

        set({
          tabs: state.tabs.map((t) =>
            t.id === tabId
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

        // Subtotal with modifiers in and item-level discounts out.
        return tab.order.items.reduce(
          (sum, item) => sum + getItemLineTotal(item),
          0,
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

        return parseFloat(
          (subtotalAfterDiscountAndShipping * VAT_RATE).toFixed(2),
        );
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
    },
  ),
);
