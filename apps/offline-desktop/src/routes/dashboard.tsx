import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import TitleBar from "@/components/title-bar";
import { Button } from "@repo/ui";
import { formatMoney } from "@/utils/format";
import { useSettings } from "@/hooks/useSettings";
import {
  HourlyRevenueChart,
  SalesByCategoryChart,
  SummaryGrid,
  TopProductsChart,
  WeeklySalesChart,
} from "@/components/dashboard";
import {
  dashboardKeys,
  useDashboardSummary,
  useHourlyRevenue,
  useSalesByCategory,
  useTopProducts,
  useWeeklySales,
} from "@/hooks/useDashboard";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

/** Category and top-product charts cover this trailing window */
const RANGE_DAYS = 30;

function DashboardPage() {
  const queryClient = useQueryClient();
  const { data: settings } = useSettings();
  const currencySymbol = settings?.currencySymbol ?? "$";

  const dateRange = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - RANGE_DAYS);
    return { from, to };
  }, []);

  const summaryQuery = useDashboardSummary();
  const weeklySalesQuery = useWeeklySales();
  const categoryQuery = useSalesByCategory(dateRange.from, dateRange.to);
  const hourlyRevenueQuery = useHourlyRevenue();
  const topProductsQuery = useTopProducts(dateRange.from, dateRange.to);

  const { data: summary } = summaryQuery;

  const isRefreshing = [
    summaryQuery,
    weeklySalesQuery,
    categoryQuery,
    hourlyRevenueQuery,
    topProductsQuery,
  ].some((query) => query.isFetching);

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  };

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const lastUpdatedAt = summaryQuery.dataUpdatedAt
    ? new Date(summaryQuery.dataUpdatedAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const summaryItems = [
    {
      title: "Today's Revenue",
      value: formatMoney(summary?.totalRevenue ?? 0, currencySymbol),
      icon: "DollarSign",
      subtitle: "From completed orders",
    },
    {
      title: "Orders",
      value: (summary?.totalOrders ?? 0).toLocaleString(),
      icon: "ShoppingCart",
      subtitle: "Completed today",
    },
    {
      title: "Avg Order Value",
      value:
        summary && summary.totalOrders > 0
          ? formatMoney(summary.averageOrderValue, currencySymbol)
          : "-",
      icon: "TrendingUp",
      subtitle: "Revenue per order",
    },
    {
      title: "Customers",
      value: (summary?.totalCustomers ?? 0).toLocaleString(),
      icon: "Users",
      subtitle: "Unique customers today",
    },
  ];

  return (
    <div className="pt-4 pb-8">
      <div className="mx-auto space-y-6">
        <TitleBar
          title="Dashboard"
          subtitle={
            lastUpdatedAt
              ? `${currentDate} · Updated ${lastUpdatedAt}`
              : currentDate
          }
          actions={
            <Button
              variant="outline"
              iconName="RefreshCw"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          }
        />

        <SummaryGrid
          items={summaryItems}
          isLoading={summaryQuery.isLoading}
          columns="4"
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <WeeklySalesChart
            data={weeklySalesQuery.data ?? []}
            currencySymbol={currencySymbol}
            isLoading={weeklySalesQuery.isLoading}
            error={weeklySalesQuery.error}
            onRetry={() => weeklySalesQuery.refetch()}
          />

          <SalesByCategoryChart
            data={categoryQuery.data ?? []}
            currencySymbol={currencySymbol}
            isLoading={categoryQuery.isLoading}
            error={categoryQuery.error}
            onRetry={() => categoryQuery.refetch()}
          />

          <HourlyRevenueChart
            data={hourlyRevenueQuery.data ?? []}
            currencySymbol={currencySymbol}
            isLoading={hourlyRevenueQuery.isLoading}
            error={hourlyRevenueQuery.error}
            onRetry={() => hourlyRevenueQuery.refetch()}
          />

          <TopProductsChart
            data={topProductsQuery.data ?? []}
            currencySymbol={currencySymbol}
            isLoading={topProductsQuery.isLoading}
            error={topProductsQuery.error}
            onRetry={() => topProductsQuery.refetch()}
          />
        </div>
      </div>
    </div>
  );
}
