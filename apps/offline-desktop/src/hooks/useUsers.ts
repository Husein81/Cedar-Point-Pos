import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui";
import { invoke } from "@/lib/ipc";
import { extractErrorMessage } from "@/utils/error";
import type { UpdateUserInput, UserInput } from "@/shared/schemas";

const USERS_QUERY_KEY = ["users"];

export const useUsers = () =>
  useQuery({
    queryKey: USERS_QUERY_KEY,
    queryFn: () => invoke("users:list", undefined),
  });

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UserInput) => invoke("users:create", input),
    onSuccess: (user) => {
      toast.success(`Employee "${user.name}" created`);
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to create employee"));
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) =>
      invoke("users:update", { id, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to update employee"));
    },
  });
};

export const useDeactivateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invoke("users:deactivate", { id }),
    onSuccess: () => {
      toast.success("Employee deactivated");
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to deactivate employee"));
    },
  });
};
