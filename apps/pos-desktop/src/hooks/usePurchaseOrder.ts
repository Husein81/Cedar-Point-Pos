import { purchaseOrdersApi } from "@/apis/purchaseOrdersApi";
import type {
  CreatePurchaseOrderFormDto,
  PurchaseOrderDetails,
  PurchaseOrderSummary,
} from "@/dto/purchaseOrder.dto";
import type { PaginationResponse, QueryParams } from "@repo/types";
import { toast } from "@repo/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const PURCHASE_ORDER_QUERY_KEY = ["purchase-orders"];

export const usePurchaseOrdersPaginated = (
  params?: QueryParams & {
    status?: string;
    supplierId?: string;
    branchId?: string;
  }
) => {
  return useQuery<PaginationResponse<PurchaseOrderSummary>>({
    queryKey: [...PURCHASE_ORDER_QUERY_KEY, "paginated", params],
    queryFn: () => purchaseOrdersApi.getPurchaseOrdersPaginated(params),
    staleTime: 60 * 1000,
  });
};

export const usePurchaseOrder = (id: string | null) => {
  return useQuery<PurchaseOrderDetails>({
    queryKey: [...PURCHASE_ORDER_QUERY_KEY, id],
    queryFn: () => purchaseOrdersApi.getPurchaseOrder(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
};

export const useCreatePurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<PurchaseOrderDetails, Error, CreatePurchaseOrderFormDto>({
    mutationFn: purchaseOrdersApi.createPurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PURCHASE_ORDER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Purchase order created successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create purchase order");
    },
  });
};

export const useReceivePurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<PurchaseOrderDetails, Error, string>({
    mutationFn: purchaseOrdersApi.receivePurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PURCHASE_ORDER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Purchase order received. Inventory updated.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to receive purchase order");
    },
  });
};

export const useCancelPurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<PurchaseOrderDetails, Error, string>({
    mutationFn: purchaseOrdersApi.cancelPurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PURCHASE_ORDER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Purchase order cancelled");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to cancel purchase order");
    },
  });
};
