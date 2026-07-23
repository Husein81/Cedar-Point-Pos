import { useMemo } from "react";
import { Button, Icon } from "@repo/ui";
import { ACTIVE_RESERVATION_STATUSES } from "@repo/types";
import type { TableOverview } from "@/dto/tables.dto";
import type { Reservation } from "@/dto/reservation.dto";
import { useTableReservations } from "@/hooks/useReservations";
import { useReservationActions } from "@/components/reservations/useReservationActions";
import {
  ReservationStatusBadge,
  formatReservationDateTime,
} from "@/components/reservations/reservationStatus";

type Props = {
  table: TableOverview;
};

function ReservationRow({
  reservation,
  tableId,
}: {
  reservation: Reservation;
  tableId: string;
}) {
  // Seating from the floor binds the booking to *this* table; cancelling from
  // here goes straight through (no reason prompt in the compact row).
  const { actions, isPending, seatWith, cancelWith } = useReservationActions(
    reservation,
    {
      onSeat: (r) => seatWith(r.id, { tableId }),
      onCancel: (r) => cancelWith(r.id),
    },
  );

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{reservation.customerName}</p>
          <p className="text-xs text-muted-foreground">
            {formatReservationDateTime(reservation.reservationAt)} ·{" "}
            {reservation.guestCount} guest
            {reservation.guestCount !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            {reservation.reservationNumber} · {reservation.customerPhone}
          </p>
        </div>
        <ReservationStatusBadge status={reservation.status} />
      </div>

      {actions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {actions.map((action) => (
            <Button
              key={action.key}
              size="sm"
              variant={action.destructive ? "outline" : "default"}
              iconName={action.icon}
              disabled={isPending}
              onClick={action.run}
              className={
                action.destructive
                  ? "border-destructive/40 text-destructive hover:bg-destructive/10"
                  : undefined
              }
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Reservations for this table, shown inside the table drawer so staff can seat
 * or manage a booking straight from the floor. Active/upcoming bookings are
 * listed first; terminal ones (completed/cancelled/no-show) are collapsed to a
 * count to keep the list focused during service.
 */
export function ReservationsTab({ table }: Props) {
  const { data: reservations = [], isLoading } = useTableReservations(table.id);

  const { active, terminalCount } = useMemo(() => {
    const activeStatuses = new Set<string>(ACTIVE_RESERVATION_STATUSES);
    const activeList = reservations
      .filter((r) => activeStatuses.has(r.status))
      .sort(
        (a, b) =>
          new Date(a.reservationAt).getTime() -
          new Date(b.reservationAt).getTime(),
      );
    const terminal = reservations.length - activeList.length;
    return { active: activeList, terminalCount: terminal };
  }, [reservations]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        <Icon name="LoaderCircle" className="mr-2 animate-spin" size={18} />
        Loading reservations…
      </div>
    );
  }

  if (active.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-sm">
        <Icon name="CalendarClock" className="h-8 w-8 opacity-40" />
        {terminalCount > 0
          ? `No upcoming reservations (${terminalCount} past)`
          : "No reservations for this table"}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {active.map((reservation) => (
        <ReservationRow
          key={reservation.id}
          reservation={reservation}
          tableId={table.id}
        />
      ))}
      {terminalCount > 0 && (
        <p className="pt-1 text-center text-xs text-muted-foreground">
          {terminalCount} past reservation{terminalCount !== 1 ? "s" : ""} hidden
        </p>
      )}
    </div>
  );
}
