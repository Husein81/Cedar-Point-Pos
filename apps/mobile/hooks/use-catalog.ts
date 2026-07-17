import { useQuery } from "@tanstack/react-query";
import { catalogService } from "@/services/catalog";

/** Menu data changes rarely during a shift — cache aggressively so the menu
 * still renders from cache when the connection drops mid-service. */
const CATALOG_STALE_MS = 5 * 60 * 1000;

export function useProducts(branchId?: string | null) {
  return useQuery({
    queryKey: ["products", branchId ?? "all"],
    queryFn: () => catalogService.getProducts(branchId ?? undefined),
    staleTime: CATALOG_STALE_MS,
  });
}

export function useCategories(branchId?: string | null, search?: string) {
  return useQuery({
    queryKey: ["categories", branchId ?? "all", search ?? ""],
    queryFn: () => catalogService.getCategories(branchId, search),
    staleTime: CATALOG_STALE_MS,
  });
}
