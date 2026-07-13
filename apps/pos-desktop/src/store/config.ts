import { OrderType } from "@repo/types";
import { useAuthStore } from "./authStore";
import { Order, OrderTab } from "@/dto/order.dto";

export const generateTabId = (): string => {
  return `tab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export const generateOrderId = (): string => {
  return `order-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export const getDefaultOrderType = (): OrderType => {
  const businessType = useAuthStore.getState().user?.tenant?.businessType;
  return businessType === "RETAIL" ? OrderType.RETAIL : OrderType.DINE_IN;
};

export const createEmptyOrder = (overrides?: Partial<Order>): Order => ({
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
  guestCount: undefined,
  notes: "",
  createdAt: new Date(),
  modifiedAt: new Date(),
  ...overrides,
});

export const createNewTab = (tabNumber: number): OrderTab => ({
  id: generateTabId(),
  label: `Order ${tabNumber}`,
  order: createEmptyOrder(),
});

export const renumberTabs = (tabs: OrderTab[]): OrderTab[] => {
  return tabs.map((tab, index) => ({
    ...tab,
    label: tab.order.id.startsWith("order-") ? `Order ${index + 1}` : tab.label,
  }));
};
