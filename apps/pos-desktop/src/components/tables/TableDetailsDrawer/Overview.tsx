import { TableOverview } from "@/dto/tables.dto";
import type { Reservation } from "@/dto/reservation.dto";
import {
  formatReservationCountdown,
  getReservationSourceLabel,
} from "@/components/reservations/reservationStatus";
import { deriveTableUiStatus, formatElapsedSince } from "../config";
import { useElapsedNow } from "../hooks";

interface OverviewTabProps {
  table: TableOverview;
  summary: TableOverview["activeOrder"];
  uiStatus: ReturnType<typeof deriveTableUiStatus>;
  nextReservation: Reservation | null;
}

export function OverviewTab({
  table,
  summary,
  uiStatus,
  nextReservation,
}: OverviewTabProps) {
  const now = useElapsedNow();

  return (
    <div className="space-y-1">
      <OverviewRow label="Floor" value={table.floor?.name ?? "—"} />
      <OverviewRow label="Table name" value={table.name} />
      <OverviewRow label="Capacity" value={`${table.capacity} seats`} />
      <OverviewRow
        label="Guests"
        value={summary ? `${summary.guestCount ?? 0}` : "—"}
      />
      <OverviewRow label="Server" value={summary?.userName ?? "—"} />
      <OverviewRow label="Customer" value={summary?.customerName ?? "—"} />
      {summary?.additionalCustomerNames &&
        summary.additionalCustomerNames.length > 0 && (
          <OverviewRow
            label="Also on bill"
            value={summary.additionalCustomerNames.join(", ")}
          />
        )}
      <OverviewRow label="Order #" value={summary?.orderNumber ?? "—"} />
      <OverviewRow
        label="Seated"
        value={
          summary ? `${formatElapsedSince(summary.createdAt, now)} ago` : "—"
        }
      />
      {uiStatus === "RESERVED" && (
        <div className="mt-3 space-y-1 rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs dark:border-orange-500/20 dark:bg-orange-500/10">
          {nextReservation ? (
            <>
              <div className="flex items-center justify-between">
                <span className="font-medium text-orange-900 dark:text-orange-200">
                  {nextReservation.customerName}
                </span>
                <span className="font-semibold text-orange-700 dark:text-orange-300">
                  {formatReservationCountdown(
                    nextReservation.reservationAt,
                    now,
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between text-orange-800/80 dark:text-orange-300/80">
                <span>{nextReservation.reservationNumber}</span>
                <span>
                  {nextReservation.guestCount} guests ·{" "}
                  {getReservationSourceLabel(nextReservation.source)}
                </span>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">
              Table is on hold, but no matching reservation was found.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function OverviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b py-2 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] truncate text-right font-medium">
        {value}
      </span>
    </div>
  );
}
