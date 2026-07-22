import { ReservationSource, ReservationStatus } from "@repo/types";

/** Tailwind badge classes per reservation status (light + dark). */
const STATUS_BADGE: Record<ReservationStatus, string> = {
  [ReservationStatus.PENDING]:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  [ReservationStatus.CONFIRMED]:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  [ReservationStatus.ARRIVED]:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  [ReservationStatus.SEATED]:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  [ReservationStatus.COMPLETED]:
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  [ReservationStatus.CANCELLED]:
    "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  [ReservationStatus.NO_SHOW]:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
};

const STATUS_LABEL: Record<ReservationStatus, string> = {
  [ReservationStatus.PENDING]: "Pending",
  [ReservationStatus.CONFIRMED]: "Confirmed",
  [ReservationStatus.ARRIVED]: "Arrived",
  [ReservationStatus.SEATED]: "Seated",
  [ReservationStatus.COMPLETED]: "Completed",
  [ReservationStatus.CANCELLED]: "Cancelled",
  [ReservationStatus.NO_SHOW]: "No-show",
};

const SOURCE_LABEL: Record<ReservationSource, string> = {
  [ReservationSource.WALK_IN]: "Walk-in",
  [ReservationSource.PHONE]: "Phone",
  [ReservationSource.ONLINE]: "Online",
  [ReservationSource.ADMIN]: "Admin",
};

export const getReservationStatusLabel = (status: ReservationStatus): string =>
  STATUS_LABEL[status] ?? status;

export const getReservationSourceLabel = (source: ReservationSource): string =>
  SOURCE_LABEL[source] ?? source;

export function ReservationStatusBadge({
  status,
}: {
  status: ReservationStatus;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}
    >
      {getReservationStatusLabel(status)}
    </span>
  );
}

/** Format an ISO instant as a short local date + time for tables/cards. */
export const formatReservationDateTime = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const formatReservationTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

/** "in 25m" / "in 2h 5m" / "5m ago" for a reservation's start time vs `now`. */
export const formatReservationCountdown = (
  reservationAt: string,
  now: number,
): string => {
  const diffMs = new Date(reservationAt).getTime() - now;
  const pastDue = diffMs < 0;
  const totalMinutes = Math.round(Math.abs(diffMs) / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const label = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  return pastDue ? `${label} ago` : `in ${label}`;
};
