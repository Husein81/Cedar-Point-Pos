import {
  Button,
  DatePicker,
  Icon,
  Select,
  Shad,
  Switch,
  Textarea,
} from "@repo/ui";
import type { ShiftScheduleFormDialogProps } from "@/dto/shift.dto";
import { useShiftScheduleForm } from "./useShiftScheduleForm";

const MAX_RANGE_DAYS = 60;

export const ShiftScheduleFormDialog = ({
  isOpen,
  onClose,
  schedule,
}: ShiftScheduleFormDialogProps) => {
  const {
    isEdit,
    branchId,

    userId,
    setUserId,
    deviceId,
    setDeviceId,
    date,
    setDate,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    notes,
    setNotes,
    dateMode,
    complexMode,
    setComplexMode,
    rangeStartDate,
    setRangeStartDate,
    rangeEndDate,
    setRangeEndDate,
    dayOverrides,

    userSectionRef,
    dateSectionRef,
    rangeSectionRef,
    timeSectionRef,

    userOptions,
    deviceOptions,
    timeOptions,
    rangeDays,
    rangeExceedsLimit,
    isSubmitting,

    handleDateModeChange,
    getEffectiveTimesForDay,
    updateOverride,
    clearOverride,
    focusFirstInteractive,
    handleSubmit,

    NO_DEVICE_OPTION_VALUE,
  } = useShiftScheduleForm({ isOpen, onClose, schedule });

  return (
    <Shad.Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Shad.DialogContent
        className="max-w-md"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          window.setTimeout(
            () => focusFirstInteractive(userSectionRef.current),
            0,
          );
        }}
      >
        <Shad.DialogHeader>
          <Shad.DialogTitle>
            <div className="flex items-center gap-2">
              <Icon name="CalendarPlus" className="h-5 w-5" />
              {isEdit ? "Edit Schedule" : "Create Schedule"}
            </div>
          </Shad.DialogTitle>
          <Shad.DialogDescription>
            {isEdit
              ? "Update the shift schedule details."
              : "Create a new shift schedule for a team member."}
          </Shad.DialogDescription>
        </Shad.DialogHeader>

        <Shad.ScrollArea className="max-h-[calc(85vh-10rem)] pr-2">
          <div className="space-y-4 py-2 pb-3">
            <div ref={userSectionRef} className="space-y-1.5">
              <label className="text-sm font-medium">Assigned User *</label>
              <Select
                value={userId}
                onChange={(opt) => setUserId(opt.value)}
                options={userOptions}
                placeholder="Select a user"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Device</label>
              <Select
                value={deviceId}
                onChange={(opt) =>
                  setDeviceId(
                    opt.value === NO_DEVICE_OPTION_VALUE ? "" : opt.value,
                  )
                }
                options={deviceOptions}
                placeholder="Select a device (optional)"
              />
            </div>

            {!isEdit ? (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Schedule Mode *</label>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={dateMode === "single" ? "default" : "outline"}
                    onClick={() => handleDateModeChange("single")}
                    disabled={isSubmitting}
                  >
                    Single Date
                  </Button>
                  <Button
                    size="sm"
                    variant={dateMode === "range" ? "default" : "outline"}
                    onClick={() => handleDateModeChange("range")}
                    disabled={isSubmitting}
                  >
                    Date Range
                  </Button>
                </div>
              </div>
            ) : null}

            {isEdit || dateMode === "single" ? (
              <div ref={dateSectionRef} className="space-y-1.5">
                <label className="text-sm font-medium">Date *</label>
                <DatePicker date={date} onDateChange={setDate} />
              </div>
            ) : (
              <div ref={rangeSectionRef} className="space-y-1.5">
                <label className="text-sm font-medium">Date Range *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">
                      Start Date
                    </label>
                    <DatePicker
                      date={rangeStartDate}
                      onDateChange={setRangeStartDate}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">
                      End Date
                    </label>
                    <DatePicker
                      date={rangeEndDate}
                      onDateChange={setRangeEndDate}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {rangeDays.length} day(s) selected (max {MAX_RANGE_DAYS} days)
                </p>
              </div>
            )}

            <div
              ref={timeSectionRef}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <div className="space-y-1.5 min-w-0">
                <label className="text-sm font-medium">
                  {dateMode === "range" && !isEdit
                    ? "Base Start Time *"
                    : "Start Time *"}
                </label>
                <Select
                  value={startTime}
                  onChange={(opt) => setStartTime(opt.value)}
                  options={timeOptions}
                  className="w-full"
                  side="bottom"
                  position="popper"
                />
              </div>

              <div className="space-y-1.5 min-w-0">
                <label className="text-sm font-medium">
                  {dateMode === "range" && !isEdit
                    ? "Base End Time *"
                    : "End Time *"}
                </label>
                <Select
                  value={endTime}
                  onChange={(opt) => setEndTime(opt.value)}
                  options={timeOptions}
                  className="w-full"
                  side="bottom"
                  position="popper"
                />
              </div>
            </div>

            {!isEdit && dateMode === "range" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Complex Time Ranges</p>
                    <p className="text-xs text-muted-foreground">
                      Override start and end times for specific days.
                    </p>
                  </div>
                  <Switch
                    checked={complexMode}
                    onCheckedChange={(checked) =>
                      setComplexMode(checked === true)
                    }
                    disabled={rangeExceedsLimit || isSubmitting}
                  />
                </div>

                {complexMode && rangeDays.length > 0 && !rangeExceedsLimit ? (
                  <Shad.ScrollArea className="h-64 rounded-md border">
                    <div className="space-y-2 p-2 pr-3">
                      {rangeDays.map((day) => {
                        const dateKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
                        const effective = getEffectiveTimesForDay(dateKey);
                        const hasOverride = Boolean(dayOverrides[dateKey]);

                        return (
                          <div
                            key={dateKey}
                            className="rounded-md border p-2 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium">
                                {day.toLocaleDateString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </p>
                              {hasOverride ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2"
                                  onClick={() => clearOverride(dateKey)}
                                >
                                  <Icon
                                    name="RotateCcw"
                                    className="h-3.5 w-3.5 mr-1"
                                  />
                                  Reset
                                </Button>
                              ) : null}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-xs text-muted-foreground">
                                  Start
                                </label>
                                <Select
                                  value={effective.start}
                                  onChange={(opt) =>
                                    updateOverride(dateKey, "start", opt.value)
                                  }
                                  options={timeOptions}
                                  className="w-full"
                                  side="bottom"
                                  position="popper"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-xs text-muted-foreground">
                                  End
                                </label>
                                <Select
                                  value={effective.end}
                                  onChange={(opt) =>
                                    updateOverride(dateKey, "end", opt.value)
                                  }
                                  options={timeOptions}
                                  className="w-full"
                                  side="bottom"
                                  position="popper"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <Shad.ScrollBar />
                  </Shad.ScrollArea>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes (max 500 chars)"
                maxLength={500}
                rows={3}
              />
            </div>
          </div>
          <Shad.ScrollBar />
        </Shad.ScrollArea>

        <Shad.DialogFooter className="gap-2 pt-3 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            isSubmitting={isSubmitting}
            disabled={!isEdit && !branchId}
          >
            <Icon name={isEdit ? "Save" : "Plus"} className="h-4 w-4 mr-1" />
            {isEdit ? "Save Changes" : "Create Schedule"}
          </Button>
        </Shad.DialogFooter>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
};
