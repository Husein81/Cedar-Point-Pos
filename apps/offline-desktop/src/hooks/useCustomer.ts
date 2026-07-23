import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui";
import { invoke } from "@/lib/ipc";
import { extractErrorMessage } from "@/utils/error";
import type { CustomerInput, ListCustomersInput } from "@/shared/schemas";

const CUSTOMER_QUERY_KEY = ["customers"];

export const useCustomers = (params: ListCustomersInput) =>
  useQuery({
    queryKey: [...CUSTOMER_QUERY_KEY, params],
    queryFn: () => invoke("customers:list", params),
    placeholderData: (previous) => previous,
  });

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CustomerInput) => invoke("customers:create", input),
    onSuccess: (data) => {
      toast.success(`Customer "${data.name}" created`);
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to create customer"));
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CustomerInput }) =>
      invoke("customers:update", { id, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to update customer"));
    },
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invoke("customers:delete", { id }),
    onSuccess: () => {
      toast.success("Customer deleted");
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to delete customer"));
    },
  });
};
