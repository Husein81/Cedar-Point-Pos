import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui";
import { invoke } from "@/lib/ipc";
import { extractErrorMessage } from "@/utils/error";
import type {
  ListStockMovementsInput,
  StockAdjustmentInput,
  StockPurchaseInput,
} from "@/shared/schemas";

const STOCK_QUERY_KEY = ["stock"];
const PRODUCT_QUERY_KEY = ["products"];

export const useStockMovements = (params: ListStockMovementsInput) =>
  useQuery({
    queryKey: [...STOCK_QUERY_KEY, "movements", params],
    queryFn: () => invoke("stock:movements", params),
    placeholderData: (previous) => previous,
  });

export const useAdjustStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: StockAdjustmentInput) => invoke("stock:adjust", input),
    onSuccess: () => {
      toast.success("Stock adjusted");
      queryClient.invalidateQueries({ queryKey: STOCK_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to adjust stock"));
    },
  });
};

export const usePurchaseStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: StockPurchaseInput) => invoke("stock:purchase", input),
    onSuccess: () => {
      toast.success("Purchase recorded");
      queryClient.invalidateQueries({ queryKey: STOCK_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to record purchase"));
    },
  });
};
