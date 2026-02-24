import { useEffect, useMemo, useRef, useState } from "react";
import { useBranchStore } from "@/store/branchStore";
import {
  useCreateSchedule,
  useUpdateSchedule,
} from "@/hooks/useShiftSchedules";
import { useTenantUsers } from "@/hooks/useTenantUsers";
import { useDevices } from "@/hooks/useDevices";
import type {
  ScheduleBatchCreateResult,
  ScheduleDateMode,
  ScheduleTimeRangeOverride,
  ShiftScheduleFormDialogProps,
} from "@/dto/shift.dto";
import { toast } from "sonner";
import axios from "axios";

const NO_DEVICE_OPTION_VALUE = "__NO_DEVICE__";
const MAX_RANGE_DAYS = 60;

type DayOverrideState = Partial<
  Pick<ScheduleTimeRangeOverride, "start" | "end">
>;

const pad = (value: number) => String(value).padStart(2, "0");

const toTimeInputValue = (date: Date | string) => {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const toStartOfLocalDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const toLocalDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const fromLocalDateKey = (dateKey: string) => {
  const [year = 0, month = 1, day = 1] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

const enumerateDaysInclusive = (startDate: Date, endDate: Date) => {
  const start = toStartOfLocalDay(startDate);
  const end = toStartOfLocalDay(endDate);
  const days: Date[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
};

const buildLocalDateTime = (dateValue: Date, timeStr: string) => {
  const year = dateValue.getFullYear();
  const month = dateValue.getMonth() + 1;
  const day = dateValue.getDate();
  const [hour = 0, minute = 0] = timeStr.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
};

const buildScheduleDateTimes = (
  dateValue: Date,
  start: string,
  end: string,
) => {
  const startTime = buildLocalDateTime(dateValue, start);
  const endTime = buildLocalDateTime(dateValue, end);

  if (endTime > startTime) {
    return { startTime, endTime };
  }

  const nextDayEnd = new Date(endTime);
  nextDayEnd.setDate(nextDayEnd.getDate() + 1);
  return { startTime, endTime: nextDayEnd };
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

const BASE_TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? 0 : 30;
  const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const label = new Date(2000, 0, 1, hour, minute).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { value, label };
});

const toTimeLabel = (value: string) => {
  const [hour = "00", minute = "00"] = value.split(":");
  const h = Number(hour);
  const m = Number(minute);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const summarizeFailures = (failures: ScheduleBatchCreateResult["failures"]) => {
  const items = failures.slice(0, 3).map((failure) => {
    const date = fromLocalDateKey(failure.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return `${date}: ${failure.message}`;
  });

  if (failures.length > 3) {
    items.push(`+${failures.length - 3} more`);
  }

  return items.join(" | ");
};

export const useShiftScheduleForm = ({
  isOpen,
  onClose,
  schedule,
}: ShiftScheduleFormDialogProps) => {
  const isEdit = !!schedule;
  const { branchId } = useBranchStore();

  const [userId, setUserId] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [notes, setNotes] = useState("");
  const [dateMode, setDateMode] = useState<ScheduleDateMode>("single");
  const [rangeStartDate, setRangeStartDate] = useState<Date | undefined>(
    new Date(),
  );
  const [rangeEndDate, setRangeEndDate] = useState<Date | undefined>(
    new Date(),
  );
  const [complexMode, setComplexMode] = useState(false);
  const [dayOverrides, setDayOverrides] = useState<
    Record<string, DayOverrideState>
  >({});
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);
  const userSectionRef = useRef<HTMLDivElement | null>(null);
  const dateSectionRef = useRef<HTMLDivElement | null>(null);
  const rangeSectionRef = useRef<HTMLDivElement | null>(null);
  const timeSectionRef = useRef<HTMLDivElement | null>(null);

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

  const timeOptions = useMemo(() => {
    const options = [...BASE_TIME_OPTIONS];
    const extraTimes = [startTime, endTime].filter(
      (time) => !options.some((option) => option.value === time),
    );

    for (const time of extraTimes) {
      options.push({ value: time, label: toTimeLabel(time) });
    }

    return options.sort((a, b) => a.value.localeCompare(b.value));
  }, [startTime, endTime]);

  const rangeDays = useMemo(() => {
    if (!rangeStartDate || !rangeEndDate) return [];
    const start = toStartOfLocalDay(rangeStartDate);
    const end = toStartOfLocalDay(rangeEndDate);
    if (end < start) return [];
    return enumerateDaysInclusive(start, end);
  }, [rangeStartDate, rangeEndDate]);

  const rangeExceedsLimit = rangeDays.length > MAX_RANGE_DAYS;

  const isSubmitting =
    createSchedule.isPending || updateSchedule.isPending || isBatchSubmitting;

  useEffect(() => {
    if (isOpen && schedule) {
      const scheduleDate = new Date(schedule.startTime);
      setUserId(schedule.userId);
      setDeviceId(schedule.deviceId ?? "");
      setDate(scheduleDate);
      setStartTime(toTimeInputValue(schedule.startTime));
      setEndTime(toTimeInputValue(schedule.endTime));
      setNotes(schedule.notes ?? "");
      setDateMode("single");
      setRangeStartDate(scheduleDate);
      setRangeEndDate(scheduleDate);
      setComplexMode(false);
      setDayOverrides({});
    } else if (isOpen && !schedule) {
      const now = new Date();
      setUserId("");
      setDeviceId("");
      setDate(now);
      setStartTime("09:00");
      setEndTime("17:00");
      setNotes("");
      setDateMode("single");
      setRangeStartDate(now);
      setRangeEndDate(now);
      setComplexMode(false);
      setDayOverrides({});
    }
  }, [isOpen, schedule]);

  useEffect(() => {
    if (!complexMode) {
      setDayOverrides({});
      return;
    }

    const validKeys = new Set(rangeDays.map((day) => toLocalDateKey(day)));

    setDayOverrides((prev) => {
      let changed = false;
      const next: Record<string, DayOverrideState> = {};

      for (const [key, value] of Object.entries(prev)) {
        if (validKeys.has(key)) {
          next[key] = value;
        } else {
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [complexMode, rangeDays]);

  const handleDateModeChange = (mode: ScheduleDateMode) => {
    if (mode === dateMode) return;

    setDateMode(mode);
    setComplexMode(false);
    setDayOverrides({});

    if (mode === "range") {
      const baseDate = date ?? new Date();
      setRangeStartDate(baseDate);
      setRangeEndDate(baseDate);
      return;
    }

    if (rangeStartDate) {
      setDate(rangeStartDate);
    }
  };

  const getEffectiveTimesForDay = (dateKey: string) => {
    const override = dayOverrides[dateKey];
    return {
      start: override?.start ?? startTime,
      end: override?.end ?? endTime,
    };
  };

  const updateOverride = (
    dateKey: string,
    field: "start" | "end",
    value: string,
  ) => {
    setDayOverrides((prev) => ({
      ...prev,
      [dateKey]: {
        ...prev[dateKey],
        [field]: value,
      },
    }));
  };

  const clearOverride = (dateKey: string) => {
    setDayOverrides((prev) => {
      const next = { ...prev };
      delete next[dateKey];
      return next;
    });
  };

  const focusFirstInteractive = (container: HTMLElement | null) => {
    if (!container) return;
    const target = container.querySelector<HTMLElement>(
      'button,[role="combobox"],input,textarea,[tabindex]:not([tabindex="-1"])',
    );
    target?.focus();
  };

  const revealField = (ref: { current: HTMLDivElement | null }) => {
    if (!ref.current) return;
    ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => focusFirstInteractive(ref.current), 50);
  };

  const handleSubmit = async () => {
    if (!userId.trim()) {
      revealField(userSectionRef);
      toast.error("Please select a user");
      return;
    }

    if (!startTime || !endTime) {
      revealField(timeSectionRef);
      toast.error("Start time and end time are required");
      return;
    }

    try {
      if (isEdit && schedule) {
        if (!date) {
          revealField(dateSectionRef);
          toast.error("Date is required");
          return;
        }

        const { startTime: startTimeVal, endTime: endTimeVal } =
          buildScheduleDateTimes(date, startTime, endTime);
        const dateVal = normalizeScheduleDate(startTimeVal);

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
        onClose();
        return;
      }

      if (!branchId) {
        toast.error("No branch selected");
        return;
      }

      if (dateMode === "single") {
        if (!date) {
          revealField(dateSectionRef);
          toast.error("Date is required");
          return;
        }

        const { startTime: startTimeVal, endTime: endTimeVal } =
          buildScheduleDateTimes(date, startTime, endTime);
        const dateVal = normalizeScheduleDate(startTimeVal);

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
        onClose();
        return;
      }

      if (!rangeStartDate || !rangeEndDate) {
        revealField(rangeSectionRef);
        toast.error("Start date and end date are required");
        return;
      }

      const startDay = toStartOfLocalDay(rangeStartDate);
      const endDay = toStartOfLocalDay(rangeEndDate);

      if (endDay < startDay) {
        revealField(rangeSectionRef);
        toast.error("End date must be the same day or after start date");
        return;
      }

      const dates = enumerateDaysInclusive(startDay, endDay);

      if (dates.length === 0) {
        revealField(rangeSectionRef);
        toast.error("Date range is empty");
        return;
      }

      if (dates.length > MAX_RANGE_DAYS) {
        revealField(rangeSectionRef);
        toast.error(`Date range cannot exceed ${MAX_RANGE_DAYS} days`);
        return;
      }

      const result: ScheduleBatchCreateResult = {
        created: 0,
        failed: 0,
        failures: [],
      };

      setIsBatchSubmitting(true);

      for (const day of dates) {
        const dayKey = toLocalDateKey(day);
        const override = complexMode ? dayOverrides[dayKey] : undefined;
        const effectiveStart = override?.start ?? startTime;
        const effectiveEnd = override?.end ?? endTime;
        const { startTime: startTimeVal, endTime: endTimeVal } =
          buildScheduleDateTimes(day, effectiveStart, effectiveEnd);
        const dateVal = normalizeScheduleDate(startTimeVal);

        try {
          await createSchedule.mutateAsync({
            branchId,
            userId: userId.trim(),
            deviceId: deviceId.trim() || undefined,
            date: dateVal,
            startTime: startTimeVal,
            endTime: endTimeVal,
            notes: notes.trim() || undefined,
          });
          result.created += 1;
        } catch (error: unknown) {
          result.failed += 1;
          result.failures.push({
            date: dayKey,
            message: getErrorMessage(error),
          });
        }
      }

      if (result.failed === 0) {
        toast.success(`Created ${result.created} schedules successfully`);
        onClose();
        return;
      }

      const failureSummary = summarizeFailures(result.failures);

      if (result.created > 0) {
        toast.error(
          `Created ${result.created} schedules, ${result.failed} failed. ${failureSummary}`,
        );
        onClose();
        return;
      }

      toast.error(`Failed to create schedules. ${failureSummary}`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsBatchSubmitting(false);
    }
  };

  return {
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
  };
};
