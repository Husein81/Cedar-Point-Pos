import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui";
import { invoke } from "@/lib/ipc";
import { extractErrorMessage } from "@/utils/error";
import type { ColorInput } from "@/shared/schemas";

const COLOR_QUERY_KEY = ["colors"];

export const useColors = () =>
  useQuery({
    queryKey: COLOR_QUERY_KEY,
    queryFn: () => invoke("colors:list", undefined),
    staleTime: 10 * 60 * 1000,
  });

export const useCreateColor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ColorInput) => invoke("colors:create", input),
    onSuccess: (data) => {
      toast.success(`Color "${data.name}" created`);
      queryClient.invalidateQueries({ queryKey: COLOR_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to create color"));
    },
  });
};

export const useUpdateColor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ColorInput }) =>
      invoke("colors:update", { id, data }),
    onSuccess: () => {
      toast.success("Color updated");
      queryClient.invalidateQueries({ queryKey: COLOR_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to update color"));
    },
  });
};

export const useDeleteColor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invoke("colors:delete", { id }),
    onSuccess: () => {
      toast.success("Color deleted");
      queryClient.invalidateQueries({ queryKey: COLOR_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to delete color"));
    },
  });
};

export const useSeedColors = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => invoke("colors:seedDefaults", undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COLOR_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(
        extractErrorMessage(error, "Failed to generate default colors"),
      );
    },
  });
};
