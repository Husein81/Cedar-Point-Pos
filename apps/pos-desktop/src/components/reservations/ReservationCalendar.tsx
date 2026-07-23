import { useMemo } from "react";
import { Empty, Icon } from "@repo/ui";
import type { Reservation, ReservationCalendar as CalendarData } from "@/dto/reservation.dto";
import {
  ReservationStatusBadge,
  formatReservationTime,
} from "./reservationStatus";

type Props = {
  data?: CalendarData;
  isLoading: boolean;
  onSelect: (reservation: Reservation) => void;
};

/** Service window shown on the day schedule. */
const START_HOUR = 8;
const END_HOUR = 24;

/**
 * Day schedule grouped by hour. Each row is an hour of service; reservations
 * that start in that hour appear as clickable cards. A lightweight take on the
 * spec's calendar — no drag & drop, since the floor plan has no DnD to reuse.
 */
export function ReservationCalendar({ data, isLoading, onSelect }: Props) {
  const hours = useMemo(
    () => Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i),
    [],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Icon name="LoaderCircle" className="mr-2 animate-spin" size={20} />
        Loading schedule…
      </div>
    );
  }

  if (!data || data.reservations.length === 0) {
    return (
      <Empty
        title="No reservations"
        description="Nothing booked for this day yet."
        icon="CalendarDays"
      />
    );
  }

  return (
    <div className="divide-y divide-border rounded-md border border-border">
      {hours.map((hour) => {
        const items = data.byHour[String(hour)] ?? [];
        return (
          <div key={hour} className="flex gap-3 p-2">
            <div className="w-16 shrink-0 pt-1 text-xs font-medium text-muted-foreground">
              {hour.toString().padStart(2, "0")}:00
            </div>
            <div className="flex flex-1 flex-wrap gap-2">
              {items.length === 0 ? (
                <span className="py-1 text-xs text-muted-foreground/60">—</span>
              ) : (
                items.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => onSelect(r)}
                    className="flex min-w-40 flex-col items-start rounded-md border border-border bg-card px-3 py-2 text-left text-sm transition hover:border-primary hover:bg-accent"
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="font-medium">{r.customerName}</span>
                      <ReservationStatusBadge status={r.status} />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatReservationTime(r.reservationAt)} · {r.guestCount}{" "}
                      guest{r.guestCount !== 1 ? "s" : ""}
                      {r.table ? ` · ${r.table.name}` : ""}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
