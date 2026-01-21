import { useBranchStore } from "@/store/branchStore";
import { useOrderStore } from "@/store/orderStore";
import { stockApi } from "@/apis/stockApi";
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";

export type StockWarning = {
  productId: string;
  currentStock: number;
  cartQuantity: number;
  resultingStock: number;
  isNegative: boolean;
  noInventoryRecord: boolean;
};

export const useCartItemStockWarning = (productId: string) => {
  const { getWarning, isLoading } = useCartStockWarnings();

  return {
    warning: getWarning(productId),
    isLoading,
  };
};

export const useCartStockWarnings = () => {
  const { branchId } = useBranchStore();
  const order = useOrderStore((s) => s.getActiveOrder());
  const items = order?.items ?? [];


  const productIds = useMemo(
    () => [...new Set(items.map((i) => i.productId))],
    [items],
  );

  /**
   * Fetch inventory ONCE per unique product
   */
  const inventoryQueries = useQueries({
    queries: productIds.map((productId) => ({
      queryKey: ["stock", "item", branchId, productId],
      enabled: !!branchId && !!productId,
      staleTime: 30_000,
      retry: false,
      queryFn: async () => {
        try {
          return await stockApi.getInventoryItem(branchId!, productId);
        } catch {
          return null;
        }
      },
    })),
  });

  /**
   * Normalize inventory by productId
   */
  const inventoryMap = useMemo(() => {
    const map = new Map<string, number>();
    inventoryQueries.forEach((q, index) => {
      const productId = productIds[index];
      if (q.data) {
        map.set(productId!, Number(q.data.stock));
      }
    });
    return map;
  }, [inventoryQueries, productIds]);

  /**
   * Compute warnings
   */
  const warnings = useMemo(() => {
    const map = new Map<string, StockWarning>();

    items.forEach((item) => {
      const currentStock = inventoryMap.get(item.productId) ?? 0;
      const noInventoryRecord = !inventoryMap.has(item.productId);
      const cartQuantity = item.quantity;
      const resultingStock = currentStock - cartQuantity;

      map.set(item.productId, {
        productId: item.productId,
        currentStock,
        cartQuantity,
        resultingStock,
        isNegative: resultingStock < 0,
        noInventoryRecord,
      });
    });

    return map;
  }, [items, inventoryMap]);

  const hasAnyWarning = useMemo(
    () => Array.from(warnings.values()).some((w) => w.isNegative),
    [warnings],
  );

  const getWarning = (productId: string) => warnings.get(productId) ?? null;

  const isLoading = inventoryQueries.some((q) => q.isLoading);

  return {
    warnings,
    getWarning,
    hasAnyWarning,
    isLoading,
  };
};
