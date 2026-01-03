import { createFileRoute } from "@tanstack/react-router";
import { DollarSign, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { useMemo } from "react";
import { HourlyRevenueChart } from "../components/dashboard/HourlyRevenueChart";
import { SalesByCategoryChart } from "../components/dashboard/SalesByCategoryChart";
import { SummaryCard } from "../components/dashboard/SummaryCard";
import { TopProductsChart } from "../components/dashboard/TopProductsChart";
import { WeeklySalesChart } from "../components/dashboard/WeeklySalesChart";
import {
  useDashboardSummary,
  useHourlyRevenue,
  useSalesByCategory,
  useTopProducts,
  useWeeklySales,
} from "../hooks/useDashboard";

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <DashboardHeader />

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

/**
 * Dashboard Header Component
 */
function DashboardHeader() {
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {currentDate}
        </p>
      </div>

      <div className="mt-4 sm:mt-0">
        <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Export Report
        </button>
      </div>
    </div>
  );
}
