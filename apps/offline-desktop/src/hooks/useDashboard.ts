import { useQuery } from "@tanstack/react-query";
import { invoke } from "@/lib/ipc";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  summary: () => [...dashboardKeys.all, "summary"] as const,
  weeklySales: () => [...dashboardKeys.all, "weekly-sales"] as const,
  salesByCategory: (from: Date, to: Date) =>
    [
      ...dashboardKeys.all,
      "sales-by-category",
      from.toISOString(),
      to.toISOString(),
    ] as const,
  hourlyRevenue: () => [...dashboardKeys.all, "hourly-revenue"] as const,
  topProducts: (from: Date, to: Date, limit?: number) =>
    [
      ...dashboardKeys.all,
      "top-products",
      from.toISOString(),
      to.toISOString(),
      limit,
    ] as const,
};

export const useDashboardSummary = () =>
  useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: () => invoke("dashboard:summary", undefined),
    refetchInterval: 30000,
    staleTime: 15000,
  });

export const useWeeklySales = () =>
  useQuery({
    queryKey: dashboardKeys.weeklySales(),
    queryFn: () => invoke("dashboard:weeklySales", undefined),
    refetchInterval: 60000,
    staleTime: 30000,
  });

export const useSalesByCategory = (from: Date, to: Date) =>
  useQuery({
    queryKey: dashboardKeys.salesByCategory(from, to),
    queryFn: () =>
      invoke("dashboard:salesByCategory", {
        from: from.toISOString(),
        to: to.toISOString(),
      }),
    refetchInterval: 60000,
    staleTime: 30000,
  });

export const useHourlyRevenue = () =>
  useQuery({
    queryKey: dashboardKeys.hourlyRevenue(),
    queryFn: () => invoke("dashboard:hourlyRevenue", undefined),
    refetchInterval: 60000,
    staleTime: 30000,
  });

export const useTopProducts = (from: Date, to: Date, limit = 5) =>
  useQuery({
    queryKey: dashboardKeys.topProducts(from, to, limit),
    queryFn: () =>
      invoke("dashboard:topProducts", {
        from: from.toISOString(),
        to: to.toISOString(),
        limit,
      }),
    refetchInterval: 60000,
    staleTime: 30000,
  });
