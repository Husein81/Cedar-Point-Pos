import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { devicesApi } from "@/apis/devicesApi";
import type { CreatePOSDeviceDto } from "@/apis/devicesApi";

const DEVICES_QUERY_KEY = ["devices"];

export const devicesKeys = {
  all: DEVICES_QUERY_KEY,
  list: (branchId?: string) =>
    [...DEVICES_QUERY_KEY, "list", branchId] as const,
};

export const useDevices = (branchId?: string) => {
  return useQuery({
    queryKey: devicesKeys.list(branchId),
    queryFn: () => devicesApi.getDevices(branchId),
    enabled: !!branchId,
  });
};

export const useCreateDevice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePOSDeviceDto) => devicesApi.createDevice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: devicesKeys.all });
    },
  });
};
