import TitleBar from "@/components/title-bar";
import { SummaryGrid } from "@/components/reports";
import { ReservationWidgets } from "@/components/reservations";
import { useAuthStore } from "@/store/authStore";
import { useBranches } from "@/hooks/useBranch";
import { formatCurrency } from "@/utils/reportHelpers";
import { DEFAULT_LOCALE } from "@/constants/locale";
import { Button, Select } from "@repo/ui";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  HourlyRevenueChart,
  SalesByCategoryChart,
  TopProductsChart,
  WeeklySalesChart,
} from "../components/dashboard";
import {
  dashboardKeys,
  useDashboardSummary,
  useHourlyRevenue,
  useSalesByCategory,
  useTopProducts,
  useWeeklySales,
} from "../hooks/useDashboard";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

/** Category and top-product charts cover this trailing window */
const RANGE_DAYS = 30;

const ALL_BRANCHES = "all";

function DashboardPage() {
  const queryClient = useQueryClient();
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const businessType = useAuthStore(
    (state) => state.user?.tenant?.businessType,
  );

  const dateRange = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - RANGE_DAYS);
    return { from, to };
  }, []);

  const { data: branches = [] } = useBranches();

  const summaryQuery = useDashboardSummary({ branchId });
  const weeklySalesQuery = useWeeklySales({ branchId });
  const categoryQuery = useSalesByCategory(dateRange.from, dateRange.to, {
    branchId,
  });
  const hourlyRevenueQuery = useHourlyRevenue({ branchId });
  const topProductsQuery = useTopProducts(dateRange.from, dateRange.to, {
    branchId,
  });

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

  const currentDate = new Date().toLocaleDateString(DEFAULT_LOCALE, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const lastUpdatedAt = summaryQuery.dataUpdatedAt
    ? new Date(summaryQuery.dataUpdatedAt).toLocaleTimeString(DEFAULT_LOCALE, {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const summaryItems = [
    {
      title: "Today's Revenue",
      value: formatCurrency(summary?.totalRevenue ?? 0),
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
          ? formatCurrency(summary.averageOrderValue)
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

  const branchOptions = [
    { value: ALL_BRANCHES, label: "All Branches" },
    ...branches.map((branch) => ({ value: branch.id, label: branch.name })),
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
            <>
              {branches.length > 1 && (
                <Select
                  value={branchId ?? ALL_BRANCHES}
                  onChange={(option) =>
                    setBranchId(
                      option.value === ALL_BRANCHES ? undefined : option.value,
                    )
                  }
                  className="w-44"
                  options={branchOptions}
                />
              )}
              <Button
                variant="outline"
                iconName="RefreshCw"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </Button>
            </>
          }
        />

        <SummaryGrid
          items={summaryItems}
          isLoading={summaryQuery.isLoading}
          columns="4"
        />

        {businessType === "RESTAURANT" && (
          <ReservationWidgets branchId={branchId} />
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <WeeklySalesChart
            data={weeklySalesQuery.data ?? []}
            isLoading={weeklySalesQuery.isLoading}
            error={weeklySalesQuery.error}
            onRetry={() => weeklySalesQuery.refetch()}
          />

          <SalesByCategoryChart
            data={categoryQuery.data ?? []}
            isLoading={categoryQuery.isLoading}
            error={categoryQuery.error}
            onRetry={() => categoryQuery.refetch()}
          />

          <HourlyRevenueChart
            data={hourlyRevenueQuery.data ?? []}
            isLoading={hourlyRevenueQuery.isLoading}
            error={hourlyRevenueQuery.error}
            onRetry={() => hourlyRevenueQuery.refetch()}
          />

          <TopProductsChart
            data={topProductsQuery.data ?? []}
            isLoading={topProductsQuery.isLoading}
            error={topProductsQuery.error}
            onRetry={() => topProductsQuery.refetch()}
          />
        </div>
      </div>
    </div>
  );
}
