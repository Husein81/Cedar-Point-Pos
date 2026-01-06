import { stockApi } from "@/apis/stockApi";
import {
  AdjustmentHistoryQuery,
  InventoryWithProduct,
  StockAdjustmentDto,
} from "@/dto/inventory.dto";
import type { PaginationResponse, QueryParams } from "@repo/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const STOCK_QUERY_KEY = ["stock"];
const ADJUSTMENT_HISTORY_KEY = ["adjustmentHistory"];

export const useInventoryByBranch = (
  branchId: string,
  params?: QueryParams
) => {
  return useQuery<PaginationResponse<InventoryWithProduct>>({
    queryKey: [...STOCK_QUERY_KEY, "branch", branchId],
    queryFn: () => stockApi.getInventoryByBranch(branchId, params),
    enabled: !!branchId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useInventoryItem = (branchId: string, productId: string) => {
  return useQuery<InventoryWithProduct>({
    queryKey: [...STOCK_QUERY_KEY, "item", branchId, productId],
    queryFn: () => stockApi.getInventoryItem(branchId, productId),
    enabled: !!branchId && !!productId,
  });
};

export const useAdjustStock = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, StockAdjustmentDto>({
    mutationFn: stockApi.adjustStock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STOCK_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ADJUSTMENT_HISTORY_KEY });
    },
  });
};

export const useAdjustmentHistory = (query: AdjustmentHistoryQuery) => {
  return useQuery({
    queryKey: [...ADJUSTMENT_HISTORY_KEY, query],
    queryFn: () => stockApi.getAdjustmentHistory(query),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useLowStock = (branchId?: string) => {
  return useQuery<PaginationResponse<InventoryWithProduct>>({
    queryKey: [...STOCK_QUERY_KEY, "low", branchId],
    queryFn: () => stockApi.getLowStock(branchId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useInventoryHistoryByBranch = (
  branchId: string,
  params?: {
    page?: number;
    limit?: number;
    productId?: string;
  }
) => {
  return useQuery({
    queryKey: [...ADJUSTMENT_HISTORY_KEY, "branch", branchId, params],
    queryFn: () => stockApi.getInventoryHistoryByBranch(branchId, params),
    enabled: !!branchId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};
