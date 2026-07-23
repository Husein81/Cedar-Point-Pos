import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui";
import type { PaginationResponse } from "@repo/types";
import { shiftScheduleApi } from "@/apis/shiftScheduleApi";
import type {
  CreateRecurringShiftScheduleInput,
  CreateShiftScheduleInput,
  ShiftScheduleBulkResult,
  ShiftScheduleQuery,
  ShiftScheduleRangeQuery,
  ShiftScheduleView,
  UpdateShiftScheduleInput,
} from "@/dto/shiftSchedule.dto";
import { extractErrorMessage } from "@/utils/error";

const SCHEDULE_KEY = ["shift-schedules"];

// ─── Queries ───

/** Paginated, filterable schedule list (list layout). */
export const useShiftScheduleList = (query?: ShiftScheduleQuery) => {
  return useQuery<PaginationResponse<ShiftScheduleView>>({
    queryKey: [...SCHEDULE_KEY, "list", query],
    queryFn: () => shiftScheduleApi.getList(query),
    staleTime: 60 * 1000,
  });
};

/**
 * Bounded calendar feed (calendar layout). Pass `null` to disable the query
 * (e.g. while the calendar view is not active or the range isn't ready).
 */
export const useShiftScheduleRange = (query: ShiftScheduleRangeQuery | null) => {
  return useQuery<ShiftScheduleView[]>({
    queryKey: [...SCHEDULE_KEY, "range", query],
    // `enabled` guarantees `query` is non-null when this runs.
    queryFn: () => shiftScheduleApi.getRange(query!),
    enabled: !!query,
    staleTime: 60 * 1000,
  });
};

// ─── Mutations ───

export const useCreateShiftSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation<ShiftScheduleView, Error, CreateShiftScheduleInput>({
    mutationFn: shiftScheduleApi.create,
    onSuccess: () => {
      toast.success("Schedule created");
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to create schedule"));
    },
  });
};

export const useCreateRecurringShiftSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ShiftScheduleView,
    Error,
    CreateRecurringShiftScheduleInput
  >({
    mutationFn: shiftScheduleApi.createRecurring,
    onSuccess: () => {
      toast.success("Recurring shift created");
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to create recurring shift"));
    },
  });
};

export const useUpdateShiftSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ShiftScheduleView,
    Error,
    { id: string; data: UpdateShiftScheduleInput }
  >({
    mutationFn: ({ id, data }) => shiftScheduleApi.update(id, data),
    onSuccess: () => {
      toast.success("Schedule updated");
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to update schedule"));
    },
  });
};

export const useDeleteShiftSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation<{ deleted: boolean }, Error, string>({
    mutationFn: shiftScheduleApi.delete,
    onSuccess: () => {
      toast.success("Schedule deleted");
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to delete schedule"));
    },
  });
};

export const useCancelShiftSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation<ShiftScheduleView, Error, string>({
    mutationFn: shiftScheduleApi.cancel,
    onSuccess: () => {
      toast.success("Schedule cancelled");
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to cancel schedule"));
    },
  });
};

export const usePublishShiftSchedules = () => {
  const queryClient = useQueryClient();

  return useMutation<ShiftScheduleBulkResult, Error, string[]>({
    mutationFn: shiftScheduleApi.publish,
    onSuccess: (result) => {
      toast.success(`Published ${result.published ?? result.ids.length} schedule(s)`);
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to publish schedules"));
    },
  });
};

export const useUnpublishShiftSchedules = () => {
  const queryClient = useQueryClient();

  return useMutation<ShiftScheduleBulkResult, Error, string[]>({
    mutationFn: shiftScheduleApi.unpublish,
    onSuccess: (result) => {
      toast.success(
        `Unpublished ${result.unpublished ?? result.ids.length} schedule(s)`
      );
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to unpublish schedules"));
    },
  });
};
