import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui";
import {
  createColor,
  deleteColor,
  getColors,
  seedColors,
  updateColor,
} from "@/apis/colorApi";
import { extractErrorMessage } from "@/utils/error";

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
    onSuccess: (data) => {
      toast.success(`Color "${data.name}" created`);
      queryClient.invalidateQueries({ queryKey: ["colors"] });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to create color"));
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
      toast.success("Color updated");
      queryClient.invalidateQueries({ queryKey: ["colors"] });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to update color"));
    },
  });
};

export const useDeleteColor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteColor,
    onSuccess: () => {
      toast.success("Color deleted");
      queryClient.invalidateQueries({ queryKey: ["colors"] });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to delete color"));
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
