import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/apis/dashboardApi";

export const useDashboardOverview = () => {
  return useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: () => dashboardApi.getOverview(),
  });
};

export const useDashboardFinance = () => {
  return useQuery({
    queryKey: ["dashboard", "finance"],
    queryFn: () => dashboardApi.getFinance(),
  });
};

export const useDashboardOperations = () => {
  return useQuery({
    queryKey: ["dashboard", "operations"],
    queryFn: () => dashboardApi.getOperations(),
  });
};

export const useDashboardAlerts = () => {
  return useQuery({
    queryKey: ["dashboard", "alerts"],
    queryFn: () => dashboardApi.getAlerts(),
  });
};

// Combined hook for fetching all dashboard data
export const useDashboard = () => {
  const overview = useDashboardOverview();
  const finance = useDashboardFinance();
  const operations = useDashboardOperations();
  const alerts = useDashboardAlerts();

  const isLoading =
    overview.isLoading ||
    finance.isLoading ||
    operations.isLoading ||
    alerts.isLoading;

  const error =
    overview.error || finance.error || operations.error || alerts.error;

  return {
    overview: overview.data ?? null,
    finance: finance.data ?? null,
    operations: operations.data ?? null,
    alerts: alerts.data ?? null,
    isLoading,
    error,
    // Expose individual query results for granular control
    queries: { overview, finance, operations, alerts },
  };
};
