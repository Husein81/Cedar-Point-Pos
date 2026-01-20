import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable, Badge, Button } from "@repo/ui";
import { FileDown } from "lucide-react";
import { ReportsFilterBar } from "@/components/reports";
import { useBranches } from "@/hooks/useBranch";
import { useCategories } from "@/hooks/useCategory";
import { useTopProductsReportList } from "@/hooks/useReports";
import { exportTopProductsReportPdf } from "@/pdf/utils/exportTopProductsReportPdf";
import { formatDate as formatDatePdf } from "@/pdf/utils/formatters";
import type {
  TopProductRow,
  ReportsFilterState,
  ReportListParams,
  DateRangePreset,
} from "@/types/reports";
import type {
  TopProductRowPdf,
  TopProductsReportSummary,
} from "@/pdf/products/TopProductsReportPdf";

export const Route = createFileRoute("/reports/products")({
  component: ProductsReportPage,
});

// TODO: This is a complete implementation following the Sales pattern

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

function ProductsReportPage() {
  const [datePreset, setDatePreset] = useState<DateRangePreset>("today");
  const [filters, setFilters] = useState<ReportsFilterState>(() => ({
    ...getDateRangeFromPreset("today"),
  }));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedFilters, setAppliedFilters] =
    useState<ReportsFilterState>(filters);
  const [hasFetched, setHasFetched] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { data: branches = [] } = useBranches();
  const { data: categories = [] } = useCategories();

  const mapToTopProductPdf = useCallback(
    (row: TopProductRow): TopProductRowPdf => {
      return {
        productName: row.productName,
        category: row.categoryName || "Uncategorized",
        qtySold: row.qtySold,
        revenue: row.revenue,
        avgUnitPrice: row.avgUnitPrice,
      };
    },
    []
  );

  const listParams: ReportListParams = useMemo(
    () => ({
      ...appliedFilters,
      search: searchTerm || undefined,
      page,
      pageSize,
    }),
    [appliedFilters, searchTerm, page, pageSize]
  );

  const { data, isLoading, refetch } = useTopProductsReportList(listParams, {
    enabled: hasFetched,
  });

  const handleFiltersChange = useCallback(
    (updates: Partial<ReportsFilterState>) => {
      setFilters((prev: ReportsFilterState) => ({ ...prev, ...updates }));
    },
    []
  );

  const handleDatePresetChange = useCallback((preset: DateRangePreset) => {
    setDatePreset(preset);
    if (preset !== "custom") {
      const dateRange = getDateRangeFromPreset(preset);
      setFilters((prev: ReportsFilterState) => ({
        ...prev,
        from: dateRange.from,
        to: dateRange.to,
      }));
    }
  }, []);

  const handleApply = useCallback(() => {
    setAppliedFilters(filters);
    setPage(1);
    setHasFetched(true);
  }, [filters]);

  const handleReset = useCallback(() => {
    const defaultFilters = getDateRangeFromPreset("today");
    setDatePreset("today");
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setPage(1);
    setSearchTerm("");
    setHasFetched(true);
  }, []);

  const columns: ColumnDef<TopProductRow>[] = useMemo(
    () => [
      {
        accessorKey: "productName",
        header: "Product",
        cell: ({ row }) => <span className="font-medium">{row.original.productName}</span>,
      },
      {
        accessorKey: "categoryName",
        header: "Category",
        cell: ({ row }) =>
          row.original.categoryName ? (
            <Badge variant="outline">{row.original.categoryName}</Badge>
          ) : (
            <span className="text-muted-foreground">Uncategorized</span>
          ),
      },
      {
        accessorKey: "qtySold",
        header: "Quantity Sold",
        cell: ({ row }) => <span className="font-mono">{row.original.qtySold.toFixed(0)}</span>,
      },
      {
        accessorKey: "revenue",
        header: "Revenue",
        cell: ({ row }) => (
          <span className="font-semibold text-green-600">
            {formatCurrency(row.original.revenue)}
          </span>
        ),
      },
      {
        accessorKey: "avgUnitPrice",
        header: "Avg Unit Price",
        cell: ({ row }) => formatCurrency(row.original.avgUnitPrice),
      },
    ],
    []
  );

  const rows = data?.data ?? [];
  const meta = data?.meta ?? { page: 1, pageSize: 25, totalItems: 0, totalPages: 0 };

  const handleExportPdf = useCallback(async () => {
    if (!hasFetched || rows.length === 0) return;

    setIsExporting(true);
    try {
      const pdfRows = rows.map(mapToTopProductPdf);

      const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0);
      const totalUnitsSold = rows.reduce((sum, r) => sum + r.qtySold, 0);

      let topProductName = "-";
      if (rows.length > 0) {
        const topProduct = rows.reduce<TopProductRow | undefined>((max, r) => {
          if (!max || r.revenue > max.revenue) return r;
          return max;
        }, undefined);
        topProductName = topProduct?.productName ?? "-";
      }

      const summary: TopProductsReportSummary = {
        totalRevenue,
        totalUnitsSold,
        topProductName,
      };

      const tenantName = "Pointverse POS";
      const branchName = appliedFilters.branchId
        ? branches.find((b) => b.id === appliedFilters.branchId)?.name
        : undefined;
      const dateRange = `${formatDatePdf(appliedFilters.from.toISOString())} - ${formatDatePdf(appliedFilters.to.toISOString())}`;

      const blob = await exportTopProductsReportPdf({
        tenantName,
        branchName,
        dateRange,
        summary,
        products: pdfRows,
      });

      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (error) {
      console.error("Top Products PDF export failed:", error);
    } finally {
      setIsExporting(false);
    }
  }, [hasFetched, rows, mapToTopProductPdf, appliedFilters, branches]);

  return (
    <div className="space-y-6">
      <ReportsFilterBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onApply={handleApply}
        onReset={handleReset}
        branches={branches}
        isLoading={isLoading}
        datePreset={datePreset}
        onDatePresetChange={handleDatePresetChange}
        hideOrderType={true}
        showCategory={true}
        categories={categories}
      />

      {hasFetched ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Top Products</h2>
              <p className="text-sm text-muted-foreground">{meta.totalItems} products found</p>
            </div>
            <Button
              onClick={handleExportPdf}
              disabled={!hasFetched || rows.length === 0 || isExporting}
              variant="outline"
            >
              <FileDown className="mr-2 h-4 w-4" />
              {isExporting ? "Exporting..." : "Export PDF"}
            </Button>
          </div>
          <DataTable
            columns={columns}
            data={rows}
            isLoading={isLoading}
            onRefetch={() => refetch()}
            search={{
              term: searchTerm,
              onTermChange: (t) => { setSearchTerm(t); setPage(1); },
              keys: ["productName" as keyof TopProductRow],
            }}
            pagination={{
              rows: meta.totalItems,
              page,
              pageSize,
              totalPages: meta.totalPages,
              onPageChange: setPage,
              onPageSizeChange: (s) => { setPageSize(s); setPage(1); },
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">Generate Products Report</h3>
          <p className="text-sm text-muted-foreground max-w-sm">Configure filters above and click Apply to load product data.</p>
        </div>
      )}
    </div>
  );
}
