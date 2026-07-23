import { useMemo } from "react";
import { ReservationStatus } from "@repo/types";
import { SummaryGrid } from "@/components/reports";
import { useTodayReservations } from "@/hooks/useReservations";

/** "Arriving soon" horizon in minutes. */
const ARRIVING_SOON_MINUTES = 120;

type Props = {
  branchId?: string;
};

/**
 * Dashboard reservation KPI row. Derives the five spec widgets from today's
 * reservations (one query) rather than adding backend count endpoints — the
 * list is small (a single day) so client-side aggregation is cheap and DRY.
 */
export function ReservationWidgets({ branchId }: Props) {
  const { data: today = [], isLoading } = useTodayReservations(branchId);

  const items = useMemo(() => {
    const now = Date.now();
    const soonCutoff = now + ARRIVING_SOON_MINUTES * 60_000;

    const arrivingSoon = today.filter(
      (r) =>
        (r.status === ReservationStatus.PENDING ||
          r.status === ReservationStatus.CONFIRMED) &&
        new Date(r.reservationAt).getTime() <= soonCutoff &&
        new Date(r.reservationAt).getTime() >= now,
    ).length;

    const waiting = today.filter(
      (r) => r.status === ReservationStatus.ARRIVED,
    ).length;

    const completed = today.filter(
      (r) => r.status === ReservationStatus.COMPLETED,
    ).length;

    const noShows = today.filter(
      (r) => r.status === ReservationStatus.NO_SHOW,
    ).length;

    return [
      {
        title: "Today's Reservations",
        value: today.length.toLocaleString(),
        icon: "CalendarDays",
        subtitle: "Booked for today",
      },
      {
        title: "Arriving Soon",
        value: arrivingSoon.toLocaleString(),
        icon: "Clock",
        subtitle: "Within 2 hours",
      },
      {
        title: "Waiting Guests",
        value: waiting.toLocaleString(),
        icon: "Hourglass",
        subtitle: "Arrived, not seated",
      },
      {
        title: "Completed Today",
        value: completed.toLocaleString(),
        icon: "CircleCheck",
        subtitle: "Finished service",
      },
      {
        title: "No-shows",
        value: noShows.toLocaleString(),
        icon: "UserX",
        subtitle: "Missed today",
      },
    ];
  }, [today]);

  return <SummaryGrid items={items} isLoading={isLoading} columns="4" />;
}
