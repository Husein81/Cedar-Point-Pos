import { OrderType } from "@repo/types";
import { useAuthStore } from "./authStore";
import {
  DiscountType,
  Order,
  OrderItem,
  OrderTab,
  ServerOrderWithPayments,
} from "@/dto/order.dto";

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

const KITCHEN_SENT_STATUSES = new Set([
  "PLACED",
  "PREPARING",
  "READY",
  "SERVED",
]);

/** Maps a server order payload into the local tab's Order shape. */
export const hydrateOrderFromServer = (
  serverOrder: ServerOrderWithPayments,
  fallbackTableName?: string | null,
): Order => {
  const wasSentToKitchen = KITCHEN_SENT_STATUSES.has(serverOrder.status);

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
      ? { value: si.discount.value, type: si.discount.type }
      : undefined,
  }));

  const resolvedTableId = serverOrder.tableId || null;
  const tableNameFromPayload =
    serverOrder.table && typeof serverOrder.table.name === "string"
      ? serverOrder.table.name
      : null;
  const resolvedTableName = resolvedTableId
    ? (tableNameFromPayload ?? fallbackTableName ?? null)
    : null;

  return {
    id: serverOrder.id,
    status: serverOrder.status as Order["status"],
    type: serverOrder.type as Order["type"],
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
    tableId: resolvedTableId,
    tableName: resolvedTableName,
    guestCount: serverOrder.guestCount ?? 0,
    notes: serverOrder.notes || "",
    orderNumber: serverOrder.orderNumber ?? "",
    createdAt: new Date(serverOrder.createdAt),
    modifiedAt: new Date(),
  };
};
