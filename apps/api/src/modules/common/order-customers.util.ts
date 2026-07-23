import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Prisma error code P2021 = "the table does not exist". Used to let the app
 * degrade gracefully when the optional `OrderCustomer` join table is absent
 * (e.g. a shared-database reset dropped it) instead of returning a 500.
 */
export function isMissingTableError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === 'P2021'
  );
}

export type OrderCustomerLink = {
  customerId: string;
  isPrimary: boolean;
  customer: { id: string; name: string };
};

/**
 * Fetch the additional (non-primary) customers for the given orders, keyed by
 * orderId. The primary customer always lives on `Order.customerId`; this join
 * table only holds the extra shared customers. Returns an empty map if the
 * table is missing so the caller's core query still succeeds.
 */
export async function fetchAdditionalOrderCustomers(
  prisma: PrismaService,
  orderIds: string[],
): Promise<Map<string, OrderCustomerLink[]>> {
  const byOrder = new Map<string, OrderCustomerLink[]>();
  if (orderIds.length === 0) return byOrder;

  try {
    const rows = await prisma.orderCustomer.findMany({
      where: { orderId: { in: orderIds }, isPrimary: false },
      select: {
        orderId: true,
        customerId: true,
        isPrimary: true,
        customer: { select: { id: true, name: true } },
      },
    });
    for (const row of rows) {
      const list = byOrder.get(row.orderId) ?? [];
      list.push({
        customerId: row.customerId,
        isPrimary: row.isPrimary,
        customer: row.customer,
      });
      byOrder.set(row.orderId, list);
    }
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
    // Table missing — degrade to "no additional customers".
  }
  return byOrder;
}
