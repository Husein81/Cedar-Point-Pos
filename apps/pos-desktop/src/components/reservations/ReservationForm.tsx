import { useMemo, useState } from "react";
import { useForm } from "@tanstack/react-form";
import {
  Button,
  DatePicker,
  InputField,
  SelectField,
  TextareaField,
} from "@repo/ui";
import { ReservationSource } from "@repo/types";
import { useModalStore } from "@/store/modalStore";
import { useBranchStore } from "@/store/branchStore";
import {
  useCreateReservation,
  useTableAvailability,
  useUpdateReservation,
} from "@/hooks/useReservations";
import type {
  AvailabilityTable,
  Reservation,
} from "@/dto/reservation.dto";
import { AvailabilityPanel } from "./AvailabilityPanel";
import { getReservationSourceLabel } from "./reservationStatus";

type Props = {
  reservation?: Reservation;
};

const DEFAULT_DURATION = 90;

const sourceOptions = Object.values(ReservationSource).map((value) => ({
  value,
  label: getReservationSourceLabel(value),
}));

const durationOptions = [
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
  { value: "120", label: "2 hours" },
  { value: "150", label: "2.5 hours" },
  { value: "180", label: "3 hours" },
];

/** ISO date (yyyy-mm-dd) from a Date, in local time. */
const toDateInput = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const ReservationForm = ({ reservation }: Props) => {
  const closeModal = useModalStore((state) => state.closeModal);
  const activeBranchId = useBranchStore((state) => state.branchId);
  const createMutation = useCreateReservation();
  const updateMutation = useUpdateReservation();
  const isEditing = !!reservation;

  const branchId = reservation?.branchId ?? activeBranchId ?? "";

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(
    reservation ? new Date(reservation.reservationAt) : new Date(),
  );
  const [time, setTime] = useState(reservation?.reservationTime ?? "19:00");
  const [duration, setDuration] = useState(
    reservation?.durationMinutes ?? DEFAULT_DURATION,
  );
  const [guestCount, setGuestCount] = useState(reservation?.guestCount ?? 2);
  const [selectedTableId, setSelectedTableId] = useState<string | undefined>(
    reservation?.tableId ?? undefined,
  );

  // Fire availability once we have branch + a valid time.
  const availabilityQuery = useMemo(
    () =>
      branchId && /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
        ? {
            branchId,
            reservationDate: toDateInput(selectedDate),
            reservationTime: time,
            durationMinutes: duration,
            guestCount,
            excludeReservationId: reservation?.id,
          }
        : null,
    [branchId, selectedDate, time, duration, guestCount, reservation?.id],
  );

  const { data: availability, isFetching: availabilityLoading } =
    useTableAvailability(availabilityQuery, !!availabilityQuery);

  const form = useForm({
    defaultValues: {
      customerName: reservation?.customerName ?? "",
      customerPhone: reservation?.customerPhone ?? "",
      customerEmail: reservation?.customerEmail ?? "",
      source: reservation?.source ?? ReservationSource.PHONE,
      notes: reservation?.notes ?? "",
    },
    onSubmit: async ({ value }) => {
      if (!branchId) return;
      const reservationDate = toDateInput(selectedDate);
      try {
        if (isEditing) {
          await updateMutation.mutateAsync({
            id: reservation.id,
            data: {
              customerName: value.customerName,
              customerPhone: value.customerPhone,
              customerEmail: value.customerEmail || undefined,
              guestCount,
              reservationDate,
              reservationTime: time,
              durationMinutes: duration,
              tableId: selectedTableId,
              source: value.source,
              notes: value.notes || undefined,
            },
          });
        } else {
          await createMutation.mutateAsync({
            branchId,
            customerName: value.customerName,
            customerPhone: value.customerPhone,
            customerEmail: value.customerEmail || undefined,
            guestCount,
            reservationDate,
            reservationTime: time,
            durationMinutes: duration,
            tableId: selectedTableId,
            source: value.source,
            notes: value.notes || undefined,
          });
        }
        closeModal();
      } catch (error) {
        console.error("Failed to save reservation:", error);
      }
    },
  });

  const handleSelectTable = (table: AvailabilityTable) => {
    setSelectedTableId((current) =>
      current === table.id ? undefined : table.id,
    );
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      {!branchId && (
        <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          Select a branch before creating a reservation.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <form.Field
          name="customerName"
          validators={{
            onChange: ({ value }) =>
              !value?.trim() ? "Customer name is required" : undefined,
          }}
        >
          {(field) => (
            <InputField
              label="Customer Name"
              field={field}
              placeholder="Guest name"
              required
            />
          )}
        </form.Field>

        <form.Field
          name="customerPhone"
          validators={{
            onChange: ({ value }) =>
              !value?.trim() ? "Phone is required" : undefined,
          }}
        >
          {(field) => (
            <InputField
              label="Phone"
              field={field}
              placeholder="Phone number"
              required
            />
          )}
        </form.Field>
      </div>

      <form.Field name="customerEmail">
        {(field) => (
          <InputField
            label="Email"
            field={field}
            type="email"
            placeholder="Email (optional)"
          />
        )}
      </form.Field>

      <div className="grid grid-cols-2 gap-3">
        <DatePicker
          label="Date"
          open={datePickerOpen}
          onOpenChange={setDatePickerOpen}
          date={selectedDate}
          onDateChange={(d) => d && setSelectedDate(d)}
        />

        <div className="flex flex-col gap-3">
          <label className="px-1 text-sm font-medium" htmlFor="reservationTime">
            Time
          </label>
          <input
            id="reservationTime"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="guestCount">
            Guests
          </label>
          <input
            id="guestCount"
            type="number"
            min={1}
            value={guestCount}
            onChange={(e) =>
              setGuestCount(Math.max(1, Number(e.target.value) || 1))
            }
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="duration">
            Duration
          </label>
          <select
            id="duration"
            value={String(duration)}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {durationOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Table assignment</p>
        <AvailabilityPanel
          isLoading={availabilityLoading}
          result={availability}
          selectedTableId={selectedTableId}
          onSelectTable={handleSelectTable}
        />
        <p className="text-xs text-muted-foreground">
          {selectedTableId
            ? "Tap the selected table again to leave it unassigned."
            : "Optional — a table can be assigned now or at seating time."}
        </p>
      </div>

      <form.Field name="source">
        {(field) => (
          <SelectField
            label="Source"
            field={field}
            options={sourceOptions}
            placeholder="How was this booked?"
          />
        )}
      </form.Field>

      <form.Field name="notes">
        {(field) => (
          <TextareaField
            label="Notes"
            field={field}
            placeholder="Allergies, seating preferences, occasion…"
          />
        )}
      </form.Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={closeModal}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!branchId || isSubmitting}
          isSubmitting={isSubmitting}
        >
          {isEditing ? "Save Changes" : "Create Reservation"}
        </Button>
      </div>
    </form>
  );
};
