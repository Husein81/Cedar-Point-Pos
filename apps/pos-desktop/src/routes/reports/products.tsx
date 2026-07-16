import { ReportsFilterBar } from "@/components/reports";
import { getProductReportsColumns } from "@/components/reports/reportsColumns";
import { useBranches } from "@/hooks/useBranch";
import { useCategories } from "@/hooks/useCategory";
import { useReportPageState } from "@/hooks/useReportPageState";
import { useTopProductsReportList } from "@/hooks/useReports";
import type {
  TopProductRowPdf,
  TopProductsReportSummary,
} from "@/pdf/products/TopProductsReportPdf";
import { exportTopProductsReportPdf } from "@/pdf/utils/exportTopProductsReportPdf";
import { formatDate as formatDatePdf } from "@/pdf/utils/formatters";
import type {
  DateRangePreset,
  ReportListParams,
  TopProductRow,
} from "@/dto/reports.dto";
import { getDateRangeFromPreset } from "@/utils/reportHelpers";
import { Button, DataTable } from "@repo/ui";
import { createFileRoute } from "@tanstack/react-router";
import { FileDown } from "lucide-react";
import { useCallback, useMemo } from "react";

export const Route = createFileRoute("/reports/products")({
  component: ProductsReportPage,
});

function ProductsReportPage() {
  const {
    datePreset,
    setDatePreset,
    filters,
    setFilters,
    page,
    setPage,
    pageSize,
    setPageSize,
    searchTerm,
    setSearchTerm,
    appliedFilters,
    setAppliedFilters,
    isExporting,
    setIsExporting,
  } = useReportPageState();

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
    [],
  );

  const listParams: ReportListParams = useMemo(
    () => ({
      ...appliedFilters,
      search: searchTerm || undefined,
      page,
      pageSize,
    }),
    [appliedFilters, searchTerm, page, pageSize],
  );

  const { data, isLoading, refetch } = useTopProductsReportList(listParams);

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
        const dateRange = getDateRangeFromPreset(preset);
        setFilters((prev) => ({
          ...prev,
          from: dateRange.from,
          to: dateRange.to,
        }));
      }
    },
    [setDatePreset, setFilters],
  );

  const handleApply = () => {
    setAppliedFilters(filters);
    setPage(1);
  };

  const handleReset = () => {
    const defaultFilters = getDateRangeFromPreset("today");
    setDatePreset("today");
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setPage(1);
    setSearchTerm("");
  };

  const columns = getProductReportsColumns();

  const rows = data?.data ?? [];
  const pagination = data?.pagination ?? {
    page: 1,
    limit: 25,
    totalCount: 0,
    totalPages: 0,
  };

  const handleExportPdf = async () => {
    if (rows.length === 0) return;

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

      const tenantName = "CedarPoint POS";
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
      const a = document.createElement("a");
      a.href = url;
      a.download = `top-products-report-${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Top Products PDF export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

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

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Top Products</h2>
            <p className="text-sm text-muted-foreground">
              {pagination.totalCount} products found
            </p>
          </div>
          <Button
            onClick={handleExportPdf}
            disabled={rows.length === 0 || isExporting}
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
            onTermChange: (t) => {
              setSearchTerm(t);
              setPage(1);
            },
            keys: ["productName" as keyof TopProductRow],
          }}
          pagination={{
            rows: pagination.totalCount,
            page,
            pageSize,
            totalPages: pagination.totalPages,
            onPageChange: setPage,
            onPageSizeChange: (s) => {
              setPageSize(s);
              setPage(1);
            },
          }}
        />
      </div>
    </div>
  );
}
