import { useState, useEffect, useMemo } from "react";
import { Button, Icon, Input, Select, Shad, Textarea } from "@repo/ui";
import { useBranchStore } from "@/store/branchStore";
import {
  useCreateSchedule,
  useUpdateSchedule,
} from "@/hooks/useShiftSchedules";
import { useTenantUsers } from "@/hooks/useTenantUsers";
import { useDevices } from "@/hooks/useDevices";
import type { ShiftSchedule } from "@repo/types";
import { toast } from "sonner";
import axios from "axios";

interface ShiftScheduleFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  schedule?: ShiftSchedule | null;
}

const NO_DEVICE_OPTION_VALUE = "__NO_DEVICE__";

const toDateInputValue = (date: Date | string) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toTimeInputValue = (date: Date | string) => {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const buildLocalDateTime = (dateStr: string, timeStr: string) => {
  const [year = 0, month = 1, day = 1] = dateStr.split("-").map(Number);
  const [hour = 0, minute = 0] = timeStr.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
};

const normalizeScheduleDate = (startTime: Date) => {
  const d = new Date(startTime);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[] }
      | undefined;
    if (Array.isArray(data?.message)) return data.message.join(", ");
    if (typeof data?.message === "string") return data.message;
  }
  if (error instanceof Error) return error.message;
  return "Operation failed";
};

export const ShiftScheduleFormDialog = ({
  isOpen,
  onClose,
  schedule,
}: ShiftScheduleFormDialogProps) => {
  const isEdit = !!schedule;
  const { branchId } = useBranchStore();

  const [userId, setUserId] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [notes, setNotes] = useState("");

  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();

  const { data: users = [] } = useTenantUsers();
  const { data: devices = [] } = useDevices(branchId ?? undefined);

  const userOptions = useMemo(
    () =>
      users.map((u) => ({
        value: u.id,
        label: `${u.name} (${u.role})`,
      })),
    [users],
  );

  const deviceOptions = useMemo(
    () => [
      { value: NO_DEVICE_OPTION_VALUE, label: "No device" },
      ...devices
        .filter((d) => !d.isKDS)
        .map((d) => ({
          value: d.id,
          label: d.name,
        })),
    ],
    [devices],
  );

  const isSubmitting = createSchedule.isPending || updateSchedule.isPending;

  useEffect(() => {
    if (isOpen && schedule) {
      setUserId(schedule.userId);
      setDeviceId(schedule.deviceId ?? "");
      setDate(toDateInputValue(schedule.startTime));
      setStartTime(toTimeInputValue(schedule.startTime));
      setEndTime(toTimeInputValue(schedule.endTime));
      setNotes(schedule.notes ?? "");
    } else if (isOpen && !schedule) {
      setUserId("");
      setDeviceId("");
      setDate(toDateInputValue(new Date()));
      setStartTime("09:00");
      setEndTime("17:00");
      setNotes("");
    }
  }, [isOpen, schedule]);

  const handleSubmit = async () => {
    if (!userId.trim()) {
      toast.error("Please select a user");
      return;
    }
    if (!date) {
      toast.error("Date is required");
      return;
    }
    if (!startTime || !endTime) {
      toast.error("Start time and end time are required");
      return;
    }

    const startTimeVal = buildLocalDateTime(date, startTime);
    const endTimeVal = buildLocalDateTime(date, endTime);
    const dateVal = normalizeScheduleDate(startTimeVal);

    if (endTimeVal <= startTimeVal) {
      toast.error("End time must be after start time");
      return;
    }

    try {
      if (isEdit && schedule) {
        await updateSchedule.mutateAsync({
          id: schedule.id,
          data: {
            userId: userId.trim(),
            deviceId: deviceId.trim() || null,
            date: dateVal,
            startTime: startTimeVal,
            endTime: endTimeVal,
            notes: notes.trim() || null,
          },
        });
        toast.success("Schedule updated successfully");
      } else {
        if (!branchId) {
          toast.error("No branch selected");
          return;
        }
        await createSchedule.mutateAsync({
          branchId,
          userId: userId.trim(),
          deviceId: deviceId.trim() || undefined,
          date: dateVal,
          startTime: startTimeVal,
          endTime: endTimeVal,
          notes: notes.trim() || undefined,
        });
        toast.success("Schedule created successfully");
      }
      onClose();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <Shad.Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Shad.DialogContent className="max-w-md">
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

        <div className="space-y-4 py-2">
          {/* User */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Assigned User *</label>
            <Select
              value={userId}
              onChange={(opt) => setUserId(opt.value)}
              options={userOptions}
              placeholder="Select a user"
            />
          </div>

          {/* Device */}
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

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Date *</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Start Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Start Time *</label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            {/* End Time */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">End Time *</label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
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

        <Shad.DialogFooter>
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
