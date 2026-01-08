import { createFileRoute } from "@tanstack/react-router";
import { DollarSign, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { useMemo } from "react";
import {
  HourlyRevenueChart,
  SalesByCategoryChart,
  SummaryCard,
  TopProductsChart,
  WeeklySalesChart,
} from "../components/dashboard";
import {
  useDashboardSummary,
  useHourlyRevenue,
  useSalesByCategory,
  useTopProducts,
  useWeeklySales,
} from "../hooks/useDashboard";
import { Button, Icon } from "@repo/ui";
import Heading from "@/components/heading";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const dateRange = useMemo(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return { from: thirtyDaysAgo, to: today };
  }, []);

  // Fetch all dashboard data
  const summaryQuery = useDashboardSummary();
  const weeklySalesQuery = useWeeklySales();
  const categoryQuery = useSalesByCategory(dateRange.from, dateRange.to);
  const hourlyRevenueQuery = useHourlyRevenue();
  const topProductsQuery = useTopProducts(dateRange.from, dateRange.to);

  const { data: summary } = summaryQuery;

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen pt-4">
      <div className="mx-auto space-y-6">
        {/* Header */}
        <Heading
          title="Dashboard"
          subtitle={currentDate}
          actions={
            <Button>
              <Icon name="Download" className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          }
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard
            title="Today's Sales"
            value={`$${
              (summary?.todaySales &&
                summary?.todaySales.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })) ||
              "0.00"
            }`}
            trend={{
              value: "+12.5%",
              isPositive: true,
            }}
            icon={<DollarSign className="w-5 h-5" />}
            isLoading={summaryQuery.isLoading}
          />

          <SummaryCard
            title="Orders"
            value={
              (summary?.orderCount && summary?.orderCount.toString()) || "0"
            }
            trend={{
              value: "+8.2%",
              isPositive: true,
            }}
            icon={<ShoppingCart className="w-5 h-5" />}
            isLoading={summaryQuery.isLoading}
          />

          <SummaryCard
            title="Avg Order Value"
            value={`$${
              (summary?.avgOrderValue &&
                summary?.avgOrderValue.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })) ||
              "0.00"
            }`}
            trend={{
              value: "-2.4%",
              isPositive: false,
            }}
            icon={<TrendingUp className="w-5 h-5" />}
            isLoading={summaryQuery.isLoading}
          />

          <SummaryCard
            title="Active Tables"
            value={`${(summary?.activeTables && summary?.activeTables.toString()) || "0"}/${(summary?.totalTables && summary?.totalTables.toString()) || "0"}`}
            trend={{
              value: `${summary?.totalTables ? Math.round((summary.activeTables / summary.totalTables) * 100) : 0}%`,
              isPositive: true,
            }}
            icon={<Users className="w-5 h-5" />}
            isLoading={summaryQuery.isLoading}
          />
        </div>

        {/* Charts Grid - Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WeeklySalesChart
            data={weeklySalesQuery.data || []}
            isLoading={weeklySalesQuery.isLoading}
            error={weeklySalesQuery.error}
            onRetry={() => weeklySalesQuery.refetch()}
          />

          <SalesByCategoryChart
            data={categoryQuery.data || []}
            isLoading={categoryQuery.isLoading}
            error={categoryQuery.error}
            onRetry={() => categoryQuery.refetch()}
          />
        </div>

        {/* Charts Grid - Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HourlyRevenueChart
            data={hourlyRevenueQuery.data || []}
            isLoading={hourlyRevenueQuery.isLoading}
            error={hourlyRevenueQuery.error}
            onRetry={() => hourlyRevenueQuery.refetch()}
          />

          <TopProductsChart
            data={topProductsQuery.data || []}
            isLoading={topProductsQuery.isLoading}
            error={topProductsQuery.error}
            onRetry={() => topProductsQuery.refetch()}
          />
        </div>
      </div>
    </div>
  );
}
