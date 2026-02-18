import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { shiftsApi } from "@/apis/shiftsApi";
import type {
  ApproveCloseDto,
  ClosePreviewDto,
  CloseShiftDto,
  CreateCashMovementDto,
  OpenShiftDto,
  ShiftFilters,
} from "@/dto/shift.dto";

const SHIFT_QUERY_KEY = ["shifts"];

export const shiftsKeys = {
  all: SHIFT_QUERY_KEY,
  list: (filters?: ShiftFilters) =>
    [...SHIFT_QUERY_KEY, "list", filters] as const,
  detail: (id: string) => [...SHIFT_QUERY_KEY, id] as const,
  current: (deviceId?: string, branchId?: string) =>
    [...SHIFT_QUERY_KEY, "current", deviceId, branchId] as const,
  xReport: (id: string) => [...SHIFT_QUERY_KEY, id, "x-report"] as const,
};

export const useShifts = (filters?: ShiftFilters) => {
  return useQuery({
    queryKey: shiftsKeys.list(filters),
    queryFn: () => shiftsApi.getShifts(filters),
  });
};

export const useShift = (id: string) => {
  return useQuery({
    queryKey: shiftsKeys.detail(id),
    queryFn: () => shiftsApi.getShift(id),
    enabled: !!id,
  });
};

export const useCurrentShift = (deviceId?: string, branchId?: string) => {
  return useQuery({
    queryKey: shiftsKeys.current(deviceId, branchId),
    queryFn: () => shiftsApi.getCurrentShift(deviceId, branchId),
    enabled: !!deviceId || !!branchId,
  });
};

export const useXReport = (id: string) => {
  return useQuery({
    queryKey: shiftsKeys.xReport(id),
    queryFn: () => shiftsApi.getXReport(id),
    enabled: !!id,
  });
};

export const useOpenShift = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: OpenShiftDto) => shiftsApi.openShift(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHIFT_QUERY_KEY });
    },
  });
};

export const useClosePreview = () => {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ClosePreviewDto }) =>
      shiftsApi.closePreview(id, data),
  });
};

export const useCloseShift = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CloseShiftDto }) =>
      shiftsApi.closeShift(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHIFT_QUERY_KEY });
    },
  });
};

export const useApproveClose = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApproveCloseDto }) =>
      shiftsApi.approveClose(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHIFT_QUERY_KEY });
    },
  });
};

export const useCreateCashMovement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      shiftId,
      data,
    }: {
      shiftId: string;
      data: CreateCashMovementDto;
    }) => shiftsApi.createCashMovement(shiftId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHIFT_QUERY_KEY });
    },
  });
};
