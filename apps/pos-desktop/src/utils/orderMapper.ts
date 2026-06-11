import type { BackendOrder, Order as ClientOrder } from "@/dto/order.dto";

export const mapBackendOrderToClientOrder = (
  backendOrder: BackendOrder,
): ClientOrder => {
  return {
    id: backendOrder.id,
    status: backendOrder.status,
    type: backendOrder.type,
    items: (backendOrder.items || []).map((si) => ({
      id: si.id,
      productId: si.productId,
      name: si.product?.name || "Unknown",
      price: parseFloat(String(si.unitPrice ?? 0)),
      quantity: parseInt(String(si.quantity), 10) || 1,
      notes: si.notes || undefined,
      imageUrl: si.product?.imageUrl || null,
      modifiers:
        si.modifiers?.map((m) => ({
          modifierId: m.modifierId ?? m.modifier?.id,
          name: m.modifier?.name || "",
          price: parseFloat(String(m.price ?? 0)),
        })) || [],
      discount: si.discount
        ? {
            value: parseFloat(String(si.discount.value)),
            type: si.discount.type,
          }
        : undefined,
    })),
    discount: backendOrder.discount
      ? {
          value: parseFloat(String(backendOrder.discount)),
          type: "FIXED" as const,
        }
      : null,
    shippingFee: parseFloat(String(backendOrder.shippingFee ?? 0)),
    includeVAT: backendOrder.includeVAT ?? false,
    paidAmount: (backendOrder.payments || []).reduce(
      (sum: number, p: any) => sum + Number(p.amount ?? 0),
      0,
    ),
    customerId: backendOrder.customerId || null,
    customerName: backendOrder.customer?.name || null,
    customerAddress: backendOrder.customer?.address || null,
    tableId: backendOrder.tableId || null,
    tableName: backendOrder.table?.name || null,
    notes: backendOrder.notes || "",
    orderNumber: backendOrder.orderNumber ?? "",
    createdAt: new Date(backendOrder.createdAt),
    modifiedAt: new Date(),
  };
};
