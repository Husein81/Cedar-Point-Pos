import { useBranches } from "@/hooks/useBranch";
import {
  useCreateRecurringShiftSchedule,
  useCreateShiftSchedule,
  useUpdateShiftSchedule,
} from "@/hooks/useShiftSchedule";
import { useStaffList } from "@/hooks/useStaff";
import { useModalStore } from "@/store/modalStore";
import type { ShiftScheduleView } from "@/dto/shiftSchedule.dto";
import {
  formatScheduleTime,
  parseDateInputValue,
  scheduleDateKey,
  toDateInputValue,
} from "@/utils/shiftScheduleTime";
import {
  toDatedCreate,
  toDatedUpdate,
  toRecurringCreate,
  toRecurringUpdate,
} from "@/utils/shiftSchedulePayload";
import {
  Button,
  cn,
  Combobox,
  DatePicker,
  InputField,
  Label,
  SwitchField,
  TextareaField,
  TimePicker,
} from "@repo/ui";
import { useForm } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";

type Props = {
  schedule?: ShiftScheduleView;
  prefilledDate?: Date;
  prefilledUserId?: string;
};

const STAFF_OPTIONS_LIMIT = 100;
const DEFAULT_START = "09:00";
const DEFAULT_END = "17:00";

// 0 = Sunday … 6 = Saturday (matches the server's getUTCDay() contract).
const WEEKDAYS: { value: number; label: string }[] = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

/** First touched validation error for a field, or undefined. */
const fieldError = (field: AnyFieldApi): string | undefined =>
  field.state.meta.isTouched && field.state.meta.errors.length > 0
    ? String(field.state.meta.errors[0])
    : undefined;

/** Minutes since midnight for a "HH:MM" value, or null if malformed. */
const toMinutes = (value: string): number | null => {
  if (typeof value !== "string") return null;
  const [h, m] = value.split(":");
  const hours = Number(h);
  const minutes = Number(m);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  return hours * 60 + minutes;
};

/** Paid hours between two "HH:MM" values minus the unpaid break, 1 decimal. */
const paidHoursLabel = (
  start: string,
  end: string,
  breakMinutes: number
): string | null => {
  const startMin = toMinutes(start);
  const endMin = toMinutes(end);
  if (startMin === null || endMin === null) return null;
  const mins = endMin - startMin - breakMinutes;
  if (mins <= 0) return null;
  return `${Math.round((mins / 60) * 10) / 10}h`;
};

export const ShiftScheduleForm = ({
  schedule,
  prefilledDate,
  prefilledUserId,
}: Props) => {
  const closeModal = useModalStore((state) => state.closeModal);
  const { data: branches, isLoading: branchesLoading } = useBranches();
  const { data: staff, isLoading: staffLoading } = useStaffList({
    limit: STAFF_OPTIONS_LIMIT,
    isActive: true,
  });

  const createMutation = useCreateShiftSchedule();
  const updateMutation = useUpdateShiftSchedule();
  const recurringMutation = useCreateRecurringShiftSchedule();

  const isEdit = !!schedule;

  const branchOptions = (branches ?? []).map((branch) => ({
    value: branch.id,
    label: branch.name,
  }));
  const staffOptions = (staff?.data ?? []).map((member) => ({
    value: member.id,
    label: member.name,
  }));

  const form = useForm({
    defaultValues: {
      branchId: schedule?.branchId ?? "",
      userId: schedule?.userId ?? prefilledUserId ?? "",
      date: schedule?.date
        ? scheduleDateKey(schedule.date)
        : prefilledDate
          ? toDateInputValue(prefilledDate)
          : "",
      startTime: schedule ? formatScheduleTime(schedule.startTime) : DEFAULT_START,
      endTime: schedule ? formatScheduleTime(schedule.endTime) : DEFAULT_END,
      breakMinutes: schedule ? String(schedule.breakMinutes) : "0",
      notes: schedule?.notes ?? "",
      // Recurring pattern. On edit this is fixed to the row's kind (the toggle
      // is hidden); on create it drives the single-vs-weekly choice.
      repeat: schedule?.isRecurring ?? false,
      daysOfWeek: schedule?.daysOfWeek ?? ([] as number[]),
      // Optional recurring window ("" = ongoing).
      effectiveFrom: schedule?.effectiveFrom
        ? scheduleDateKey(schedule.effectiveFrom)
        : "",
      effectiveTo: schedule?.effectiveTo
        ? scheduleDateKey(schedule.effectiveTo)
        : "",
    },
    onSubmit: async ({ value }) => {
      // Calendar-expanded pattern instances carry a synthetic id; edits must
      // target the underlying pattern row via patternId.
      const targetId = schedule?.patternId ?? schedule?.id ?? "";

      try {
        if (isEdit && value.repeat) {
          await updateMutation.mutateAsync({
            id: targetId,
            data: toRecurringUpdate(value),
          });
        } else if (isEdit) {
          await updateMutation.mutateAsync({
            id: targetId,
            data: toDatedUpdate(value),
          });
        } else if (value.repeat) {
          await recurringMutation.mutateAsync(toRecurringCreate(value));
        } else {
          await createMutation.mutateAsync(toDatedCreate(value));
        }
        closeModal();
      } catch {
        // Errors are surfaced through the mutation's onError toast.
      }
    },
  });

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    recurringMutation.isPending;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-6 px-2"
    >
      {/* ── Assignment ─────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Assignment
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Branch — fixed after creation. */}
          {isEdit ? (
            <div className="space-y-2">
              <Label>Branch</Label>
              <p className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm">
                {schedule?.branch.name}
              </p>
            </div>
          ) : (
            <form.Field
              name="branchId"
              validators={{
                onChange: ({ value }) =>
                  !value ? "Branch is required" : undefined,
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <Label>
                    Branch<span className="text-destructive"> *</span>
                  </Label>
                  <Combobox
                    options={branchOptions}
                    value={field.state.value || null}
                    onValueChange={(value) => field.handleChange(value ?? "")}
                    placeholder="Select a branch"
                    isLoading={branchesLoading}
                    className="w-full"
                  />
                  {fieldError(field) && (
                    <p className="text-sm font-medium text-destructive">
                      {fieldError(field)}
                    </p>
                  )}
                </div>
              )}
            </form.Field>
          )}

          <form.Field
            name="userId"
            validators={{
              onChange: ({ value }) =>
                !value ? "Employee is required" : undefined,
            }}
          >
            {(field) => (
              <div className="space-y-2">
                <Label>
                  Employee<span className="text-destructive"> *</span>
                </Label>
                <Combobox
                  options={staffOptions}
                  value={field.state.value || null}
                  onValueChange={(value) => field.handleChange(value ?? "")}
                  placeholder="Select an employee"
                  isLoading={staffLoading}
                  className="w-full"
                />
                {fieldError(field) && (
                  <p className="text-sm font-medium text-destructive">
                    {fieldError(field)}
                  </p>
                )}
              </div>
            )}
          </form.Field>
        </div>
      </section>

      {/* ── Timing ─────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Timing
        </h3>

        {/* Recurring toggle — create only (kind is fixed once created). */}
        {!isEdit && (
          <form.Field name="repeat">
            {(field) => (
              <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
                <SwitchField
                  label="Fixed weekly shift"
                  field={field}
                />
              </div>
            )}
          </form.Field>
        )}

        {/* Single date vs. weekly days. */}
        <form.Subscribe selector={(state) => state.values.repeat}>
          {(repeat) =>
            repeat ? (
              <div className="space-y-4">
              <form.Field
                name="daysOfWeek"
                validators={{
                  onChange: ({ value }) =>
                    value.length === 0 ? "Select at least one day" : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label>
                      Days<span className="text-destructive"> *</span>
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {WEEKDAYS.map((day) => {
                        const selected = field.state.value.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() =>
                              field.handleChange(
                                selected
                                  ? field.state.value.filter(
                                      (d) => d !== day.value
                                    )
                                  : [...field.state.value, day.value]
                              )
                            }
                            className={cn(
                              "h-9 w-11 rounded-md border text-sm font-medium transition-colors",
                              selected
                                ? "border-transparent bg-primary text-primary-foreground shadow-sm"
                                : "border-border/60 bg-background hover:bg-muted/60"
                            )}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Repeats every week on the selected days — no calendar date unless you select a specific date.
                    </p>
                    {fieldError(field) && (
                      <p className="text-sm font-medium text-destructive">
                        {fieldError(field)}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              {/* Optional window — blank = repeats forever. */}
              <div className="grid gap-4 sm:grid-cols-2">
                <form.Field name="effectiveFrom">
                  {(field) => (
                    <DatePicker
                      id="effective-from"
                      label="Starts (optional)"
                      className="w-full"
                      placeholder="Open start"
                      date={parseDateInputValue(field.state.value)}
                      onDateChange={(date) =>
                        field.handleChange(date ? toDateInputValue(date) : "")
                      }
                    />
                  )}
                </form.Field>

                <form.Field
                  name="effectiveTo"
                  validators={{
                    onChange: ({ value }) => {
                      if (!value) return undefined;
                      const from = form.getFieldValue("effectiveFrom");
                      return from && value < from
                        ? "End date must be on or after the start date"
                        : undefined;
                    },
                  }}
                >
                  {(field) => (
                    <DatePicker
                      id="effective-to"
                      label="Ends (optional)"
                      className="w-full"
                      placeholder="Ongoing"
                      date={parseDateInputValue(field.state.value)}
                      error={fieldError(field)}
                      onDateChange={(date) =>
                        field.handleChange(date ? toDateInputValue(date) : "")
                      }
                    />
                  )}
                </form.Field>
              </div>
              </div>
            ) : (
              <form.Field
                name="date"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "Date is required" : undefined,
                }}
              >
                {(field) => (
                  <DatePicker
                    id="schedule-date"
                    label="Date"
                    required
                    className="w-full"
                    date={parseDateInputValue(field.state.value)}
                    error={fieldError(field)}
                    onDateChange={(date) =>
                      field.handleChange(date ? toDateInputValue(date) : "")
                    }
                  />
                )}
              </form.Field>
            )
          }
        </form.Subscribe>

        <div className="grid gap-4 sm:grid-cols-2">
          <form.Field
            name="startTime"
            validators={{
              onChange: ({ value }) =>
                !value ? "Start time is required" : undefined,
            }}
          >
            {(field) => (
              <TimePicker
                id="start-time"
                label="Start time"
                required
                className="w-full"
                value={field.state.value}
                error={fieldError(field)}
                onChange={(value) => field.handleChange(value)}
              />
            )}
          </form.Field>

          <form.Field
            name="endTime"
            validators={{
              onChange: ({ value }) => {
                if (!value) return "End time is required";
                const start = form.getFieldValue("startTime");
                return start && value <= start
                  ? "End time must be after start time"
                  : undefined;
              },
            }}
          >
            {(field) => (
              <TimePicker
                id="end-time"
                label="End time"
                required
                className="w-full"
                value={field.state.value}
                error={fieldError(field)}
                onChange={(value) => field.handleChange(value)}
              />
            )}
          </form.Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
          <form.Field
            name="breakMinutes"
            validators={{
              onChange: ({ value }) => {
                const minutes = Number(value);
                return Number.isInteger(minutes) && minutes >= 0
                  ? undefined
                  : "Break must be 0 or more minutes";
              },
            }}
          >
            {(field) => (
              <InputField
                label="Break (minutes)"
                field={field}
                type="number"
                min={0}
                inputMode="numeric"
                subLabel="Unpaid break subtracted from paid hours."
              />
            )}
          </form.Field>

          {/* Live paid-hours preview. */}
          <form.Subscribe
            selector={(state) => ({
              startTime: state.values.startTime,
              endTime: state.values.endTime,
              breakMinutes: state.values.breakMinutes,
            })}
          >
            {({ startTime, endTime, breakMinutes }) => {
              const label = paidHoursLabel(
                startTime,
                endTime,
                Number(breakMinutes) || 0
              );
              return (
                <div className="space-y-2">
                  <Label>Paid hours</Label>
                  <div className="flex h-9 items-center rounded-md border border-border/60 bg-muted/30 px-3 text-sm font-medium">
                    {label ?? "—"}
                  </div>
                </div>
              );
            }}
          </form.Subscribe>
        </div>
      </section>

      {/* ── Notes ──────────────────────────────────────────────────────── */}
      <form.Field name="notes">
        {(field) => (
          <TextareaField
            label="Notes"
            field={field}
            placeholder="Optional notes (max 500 characters)"
            maxLength={500}
            rows={3}
          />
        )}
      </form.Field>

      <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
        <Button type="button" variant="outline" onClick={closeModal}>
          Cancel
        </Button>
        <Button type="submit" isSubmitting={isPending} disabled={isPending}>
          {isEdit ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
};
