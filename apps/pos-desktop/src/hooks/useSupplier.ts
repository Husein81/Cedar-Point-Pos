import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supplierApi } from "@/apis/supplierApi";
import type {
  CreateSupplierDto,
  SupplierDetails,
  SupplierFullDetails,
  SupplierPurchaseOrder,
  SupplierSummary,
  UpdateSupplierDto,
} from "@/dto/supplier.dto";
import type { PaginationResponse, QueryParams } from "@repo/types";

const SUPPLIER_QUERY_KEY = ["suppliers"];

/**
 * Hook for searching suppliers (autocomplete)
 */
export const useSearchSuppliers = (query: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: [...SUPPLIER_QUERY_KEY, "search", query],
    queryFn: () => supplierApi.searchSuppliers(query, 10),
    enabled: enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

/**
 * Hook for fetching paginated suppliers
 */
export const useSuppliersPaginated = (params?: QueryParams) => {
  return useQuery<PaginationResponse<SupplierDetails>>({
    queryKey: [...SUPPLIER_QUERY_KEY, "paginated", params],
    queryFn: () => supplierApi.getSuppliersPaginated(params),
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook for fetching a single supplier's full details with stats
 */
export const useSupplier = (id: string | null) => {
  return useQuery<SupplierFullDetails>({
    queryKey: [...SUPPLIER_QUERY_KEY, id],
    queryFn: () => supplierApi.getSupplier(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
};

/**
 * Hook for fetching a supplier's purchase orders with pagination
 */
export const useSupplierPurchaseOrders = (
  id: string | null,
  params?: QueryParams
) => {
  return useQuery<PaginationResponse<SupplierPurchaseOrder>>({
    queryKey: [...SUPPLIER_QUERY_KEY, id, "purchase-orders", params],
    queryFn: () => supplierApi.getSupplierPurchaseOrders(id!, params),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
};

/**
 * Hook for creating a new supplier
 */
export const useCreateSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation<SupplierSummary, Error, CreateSupplierDto>({
    mutationFn: supplierApi.createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUPPLIER_QUERY_KEY });
    },
  });
};

/**
 * Hook for updating a supplier
 */
export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation<
    SupplierDetails,
    Error,
    { id: string; data: UpdateSupplierDto }
  >({
    mutationFn: ({ id, data }) => supplierApi.updateSupplier(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: SUPPLIER_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...SUPPLIER_QUERY_KEY, data.id],
      });
    },
  });
};

/**
 * Hook for deleting a supplier (soft delete)
 */
export const useDeleteSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: supplierApi.deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUPPLIER_QUERY_KEY });
    },
  });
};
