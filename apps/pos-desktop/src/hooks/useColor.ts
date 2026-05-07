import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createColor,
  deleteColor,
  getColors,
  seedColors,
  updateColor,
} from "@/apis/colorApi";

export const useColors = () => {
  return useQuery({
    queryKey: ["colors"],
    queryFn: getColors,
  });
};

export const useCreateColor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createColor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colors"] });
    },
  });
};

export const useUpdateColor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof updateColor>[1];
    }) => updateColor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colors"] });
    },
  });
};

export const useDeleteColor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteColor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colors"] });
    },
  });
};

export const useSeedColors = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: seedColors,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colors"] });
    },
  });
};
