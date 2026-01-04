import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { dashboardApi } from "../apis/dashboardApi";
import type {
  DashboardSummary,
  WeeklySalesData,
  CategoryData,
  HourlyRevenueData,
  TopProductData,
} from "../types/dashboard";

/**
 * Dashboard React Query Hooks
 * Provides data fetching with caching, refetching, and error handling
 */

// Query keys for cache management
export const dashboardKeys = {
  all: ["dashboard"] as const,
  summary: (branchId?: string) =>
    [...dashboardKeys.all, "summary", branchId] as const,
  weeklySales: (branchId?: string) =>
    [...dashboardKeys.all, "weekly-sales", branchId] as const,
  salesByCategory: (from: Date, to: Date, branchId?: string) =>
    [
      ...dashboardKeys.all,
      "sales-by-category",
      from.toISOString(),
      to.toISOString(),
      branchId,
    ] as const,
  hourlyRevenue: (branchId?: string) =>
    [...dashboardKeys.all, "hourly-revenue", branchId] as const,
  topProducts: (from: Date, to: Date, branchId?: string, limit?: number) =>
    [
      ...dashboardKeys.all,
      "top-products",
      from.toISOString(),
      to.toISOString(),
      branchId,
      limit,
    ] as const,
};

interface DashboardQueryOptions {
  branchId?: string;
  enabled?: boolean;
}

/**
 * Hook to fetch dashboard summary
 * Refetches every 30 seconds for real-time updates
 */
export const useDashboardSummary = (
  options: DashboardQueryOptions = {}
): UseQueryResult<DashboardSummary, Error> => {
  const { branchId, enabled = true } = options;

  return useQuery({
    queryKey: dashboardKeys.summary(branchId),
    queryFn: () => dashboardApi.getSummary(branchId),
    refetchInterval: 30000, // 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
    enabled,
  });
};

/**
 * Hook to fetch weekly sales data
 * Refetches every minute
 */
export const useWeeklySales = (
  options: DashboardQueryOptions = {}
): UseQueryResult<WeeklySalesData[], Error> => {
  const { branchId, enabled = true } = options;

  return useQuery({
    queryKey: dashboardKeys.weeklySales(branchId),
    queryFn: () => dashboardApi.getWeeklySales(branchId),
    refetchInterval: 60000, // 1 minute
    staleTime: 30000,
    enabled,
  });
};

/**
 * Hook to fetch sales by category
 */
export const useSalesByCategory = (
  from: Date,
  to: Date,
  options: DashboardQueryOptions = {}
): UseQueryResult<CategoryData[], Error> => {
  const { branchId, enabled = true } = options;

  return useQuery({
    queryKey: dashboardKeys.salesByCategory(from, to, branchId),
    queryFn: () => dashboardApi.getSalesByCategory(from, to, branchId),
    refetchInterval: 60000,
    staleTime: 30000,
    enabled,
  });
};

/**
 * Hook to fetch hourly revenue
 * Refetches every minute for current day updates
 */
export const useHourlyRevenue = (
  options: DashboardQueryOptions = {}
): UseQueryResult<HourlyRevenueData[], Error> => {
  const { branchId, enabled = true } = options;

  return useQuery({
    queryKey: dashboardKeys.hourlyRevenue(branchId),
    queryFn: () => dashboardApi.getHourlyRevenue(branchId),
    refetchInterval: 60000,
    staleTime: 30000,
    enabled,
  });
};

/**
 * Hook to fetch top products
 */
export const useTopProducts = (
  from: Date,
  to: Date,
  options: DashboardQueryOptions & { limit?: number } = {}
): UseQueryResult<TopProductData[], Error> => {
  const { branchId, limit = 5, enabled = true } = options;

  return useQuery({
    queryKey: dashboardKeys.topProducts(from, to, branchId, limit),
    queryFn: () => dashboardApi.getTopProducts(from, to, branchId, limit),
    refetchInterval: 60000,
    staleTime: 30000,
    enabled,
  });
};
