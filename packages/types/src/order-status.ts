import { BusinessType, OrderStatus, UserRole } from "./enums";

// Single source of truth for the order fulfillment state machine. Pure
// predicates (no framework deps) so the backend (assert wrappers in
// modules/orders/order-status.ts) and every frontend gate identically.
//
// Payment is a separate axis (PaymentStatus) and never appears here.

type TransitionMap = Partial<Record<OrderStatus, readonly OrderStatus[]>>;

/**
 * Restaurant flow:
 * DRAFT → PLACED → PREPARING → READY → SERVED → COMPLETED
 * CANCELLED exits everywhere pre-completion (post-fire = manager only).
 * READY → COMPLETED covers takeaway/counter pickup (no serving step).
 */
const RESTAURANT_TRANSITIONS: TransitionMap = {
  [OrderStatus.DRAFT]: [OrderStatus.PLACED, OrderStatus.CANCELLED],
  [OrderStatus.PLACED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [
    OrderStatus.SERVED,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.SERVED]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

/**
 * Retail flow: DRAFT → COMPLETED (instant sale) or DRAFT → PLACED (credit
 * sale, settled later) → COMPLETED. Kitchen states are unreachable.
 */
const RETAIL_TRANSITIONS: TransitionMap = {
  [OrderStatus.DRAFT]: [
    OrderStatus.PLACED,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PLACED]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

export function allowedTransitions(
  businessType: BusinessType,
  from: OrderStatus,
): readonly OrderStatus[] {
  const map =
    businessType === BusinessType.RESTAURANT
      ? RESTAURANT_TRANSITIONS
      : RETAIL_TRANSITIONS;
  return map[from] ?? [];
}

/** Whether `from → to` is a legal fulfillment transition. Same-status is a no-op (allowed). */
export function canTransitionOrder(
  businessType: BusinessType,
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  if (from === to) return true;
  return allowedTransitions(businessType, from).includes(to);
}

/**
 * Who may perform each transition (enforced server-side; frontends use it to
 * hide unavailable actions):
 * - Kitchen owns cooking progress (PLACED → PREPARING → READY) and nothing else.
 * - Waiters/cashiers place, serve, and cancel their own drafts.
 * - Only cashier+ closes an order (COMPLETED — payment-guarded separately).
 * - Cancelling a fired order (PLACED and beyond) is manager/admin only.
 */
export function canRoleTransitionOrder(
  role: UserRole,
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  if (from === to) return true;
  if (role === UserRole.SYSTEM_ADMIN) return false; // never operates orders

  const isManager = role === UserRole.ADMIN || role === UserRole.MANAGER;
  if (isManager) return true;

  switch (to) {
    case OrderStatus.PLACED:
      return (
        role === UserRole.CASHIER ||
        role === UserRole.WAITER ||
        role === UserRole.DRIVER
      );
    case OrderStatus.PREPARING:
    case OrderStatus.READY:
      return role === UserRole.KITCHEN;
    case OrderStatus.SERVED:
      return (
        role === UserRole.CASHIER ||
        role === UserRole.WAITER ||
        role === UserRole.DRIVER
      );
    case OrderStatus.COMPLETED:
      // Closing a paid order is a normal front-of-house action for anyone
      // operating orders — cashier, waiter, or delivery driver. Only the
      // kitchen (which never touches billing) is excluded, via the default.
      return (
        role === UserRole.CASHIER ||
        role === UserRole.WAITER ||
        role === UserRole.DRIVER
      );
    case OrderStatus.CANCELLED:
      // Only an unfired draft may be cancelled by non-managers.
      return (
        from === OrderStatus.DRAFT &&
        (role === UserRole.CASHIER || role === UserRole.WAITER)
      );
    default:
      return false;
  }
}
