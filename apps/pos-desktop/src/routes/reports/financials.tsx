import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable, Button, Icon } from "@repo/ui";
import { ReportsFilterBar, SummaryGrid } from "@/components/reports";
import { useBranches } from "@/hooks/useBranch";
import { useShifts } from "@/hooks/useShifts";
import {
  useFinancialsReport,
  useProductsWithProfit,
  useCategoryRevenue,
} from "@/hooks/useReports";
import { useReportPageState } from "@/hooks/useReportPageState";
import { getDateRangeFromPreset, formatCurrency } from "@/utils/reportHelpers";
import { exportFinancialsReportPdf } from "@/pdf/utils/exportFinancialsReportPdf";
import { formatDateTime } from "@/pdf/utils/formatters";
import type {
  ProductProfitRow,
  CategoryRevenueRow,
  DateRangePreset,
} from "@/types/reports";
import type {
  ProductProfitRowPdf,
  CategoryRevenueRowPdf,
  FinancialsReportSummary,
} from "@/pdf/financials/FinancialsReportPdf";

export const Route = createFileRoute("/reports/financials")({
  component: FinancialsReportPage,
});

function FinancialsReportPage() {
  const {
    datePreset,
    setDatePreset,
    filters,
    setFilters,
    page: _page,
    setPage: _setPage,
    pageSize: _pageSize,
    setPageSize: _setPageSize,
    searchTerm: _searchTerm,
    setSearchTerm: _setSearchTerm,
    appliedFilters,
    setAppliedFilters,
  } = useReportPageState();

  const { data: branches = [] } = useBranches();

  const { data: shiftsData } = useShifts({ limit: 50 });
  const shiftOptions = useMemo(
    () =>
      (shiftsData?.data ?? []).map((s) => ({
        id: s.id,
        label: `${new Date(s.startTime).toLocaleDateString()} (${s.status})`,
      })),
    [shiftsData],
  );

  // Fetch financials summary
  const { data: financialsData, isLoading: isSummaryLoading } =
    useFinancialsReport(appliedFilters);

  // Fetch top 5 profit products
  const { data: profitProducts = [], isLoading: isProfitProductsLoading } =
    useProductsWithProfit(appliedFilters, 5);
  // Fetch all products for best sellers and low performance (fetch more for sorting)
  const { data: allProducts = [], isLoading: isAllProductsLoading } =
    useProductsWithProfit(appliedFilters, 100);

  // Fetch category revenue
  const { data: categoryData = [], isLoading: isCategoryLoading } =
    useCategoryRevenue(appliedFilters);

  // Get best sellers (top 5 by quantity)
  const bestSellers = useMemo(() => {
    const sorted = [...allProducts].sort((a, b) => b.qtySold - a.qtySold);
    return sorted.slice(0, 5);
  }, [allProducts]);

  // Get low performance products (bottom 5 by quantity)
  const lowPerformanceProducts = useMemo(() => {
    const sorted = [...allProducts].sort((a, b) => a.qtySold - b.qtySold);
    return sorted.slice(0, 5);
  }, [allProducts]);

  // Columns for Top Profit Products
  const profitProductsColumns: ColumnDef<ProductProfitRow>[] = useMemo(
    () => [
      {
        accessorKey: "productName",
        header: "Product",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.productName}</span>
        ),
      },
      {
        accessorKey: "revenue",
        header: "Revenue",
        cell: ({ row }) => formatCurrency(row.original.revenue),
      },
      {
        accessorKey: "profit",
        header: "Profit",
        cell: ({ row }) => (
          <span className="font-semibold text-green-600">
            {formatCurrency(row.original.profit)}
          </span>
        ),
      },
      {
        accessorKey: "margin",
        header: "Margin %",
        cell: ({ row }) => `${row.original.margin.toFixed(2)}%`,
      },
    ],
    [],
  );

  // Columns for Best Sellers
  const bestSellersColumns: ColumnDef<ProductProfitRow>[] = useMemo(
    () => [
      {
        accessorKey: "productName",
        header: "Product",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.productName}</span>
        ),
      },
      {
        accessorKey: "qtySold",
        header: "Quantity Sold",
        cell: ({ row }) => row.original.qtySold,
      },
      {
        accessorKey: "revenue",
        header: "Revenue",
        cell: ({ row }) => formatCurrency(row.original.revenue),
      },
    ],
    [],
  );

  // Columns for Low Performance Products
  const lowPerformanceColumns: ColumnDef<ProductProfitRow>[] = useMemo(
    () => [
      {
        accessorKey: "productName",
        header: "Product",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.productName}</span>
        ),
      },
      {
        accessorKey: "qtySold",
        header: "Quantity Sold",
        cell: ({ row }) => (
          <span className="text-destructive">{row.original.qtySold}</span>
        ),
      },
      {
        accessorKey: "revenue",
        header: "Revenue",
        cell: ({ row }) => formatCurrency(row.original.revenue),
      },
    ],
    [],
  );

  // Columns for Category Revenue
  const categoryColumns: ColumnDef<CategoryRevenueRow>[] = useMemo(
    () => [
      {
        accessorKey: "categoryName",
        header: "Category",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.categoryName}</span>
        ),
      },
      {
        accessorKey: "revenue",
        header: "Revenue",
        cell: ({ row }) => formatCurrency(row.original.revenue),
      },
      {
        accessorKey: "profit",
        header: "Profit",
        cell: ({ row }) => (
          <span className="font-semibold text-green-600">
            {formatCurrency(row.original.profit)}
          </span>
        ),
      },
    ],
    [],
  );

  const handleFiltersChange = useCallback(
    (updates: Partial<typeof filters>) => {
      setFilters((prev) => ({ ...prev, ...updates }));
    },
    [setFilters],
  );

  const handleDatePresetChange = useCallback(
    (preset: DateRangePreset) => {
      setDatePreset(preset);
      if (preset !== "custom") {
        const range = getDateRangeFromPreset(preset);
        handleFiltersChange(range);
      }
    },
    [setDatePreset, handleFiltersChange],
  );

  const handleApply = () => {
    setAppliedFilters({ ...filters });
  };

  const handleReset = () => {
    const resetFilters = { ...getDateRangeFromPreset("today") };
    setFilters(resetFilters);
    setAppliedFilters(resetFilters);
  };

  const handleExportPdf = async () => {
    if (!financialsData) return;

    const selectedBranch = appliedFilters.branchId
      ? branches.find((b) => b.id === appliedFilters.branchId)
      : undefined;

    const dateRangeStr = `${formatDateTime(appliedFilters.from)} - ${formatDateTime(appliedFilters.to)}`;

    const summary: FinancialsReportSummary = {
      totalRevenue: financialsData.totalRevenue,
      totalProfits: financialsData.totalProfits,
      totalDebts: financialsData.totalDebts,
      topProfitProductName: financialsData.topProfitProductName,
    };

    const profitProductsPdf: ProductProfitRowPdf[] = profitProducts.map(
      (p) => ({
        productName: p.productName,
        revenue: p.revenue,
        profit: p.profit,
        margin: p.margin,
      }),
    );

    const bestSellersPdf: ProductProfitRowPdf[] = bestSellers.map((p) => ({
      productName: p.productName,
      revenue: p.revenue,
      profit: p.profit,
      margin: p.margin,
      qtySold: p.qtySold,
    }));

    const lowPerformancePdf: ProductProfitRowPdf[] = lowPerformanceProducts.map(
      (p) => ({
        productName: p.productName,
        revenue: p.revenue,
        profit: p.profit,
        margin: p.margin,
        qtySold: p.qtySold,
      }),
    );

    const categoriesPdf: CategoryRevenueRowPdf[] = categoryData.map((c) => ({
      categoryName: c.categoryName,
      revenue: c.revenue,
      profit: c.profit,
    }));

    await exportFinancialsReportPdf({
      tenantName: "PointVerse", // TODO: Get from tenant context
      branchName: selectedBranch?.name,
      dateRange: dateRangeStr,
      summary,
      topProfitProducts: profitProductsPdf,
      bestSellers: bestSellersPdf,
      lowPerformance: lowPerformancePdf,
      categories: categoriesPdf,
    });
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <ReportsFilterBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onApply={handleApply}
        onReset={handleReset}
        branches={branches}
        isLoading={isSummaryLoading}
        datePreset={datePreset}
        onDatePresetChange={handleDatePresetChange}
        hideOrderType={true}
        hidePaymentMethod={true}
        shifts={shiftOptions}
      />

      {/* Summary Cards */}
      <SummaryGrid
        items={[
          {
            title: "Total Revenue",
            value: formatCurrency(financialsData?.totalRevenue || 0),
            icon: "DollarSign",
            subtitle: "Revenue from completed orders",
          },
          {
            title: "Total Profits",
            value: formatCurrency(financialsData?.totalProfits || 0),
            icon: "TrendingUp",
            subtitle: "Revenue minus cost of goods",
          },
          {
            title: "Total Debts",
            value: formatCurrency(financialsData?.totalDebts || 0),
            icon: "CircleAlert",
            subtitle: "Pending & partially paid orders",
          },
          {
            title: "Top Profit Product",
            value: financialsData?.topProfitProductName || "-",
            icon: "Trophy",
            subtitle: "Highest profit-making product",
          },
        ]}
        isLoading={isSummaryLoading}
        columns={"4"}
      />

      {/* Export PDF Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPdf}
          disabled={isSummaryLoading || !financialsData}
        >
          <Icon name="FileDown" className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Tables Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top 5 Profit Products */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Top 5 Profit Products</h2>
            <p className="text-sm text-muted-foreground">
              Highest profit-making products
            </p>
          </div>
          <DataTable
            columns={profitProductsColumns}
            data={profitProducts}
            isLoading={isProfitProductsLoading}
            onRefetch={() => {}}
          />
        </div>

        {/* Top 5 Best Sellers */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Top 5 Best Sellers</h2>
            <p className="text-sm text-muted-foreground">
              Most ordered products by quantity
            </p>
          </div>
          <DataTable
            columns={bestSellersColumns}
            data={bestSellers}
            isLoading={isAllProductsLoading}
            onRefetch={() => {}}
          />
        </div>

        {/* Low Performance Products */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Low Performance Products</h2>
            <p className="text-sm text-muted-foreground">
              Products with lowest sales quantity
            </p>
          </div>
          <DataTable
            columns={lowPerformanceColumns}
            data={lowPerformanceProducts}
            isLoading={isAllProductsLoading}
            onRefetch={() => {}}
          />
        </div>

        {/* Revenue by Category */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Revenue by Category</h2>
            <p className="text-sm text-muted-foreground">
              Revenue and profit grouped by category
            </p>
          </div>
          <DataTable
            columns={categoryColumns}
            data={categoryData}
            isLoading={isCategoryLoading}
            onRefetch={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
