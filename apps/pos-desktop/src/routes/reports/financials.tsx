import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useMemo, useEffect } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable, Button } from "@repo/ui";
import { DollarSign, TrendingUp, AlertCircle, Trophy, FileDown } from "lucide-react";
import { ReportsFilterBar } from "@/components/reports";
import { useBranches } from "@/hooks/useBranch";
import {
  useFinancialsReport,
  useProductsWithProfit,
  useCategoryRevenue,
} from "@/hooks/useReports";
import { exportFinancialsReportPdf } from "@/pdf/utils/exportFinancialsReportPdf";
import { formatDateTime } from "@/pdf/utils/formatters";
import type {
  ReportsFilterState,
  DateRangePreset,
  ProductProfitRow,
  CategoryRevenueRow,
} from "@/types/reports";
import type {
  ProductProfitRowPdf,
  CategoryRevenueRowPdf,
  FinancialsReportSummary,
} from "@/pdf/financials/FinancialsReportPdf";

export const Route = createFileRoute("/reports/financials")({
  component: FinancialsReportPage,
});

// ============================================================
// Helpers
// ============================================================

const getDateRangeFromPreset = (
  preset: DateRangePreset
): { from: Date; to: Date } => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setMilliseconds(-1);

  switch (preset) {
    case "today":
      return { from: today, to: tomorrow };
    case "yesterday": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { from: yesterday, to: today };
    }
    case "this_week": {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return { from: startOfWeek, to: tomorrow };
    }
    case "this_month": {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: startOfMonth, to: tomorrow };
    }
    case "custom":
    default:
      return { from: today, to: tomorrow };
  }
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

// ============================================================
// Summary Cards Component
// ============================================================

interface SummaryCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  subtitle?: string;
}

function SummaryCard({ title, value, icon, subtitle }: SummaryCardProps) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="rounded-md bg-muted p-2">{icon}</div>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      {subtitle && (
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}

interface FinancialsSummaryCardsProps {
  isLoading: boolean;
  totalRevenue: number;
  totalProfits: number;
  totalDebts: number;
  topProfitProductName: string | null;
}

function FinancialsSummaryCards({
  isLoading,
  totalRevenue,
  totalProfits,
  totalDebts,
  topProfitProductName,
}: FinancialsSummaryCardsProps) {
  const iconClassName = "h-4 w-4 text-muted-foreground";

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-[120px] animate-pulse rounded-lg border bg-muted"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <SummaryCard
        title="Total Revenue"
        value={formatCurrency(totalRevenue)}
        icon={<DollarSign className={iconClassName} />}
        subtitle="Revenue from completed orders"
      />
      <SummaryCard
        title="Total Profits"
        value={formatCurrency(totalProfits)}
        icon={<TrendingUp className={iconClassName} />}
        subtitle="Revenue minus cost of goods"
      />
      <SummaryCard
        title="Total Debts"
        value={formatCurrency(totalDebts)}
        icon={<AlertCircle className={iconClassName} />}
        subtitle="Pending & partially paid orders"
      />
      <SummaryCard
        title="Top Profit Product"
        value={topProfitProductName || "-"}
        icon={<Trophy className={iconClassName} />}
        subtitle="Highest profit-making product"
      />
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

function FinancialsReportPage() {
  const [datePreset, setDatePreset] = useState<DateRangePreset>("today");
  const [filters, setFilters] = useState<ReportsFilterState>(() => ({
    ...getDateRangeFromPreset("today"),
  }));

  const [appliedFilters, setAppliedFilters] = useState<ReportsFilterState>(
    () => ({
      ...getDateRangeFromPreset("today"),
    })
  );

  const [hasFetched, setHasFetched] = useState(false);

  const { data: branches = [] } = useBranches();

  // Fetch financials summary
  const { data: financialsData, isLoading: isSummaryLoading } =
    useFinancialsReport(appliedFilters, { enabled: hasFetched });

  // Fetch top 5 profit products
  const { data: profitProducts = [], isLoading: isProfitProductsLoading } =
    useProductsWithProfit(appliedFilters, 5, { enabled: hasFetched });

  // Fetch all products for best sellers and low performance (fetch more for sorting)
  const { data: allProducts = [], isLoading: isAllProductsLoading } =
    useProductsWithProfit(appliedFilters, 100, { enabled: hasFetched });

  // Fetch category revenue
  const { data: categoryData = [], isLoading: isCategoryLoading } =
    useCategoryRevenue(appliedFilters, { enabled: hasFetched });

  // Auto-load on first render
  useEffect(() => {
    setHasFetched(true);
  }, []);

  const summary = useMemo(
    () => ({
      totalRevenue: financialsData?.totalRevenue || 0,
      totalProfits: financialsData?.totalProfits || 0,
      totalDebts: financialsData?.totalDebts || 0,
      topProfitProductName: financialsData?.topProfitProductName || null,
    }),
    [financialsData]
  );

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
    []
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
    []
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
    []
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
    []
  );

  const handleFiltersChange = useCallback(
    (newFilters: Partial<ReportsFilterState>) => {
      setFilters((prev) => ({ ...prev, ...newFilters }));
    },
    []
  );

  const handleApply = useCallback(() => {
    setAppliedFilters({ ...filters });
    setHasFetched(true);
  }, [filters]);

  const handleReset = useCallback(() => {
    const resetFilters = { ...getDateRangeFromPreset("today") };
    setFilters(resetFilters);
    setAppliedFilters(resetFilters);
    setHasFetched(true);
  }, []);

  const handleDatePresetChange = useCallback(
    (preset: DateRangePreset) => {
      setDatePreset(preset);
      if (preset !== "custom") {
        const range = getDateRangeFromPreset(preset);
        handleFiltersChange(range);
      }
    },
    [handleFiltersChange]
  );

  const handleExportPdf = useCallback(async () => {
    if (!financialsData) return;

    const selectedBranch = appliedFilters.branchId
      ? branches.find(b => b.id === appliedFilters.branchId)
      : undefined;

    const dateRangeStr = `${formatDateTime(appliedFilters.from)} - ${formatDateTime(appliedFilters.to)}`;

    const summary: FinancialsReportSummary = {
      totalRevenue: financialsData.totalRevenue,
      totalProfits: financialsData.totalProfits,
      totalDebts: financialsData.totalDebts,
      topProfitProductName: financialsData.topProfitProductName,
    };

    const profitProductsPdf: ProductProfitRowPdf[] = profitProducts.map(p => ({
      productName: p.productName,
      revenue: p.revenue,
      profit: p.profit,
      margin: p.margin,
    }));

    const bestSellersPdf: ProductProfitRowPdf[] = bestSellers.map(p => ({
      productName: p.productName,
      revenue: p.revenue,
      profit: p.profit,
      margin: p.margin,
      qtySold: p.qtySold,
    }));

    const lowPerformancePdf: ProductProfitRowPdf[] = lowPerformanceProducts.map(p => ({
      productName: p.productName,
      revenue: p.revenue,
      profit: p.profit,
      margin: p.margin,
      qtySold: p.qtySold,
    }));

    const categoriesPdf: CategoryRevenueRowPdf[] = categoryData.map(c => ({
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
  }, [financialsData, appliedFilters, branches, profitProducts, bestSellers, lowPerformanceProducts, categoryData]);

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
      />

      {/* Summary Cards */}
      <FinancialsSummaryCards
        isLoading={isSummaryLoading}
        {...summary}
      />

      {/* Export PDF Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPdf}
          disabled={isSummaryLoading || !financialsData}
        >
          <FileDown className="h-4 w-4 mr-2" />
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
            onRefetch={() => { }}
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
            onRefetch={() => { }}
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
            onRefetch={() => { }}
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
            onRefetch={() => { }}
          />
        </div>
      </div>
    </div>
  );
}
