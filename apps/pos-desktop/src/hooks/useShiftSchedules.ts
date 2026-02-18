import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { shiftsApi } from "@/apis/shiftsApi";
import type {
  CreateScheduleDto,
  PublishScheduleDto,
  ScheduleFilters,
  UpdateScheduleDto,
} from "@/dto/shift.dto";

const SCHEDULE_QUERY_KEY = ["shift-schedules"];

export const scheduleKeys = {
  all: SCHEDULE_QUERY_KEY,
  list: (filters?: ScheduleFilters) =>
    [...SCHEDULE_QUERY_KEY, "list", filters] as const,
  mine: (filters?: ScheduleFilters) =>
    [...SCHEDULE_QUERY_KEY, "mine", filters] as const,
  detail: (id: string) => [...SCHEDULE_QUERY_KEY, id] as const,
};

export const useSchedules = (filters?: ScheduleFilters) => {
  return useQuery({
    queryKey: scheduleKeys.list(filters),
    queryFn: () => shiftsApi.getSchedules(filters),
  });
};

export const useMySchedules = (filters?: ScheduleFilters) => {
  return useQuery({
    queryKey: scheduleKeys.mine(filters),
    queryFn: () => shiftsApi.getMySchedules(filters),
  });
};

export const useSchedule = (id: string) => {
  return useQuery({
    queryKey: scheduleKeys.detail(id),
    queryFn: () => shiftsApi.getSchedule(id),
    enabled: !!id,
  });
};

export const useCreateSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateScheduleDto) => shiftsApi.createSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_QUERY_KEY });
    },
  });
};

export const useUpdateSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateScheduleDto }) =>
      shiftsApi.updateSchedule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_QUERY_KEY });
    },
  });
};

export const useDeleteSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => shiftsApi.deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_QUERY_KEY });
    },
  });
};

export const usePublishSchedules = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PublishScheduleDto) => shiftsApi.publishSchedules(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_QUERY_KEY });
    },
  });
};

export const useUnpublishSchedules = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PublishScheduleDto) =>
      shiftsApi.unpublishSchedules(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_QUERY_KEY });
    },
  });
};
