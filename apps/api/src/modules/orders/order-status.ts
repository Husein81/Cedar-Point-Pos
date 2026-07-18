import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  BusinessType,
  OrderStatus,
  UserRole,
  allowedTransitions,
  canRoleTransitionOrder,
  canTransitionOrder,
} from '@repo/types';

/**
 * NestJS-flavored guards over the shared order fulfillment state machine.
 * The decision itself lives in `@repo/types` (`order-status.ts`) so the
 * backend, POS, and mobile agree; these wrappers only translate a denial into
 * the right HTTP exception. See `order-status.spec.ts` for the decision table.
 *
 * Self-contained (defense in depth): never assumes a route guard already
 * filtered the caller.
 */

/** Throw unless `from → to` is a legal transition for the business type. */
export function assertTransition(
  businessType: BusinessType,
  from: OrderStatus,
  to: OrderStatus,
): void {
  if (canTransitionOrder(businessType, from, to)) return;

  throw new BadRequestException({
    message: `Invalid ${businessType} transition: ${from} → ${to}`,
    code: 'INVALID_STATUS_TRANSITION',
    allowed: allowedTransitions(businessType, from),
  });
}

/** Throw unless `role` may perform the `from → to` transition. */
export function assertRoleCanTransition(
  role: UserRole,
  from: OrderStatus,
  to: OrderStatus,
): void {
  if (canRoleTransitionOrder(role, from, to)) return;

  throw new ForbiddenException({
    message: `Role ${role} may not move an order from ${from} to ${to}`,
    code: 'STATUS_TRANSITION_FORBIDDEN',
  });
}
