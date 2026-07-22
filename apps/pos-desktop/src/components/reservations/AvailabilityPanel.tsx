import { Icon } from "@repo/ui";
import type {
  AvailabilityResult,
  AvailabilityTable,
} from "@/dto/reservation.dto";
import { formatReservationTime } from "./reservationStatus";

type Props = {
  isLoading: boolean;
  result?: AvailabilityResult;
  selectedTableId?: string;
  onSelectTable: (table: AvailabilityTable) => void;
};

function TableChip({
  table,
  disabled,
  selected,
  onClick,
}: {
  table: AvailabilityTable;
  disabled?: boolean;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "flex flex-col items-start rounded-md border px-3 py-2 text-left text-sm transition",
        disabled
          ? "cursor-not-allowed border-border bg-muted/40 text-muted-foreground line-through"
          : selected
            ? "border-primary bg-primary/10 ring-1 ring-primary"
            : "border-border hover:border-primary hover:bg-accent",
      ].join(" ")}
    >
      <span className="font-medium">{table.name}</span>
      <span className="text-xs text-muted-foreground">
        Seats {table.capacity}
      </span>
    </button>
  );
}

/**
 * Availability results for the chosen slot: free tables (selectable), booked
 * tables (disabled), suggested best-fits, and the next open time when nothing
 * fits. Rendered inside the reservation dialog once a branch/date/time is set.
 */
export function AvailabilityPanel({
  isLoading,
  result,
  selectedTableId,
  onSelectTable,
}: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border p-4 text-sm text-muted-foreground">
        <Icon name="LoaderCircle" className="animate-spin" size={16} />
        Checking availability…
      </div>
    );
  }

  if (!result) return null;

  const hasSuggestions = result.suggestedTables.length > 0;

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      {hasSuggestions ? (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Suggested tables
          </p>
          <div className="grid grid-cols-3 gap-2">
            {result.suggestedTables.map((table) => (
              <TableChip
                key={table.id}
                table={table}
                selected={table.id === selectedTableId}
                onClick={() => onSelectTable(table)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-md bg-amber-50 p-2.5 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          <Icon name="TriangleAlert" size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">No tables fit this slot.</p>
            {result.nextAvailableTime && (
              <p>
                Next available:{" "}
                <span className="font-semibold">
                  {formatReservationTime(result.nextAvailableTime)}
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      {result.availableTables.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            All available
          </p>
          <div className="grid grid-cols-3 gap-2">
            {result.availableTables.map((table) => (
              <TableChip
                key={table.id}
                table={table}
                selected={table.id === selectedTableId}
                onClick={() => onSelectTable(table)}
              />
            ))}
          </div>
        </div>
      )}

      {result.unavailableTables.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Unavailable
          </p>
          <div className="grid grid-cols-3 gap-2">
            {result.unavailableTables.map((table) => (
              <TableChip key={table.id} table={table} disabled />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
