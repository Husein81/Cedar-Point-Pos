import { useMemo } from "react";
import { ReservationStatus, canTransitionReservation } from "@repo/types";
import {
  useArriveReservation,
  useCancelReservation,
  useCompleteReservation,
  useMarkNoShow,
  useSeatReservation,
  useUpdateReservation,
} from "@/hooks/useReservations";
import type { Reservation, SeatReservationDto } from "@/dto/reservation.dto";

export type ReservationActionKey =
  | "confirm"
  | "arrive"
  | "seat"
  | "complete"
  | "cancel"
  | "no-show";

export interface ReservationAction {
  key: ReservationActionKey;
  label: string;
  icon: string;
  /** Destructive actions render with a warning style. */
  destructive?: boolean;
  run: () => void;
}

/**
 * Derives the valid quick-actions for a reservation from the shared state
 * machine (the same `canTransitionReservation` the API enforces) and wires each
 * to its mutation. Seat/cancel need extra input, so those are surfaced as
 * callbacks the caller can intercept (open a dialog) before running.
 */
export const useReservationActions = (
  reservation: Reservation | null,
  handlers?: {
    onSeat?: (reservation: Reservation) => void;
    onCancel?: (reservation: Reservation) => void;
  },
) => {
  const update = useUpdateReservation();
  const arrive = useArriveReservation();
  const seat = useSeatReservation();
  const complete = useCompleteReservation();
  const cancel = useCancelReservation();
  const noShow = useMarkNoShow();

  const isPending =
    update.isPending ||
    arrive.isPending ||
    seat.isPending ||
    complete.isPending ||
    cancel.isPending ||
    noShow.isPending;

  const actions = useMemo<ReservationAction[]>(() => {
    if (!reservation) return [];
    const status = reservation.status;
    const can = (to: ReservationStatus) =>
      status !== to && canTransitionReservation(status, to);

    const list: ReservationAction[] = [];

    // Confirm is a plain PATCH (no side effects) — only from PENDING.
    if (status === ReservationStatus.PENDING) {
      list.push({
        key: "confirm",
        label: "Confirm",
        icon: "Check",
        run: () =>
          update.mutate({
            id: reservation.id,
            data: { status: ReservationStatus.CONFIRMED },
          }),
      });
    }

    if (can(ReservationStatus.ARRIVED)) {
      list.push({
        key: "arrive",
        label: "Arrived",
        icon: "UserCheck",
        run: () => arrive.mutate(reservation.id),
      });
    }

    if (can(ReservationStatus.SEATED)) {
      list.push({
        key: "seat",
        label: "Seat",
        icon: "Armchair",
        run: () => {
          if (handlers?.onSeat) handlers.onSeat(reservation);
          else seat.mutate({ id: reservation.id });
        },
      });
    }

    if (can(ReservationStatus.COMPLETED)) {
      list.push({
        key: "complete",
        label: "Complete",
        icon: "CircleCheck",
        run: () => complete.mutate(reservation.id),
      });
    }

    if (can(ReservationStatus.NO_SHOW)) {
      list.push({
        key: "no-show",
        label: "No-show",
        icon: "UserX",
        destructive: true,
        run: () => noShow.mutate(reservation.id),
      });
    }

    if (can(ReservationStatus.CANCELLED)) {
      list.push({
        key: "cancel",
        label: "Cancel",
        icon: "X",
        destructive: true,
        run: () => {
          if (handlers?.onCancel) handlers.onCancel(reservation);
          else cancel.mutate({ id: reservation.id });
        },
      });
    }

    return list;
  }, [reservation, handlers, update, arrive, seat, complete, cancel, noShow]);

  const seatWith = (id: string, data: SeatReservationDto) =>
    seat.mutate({ id, data });
  const cancelWith = (id: string, reason?: string) =>
    cancel.mutate({ id, reason });

  return { actions, isPending, seatWith, cancelWith };
};
