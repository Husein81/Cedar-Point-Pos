import type { OrderItem } from "@/dto/order.dto";
import type { OrderItem as ServerOrderItem } from "@repo/types";

export type SplitRequestItem = { itemId: string; quantity: number };

type Variant = {
  productId: string;
  unitPrice: number | string;
  notes?: string | null;
  discount?: { value: number; type: string } | null;
};

const variantKey = (item: Variant): string =>
  [
    item.productId,
    Number(item.unitPrice).toFixed(2),
    item.notes ?? "",
    item.discount ? `${item.discount.type}:${item.discount.value}` : "",
  ].join("|");

export function translateSplitToServerIds(
  requested: SplitRequestItem[],
  localItems: OrderItem[],
  serverItems: ServerOrderItem[],
): SplitRequestItem[] {
  const pool = new Map<string, { id: string; remaining: number }[]>();
  for (const serverItem of serverItems) {
    const key = variantKey(serverItem);
    const bucket = pool.get(key) ?? [];
    bucket.push({ id: serverItem.id, remaining: Number(serverItem.quantity) });
    pool.set(key, bucket);
  }

  const translatedByServerId = new Map<string, number>();

  for (const { itemId, quantity } of requested) {
    const local = localItems.find((i) => i.id === itemId);
    if (!local) {
      throw new Error("Selected item is no longer on the order");
    }

    const key = variantKey({
      productId: local.productId,
      unitPrice: local.price,
      notes: local.notes ?? null,
      discount: local.discount ?? null,
    });
    const bucket = pool.get(key) ?? [];

    let toAssign = quantity;
    for (const entry of bucket) {
      if (toAssign <= 0) break;
      if (entry.remaining <= 0) continue;
      const take = Math.min(entry.remaining, toAssign);
      translatedByServerId.set(
        entry.id,
        (translatedByServerId.get(entry.id) ?? 0) + take,
      );
      entry.remaining -= take;
      toAssign -= take;
    }

    if (toAssign > 0) {
      throw new Error(
        "The order changed on the server before the split could sync",
      );
    }
  }

  return Array.from(translatedByServerId, ([splitItemId, splitQuantity]) => ({
    itemId: splitItemId,
    quantity: splitQuantity,
  }));
}
