import { ReservationStatus } from "./enums";

// Single source of truth for the reservation lifecycle state machine. Pure
// predicates (no framework deps) so the backend (assert wrappers in
// modules/reservations/reservation-status.ts) and every frontend gate
// identically. See reservation-status.spec.ts for the decision table.

type TransitionMap = Partial<
  Record<ReservationStatus, readonly ReservationStatus[]>
>;

/**
 * PENDING → CONFIRMED → ARRIVED → SEATED → COMPLETED is the happy path.
 * A booking may be CANCELLED any time before it is seated. NO_SHOW is reached
 * from PENDING/CONFIRMED (guest never turned up) — manually or via the
 * expiration sweep. SEATED links to a live Order; COMPLETED closes it.
 * COMPLETED / CANCELLED / NO_SHOW are terminal.
 */
const RESERVATION_TRANSITIONS: TransitionMap = {
  [ReservationStatus.PENDING]: [
    ReservationStatus.CONFIRMED,
    ReservationStatus.ARRIVED,
    ReservationStatus.SEATED,
    ReservationStatus.CANCELLED,
    ReservationStatus.NO_SHOW,
  ],
  [ReservationStatus.CONFIRMED]: [
    ReservationStatus.ARRIVED,
    ReservationStatus.SEATED,
    ReservationStatus.CANCELLED,
    ReservationStatus.NO_SHOW,
  ],
  [ReservationStatus.ARRIVED]: [
    ReservationStatus.SEATED,
    ReservationStatus.CANCELLED,
    ReservationStatus.NO_SHOW,
  ],
  [ReservationStatus.SEATED]: [
    ReservationStatus.COMPLETED,
    ReservationStatus.CANCELLED,
  ],
  [ReservationStatus.COMPLETED]: [],
  [ReservationStatus.CANCELLED]: [],
  [ReservationStatus.NO_SHOW]: [],
};

export function allowedReservationTransitions(
  from: ReservationStatus,
): readonly ReservationStatus[] {
  return RESERVATION_TRANSITIONS[from] ?? [];
}

/** Whether `from → to` is a legal transition. Same-status is a no-op (allowed). */
export function canTransitionReservation(
  from: ReservationStatus,
  to: ReservationStatus,
): boolean {
  if (from === to) return true;
  return allowedReservationTransitions(from).includes(to);
}
