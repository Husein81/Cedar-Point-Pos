import { useState } from "react";
import { Button, Icon, Shad } from "@repo/ui";
import type { Reservation } from "@/dto/reservation.dto";
import { useReservationActions } from "./useReservationActions";
import {
  ReservationStatusBadge,
  formatReservationDateTime,
  getReservationSourceLabel,
} from "./reservationStatus";

type Props = {
  reservation: Reservation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (reservation: Reservation) => void;
};

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon name={icon} size={16} className="mt-0.5 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm">{value}</div>
      </div>
    </div>
  );
}

/**
 * Right-hand drawer showing a reservation's full detail and the valid quick
 * actions for its current status. Seat and cancel need extra input, so they are
 * intercepted here with a lightweight inline prompt.
 */
export function ReservationDetailsDrawer({
  reservation,
  open,
  onOpenChange,
  onEdit,
}: Props) {
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);

  const { actions, isPending, seatWith, cancelWith } = useReservationActions(
    reservation,
    {
      onSeat: (r) => seatWith(r.id, {}),
      onCancel: () => setShowCancel(true),
    },
  );

  if (!reservation) return null;

  const confirmCancel = () => {
    cancelWith(reservation.id, cancelReason || undefined);
    setShowCancel(false);
    setCancelReason("");
    onOpenChange(false);
  };

  return (
    <Shad.Sheet open={open} onOpenChange={onOpenChange}>
      <Shad.SheetContent className="flex w-full flex-col sm:max-w-md">
        <Shad.SheetHeader>
          <Shad.SheetTitle className="flex items-center gap-2">
            {reservation.reservationNumber}
            <ReservationStatusBadge status={reservation.status} />
          </Shad.SheetTitle>
          <Shad.SheetDescription>
            {formatReservationDateTime(reservation.reservationAt)} ·{" "}
            {reservation.guestCount} guest
            {reservation.guestCount !== 1 ? "s" : ""}
          </Shad.SheetDescription>
        </Shad.SheetHeader>

        <div className="flex-1 overflow-y-auto px-4">
          <DetailRow
            icon="User"
            label="Customer"
            value={
              <div>
                <p className="font-medium">{reservation.customerName}</p>
                <p className="text-muted-foreground">
                  {reservation.customerPhone}
                </p>
                {reservation.customerEmail && (
                  <p className="text-muted-foreground">
                    {reservation.customerEmail}
                  </p>
                )}
              </div>
            }
          />

          <DetailRow
            icon="Armchair"
            label="Table"
            value={
              reservation.table ? (
                `${reservation.table.name} (seats ${reservation.table.capacity})`
              ) : (
                <span className="text-muted-foreground">Not assigned</span>
              )
            }
          />

          <DetailRow
            icon="Radio"
            label="Source"
            value={getReservationSourceLabel(reservation.source)}
          />

          {reservation.order && (
            <DetailRow
              icon="ReceiptText"
              label="Linked order"
              value={
                <span>
                  {reservation.order.orderNumber ?? reservation.order.id} ·{" "}
                  {reservation.order.status}
                </span>
              }
            />
          )}

          {reservation.createdBy && (
            <DetailRow
              icon="UserCog"
              label="Created by"
              value={reservation.createdBy.name}
            />
          )}

          {reservation.notes && (
            <DetailRow
              icon="StickyNote"
              label="Notes"
              value={<p className="whitespace-pre-wrap">{reservation.notes}</p>}
            />
          )}

          {reservation.cancellationReason && (
            <DetailRow
              icon="CircleX"
              label="Cancellation reason"
              value={reservation.cancellationReason}
            />
          )}

          {showCancel && (
            <div className="mt-3 space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm font-medium">Cancel this reservation?</p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason (optional)"
                className="h-16 w-full rounded-md border border-input bg-transparent p-2 text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCancel(false)}
                >
                  Keep
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={confirmCancel}
                  disabled={isPending}
                >
                  Cancel reservation
                </Button>
              </div>
            </div>
          )}
        </div>

        <Shad.SheetFooter className="flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Button
                key={action.key}
                size="sm"
                variant={action.destructive ? "outline" : "default"}
                onClick={action.run}
                disabled={isPending}
                iconName={action.icon}
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
          <Button
            variant="outline"
            size="sm"
            iconName="Pencil"
            onClick={() => onEdit(reservation)}
          >
            Edit reservation
          </Button>
        </Shad.SheetFooter>
      </Shad.SheetContent>
    </Shad.Sheet>
  );
}
