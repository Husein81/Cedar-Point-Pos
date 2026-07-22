import { BadRequestException } from '@nestjs/common';
import {
  ReservationStatus,
  allowedReservationTransitions,
  canTransitionReservation,
} from '@repo/types';

/**
 * NestJS-flavored guard over the shared reservation state machine. The decision
 * lives in `@repo/types` (`reservation-status.ts`) so backend, POS, and mobile
 * agree; this wrapper only translates a denial into the right HTTP exception.
 *
 * Self-contained (defense in depth): never assumes a route guard already
 * filtered the caller.
 */
export function assertReservationTransition(
  from: ReservationStatus,
  to: ReservationStatus,
): void {
  if (canTransitionReservation(from, to)) return;

  throw new BadRequestException({
    message: `Invalid reservation transition: ${from} → ${to}`,
    code: 'INVALID_RESERVATION_TRANSITION',
    allowed: allowedReservationTransitions(from),
  });
}
