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

/**
 * Hook to compute stock warnings for all cart items
 *
 * This hook:
 * - Fetches current inventory for each product in the cart (branch-scoped)
 * - Calculates resulting stock after the sale
 * - Returns warning info for items that would go negative
 *
 * IMPORTANT: This is READ-ONLY - does NOT mutate inventory
 */
export const useCartStockWarnings = () => {
  const { branchId } = useBranchStore();
  const order = useOrderStore((state) => state.getActiveOrder());

  const items = order?.items ?? [];

  // Fetch inventory for each unique product in the cart
  const inventoryQueries = useQueries({
    queries: items.map((item) => ({
      queryKey: ["stock", "item", branchId, item.productId],
      queryFn: async () => {
        if (!branchId) return null;
        try {
          return await stockApi.getInventoryItem(branchId, item.productId);
        } catch {
          return null;
        }
      },
      enabled: !!branchId && !!item.productId,
      staleTime: 30 * 1000, // 30 seconds - balance between freshness and performance
      retry: false, // Don't retry on 404 (no inventory record)
    })),
  });

  // Compute warnings for each cart item
  const warnings = useMemo(() => {
    const warningsMap = new Map<string, StockWarning>();

    items.forEach((item, index) => {
      const query = inventoryQueries[index];
      const inventory = query?.data;

      // Current stock from inventory (0 if no record)
      const currentStock = inventory ? Number(inventory.stock) : 0;
      const noInventoryRecord = !inventory;

      // Cart quantity for this product
      const cartQuantity = item.quantity;

      // Calculate resulting stock
      const resultingStock = currentStock - cartQuantity;
      const isNegative = resultingStock <= 0;

      warningsMap.set(item.productId, {
        productId: item.productId,
        currentStock,
        cartQuantity,
        resultingStock,
        isNegative,
        noInventoryRecord,
      });
    });

    return warningsMap;
  }, [items, inventoryQueries]);

  // Helper to get warning for a specific product
  const getWarning = (productId: string): StockWarning | null => {
    return warnings.get(productId) ?? null;
  };

  // Check if any item has a negative stock warning
  const hasAnyWarning = useMemo(() => {
    return Array.from(warnings.values()).some((w) => w.isNegative);
  }, [warnings]);

  // Loading state (any query still loading)
  const isLoading = inventoryQueries.some((q) => q.isLoading);

  return {
    warnings,
    getWarning,
    hasAnyWarning,
    isLoading,
  };
};

export const useCartItemStockWarning = (productId: string) => {
  const { branchId } = useBranchStore();
  const order = useOrderStore((state) => state.getActiveOrder());

  // Find the cart item to get quantity
  const cartItem = order?.items.find((i) => i.productId === productId);
  const cartQuantity = cartItem?.quantity ?? 0;

  // Fetch inventory for this product
  const { data: inventory, isLoading } = useQueries({
    queries: [
      {
        queryKey: ["stock", "item", branchId, productId],
        queryFn: async () => {
          if (!branchId) return null;
          try {
            return await stockApi.getInventoryItem(branchId, productId);
          } catch {
            // Product has no inventory record - treat as 0 stock
            return null;
          }
        },
        enabled: !!branchId && !!productId,
        staleTime: 30 * 1000, // 30 seconds
        retry: false,
      },
    ],
  })[0];

  // Calculate warning
  const warning = useMemo((): StockWarning | null => {
    if (!productId) return null;

    const currentStock = inventory ? Number(inventory.stock) : 0;
    const noInventoryRecord = !inventory;
    const resultingStock = currentStock - cartQuantity;
    const isNegative = resultingStock < 0;

    return {
      productId,
      currentStock,
      cartQuantity,
      resultingStock,
      isNegative,
      noInventoryRecord,
    };
  }, [productId, inventory, cartQuantity]);

  return {
    warning,
    isLoading,
  };
};
