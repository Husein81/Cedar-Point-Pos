import { TableOverview } from "@/dto/tables.dto";
import { deriveTableUiStatus, formatElapsedSince } from "../config";
import { useElapsedNow } from "../hooks";

interface OverviewTabProps {
  table: TableOverview;
  summary: TableOverview["activeOrder"];
  uiStatus: ReturnType<typeof deriveTableUiStatus>;
}

export function OverviewTab({ table, summary, uiStatus }: OverviewTabProps) {
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
      <OverviewRow label="Order #" value={summary?.orderNumber ?? "—"} />
      <OverviewRow
        label="Seated"
        value={
          summary ? `${formatElapsedSince(summary.createdAt, now)} ago` : "—"
        }
      />
      {uiStatus === "RESERVED" && (
        <p className="text-muted-foreground bg-muted/50 mt-3 rounded-lg p-3 text-xs">
          Reservation details (guest, time, countdown) are coming with the
          reservations module. For now RESERVED is a manual hold.
        </p>
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
