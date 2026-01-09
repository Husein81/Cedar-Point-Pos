import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customerApi } from "@/apis/customerApi";
import type {
  CreateCustomerDto,
  CustomerDetails,
  CustomerSummary,
} from "@/dto/customer.dto";
import type { PaginationResponse, QueryParams } from "@repo/types";

const CUSTOMER_QUERY_KEY = ["customers"];

/**
 * Hook for searching customers with debounced query (Legacy/Autocomplete)
 */
export const useSearchCustomers = (
  query: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: [...CUSTOMER_QUERY_KEY, "search", query],
    queryFn: () => customerApi.searchCustomers(query, 10),
    enabled: enabled,
    staleTime: 30 * 1000, // 30 seconds - customer data doesn't change often
    gcTime: 5 * 60 * 1000, // 5 minutes cache
  });
};

/**
 * Hook for fetching paginated customers
 */
export const useCustomersPaginated = (params?: QueryParams) => {
  return useQuery<PaginationResponse<CustomerDetails>>({
    queryKey: [...CUSTOMER_QUERY_KEY, "paginated", params],
    queryFn: () => customerApi.getCustomersPaginated(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook for fetching a single customer's details
 */
export const useCustomer = (id: string | null) => {
  return useQuery<CustomerDetails>({
    queryKey: [...CUSTOMER_QUERY_KEY, id],
    queryFn: () => customerApi.getCustomer(id!),
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
  });
};

/**
 * Hook for creating a new customer
 */
export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation<CustomerSummary, Error, CreateCustomerDto>({
    mutationFn: customerApi.createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEY });
    },
  });
};

/**
 * Hook for updating a customer
 */
export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation<
    CustomerDetails,
    Error,
    { id: string; data: Partial<CreateCustomerDto> }
  >({
    mutationFn: ({ id, data }) => customerApi.updateCustomer(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...CUSTOMER_QUERY_KEY, data.id],
      });
    },
  });
};

/**
 * Hook for deleting a customer
 */
export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: customerApi.deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEY });
    },
  });
};
