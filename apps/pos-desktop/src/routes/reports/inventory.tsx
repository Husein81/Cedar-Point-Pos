import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable, Badge, Button } from "@repo/ui";
import { FileDown } from "lucide-react";
import { ReportsFilterBar } from "@/components/reports";
import { useBranches } from "@/hooks/useBranch";
import { useReportPageState } from "@/hooks/useReportPageState";
import { useInventoryMovementsReport } from "@/hooks/useReports";
import { exportInventoryMovementsReportPdf } from "@/pdf/utils/exportInventoryMovementsReportPdf";
import {
  formatDate as formatDatePdf,
  formatDateTime,
} from "@/pdf/utils/formatters";
import {
  getDateRangeFromPreset,
  formatDate,
  getChangeTypeVariant,
  formatChangeType,
} from "@/utils/reportHelpers";
import type {
  DateRangePreset,
  InventoryMovementRow,
  ReportListParams,
} from "@/types/reports";
import type {
  InventoryMovementRowPdf,
  InventoryMovementsReportSummary,
} from "@/pdf/inventory/InventoryMovementsReportPdf";

export const Route = createFileRoute("/reports/inventory")({
  component: InventoryReportPage,
});

function InventoryReportPage() {
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
  } = useReportPageState("today");

  const { data: branches = [] } = useBranches();

  const mapToInventoryMovementPdf = useCallback(
    (row: InventoryMovementRow): InventoryMovementRowPdf => {
      return {
        date: formatDateTime(row.createdAt),
        product: row.product.name,
        changeType: formatChangeType(row.changeType),
        beforeStock: row.beforeStock,
        afterStock: row.afterStock,
        adjustment: row.adjustment,
        reason: row.reason || "-",
        user: row.user?.name || "-",
        branch: row.branch.name,
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

  const { data, isLoading, refetch } = useInventoryMovementsReport(listParams);

  const handleFiltersChange = (updates: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const handleDatePresetChange = (preset: DateRangePreset) => {
    setDatePreset(preset);
    if (preset !== "custom") {
      const dateRange = getDateRangeFromPreset(preset);
      setFilters((prev) => ({
        ...prev,
        from: dateRange.from,
        to: dateRange.to,
      }));
    }
  };

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

  const columns: ColumnDef<InventoryMovementRow>[] = useMemo(
    () => [
      {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-sm">{formatDate(row.original.createdAt)}</span>
        ),
      },
      {
        accessorKey: "product",
        header: "Product",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.product.name}</span>
        ),
      },
      {
        accessorKey: "changeType",
        header: "Change Type",
        cell: ({ row }) => (
          <Badge variant={getChangeTypeVariant(row.original.changeType)}>
            {formatChangeType(row.original.changeType)}
          </Badge>
        ),
      },
      {
        accessorKey: "beforeStock",
        header: "Before",
        cell: ({ row }) => row.original.beforeStock.toFixed(2),
      },
      {
        accessorKey: "afterStock",
        header: "After",
        cell: ({ row }) => row.original.afterStock.toFixed(2),
      },
      {
        accessorKey: "adjustment",
        header: "Adjustment",
        cell: ({ row }) => {
          const adj = row.original.adjustment;
          const isPositive = adj > 0;
          return (
            <span
              className={isPositive ? "text-green-600" : "text-destructive"}
            >
              {isPositive ? "+" : ""}
              {adj.toFixed(2)}
            </span>
          );
        },
      },
      {
        accessorKey: "reason",
        header: "Reason",
        cell: ({ row }) =>
          row.original.reason || (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        accessorKey: "user",
        header: "User",
        cell: ({ row }) => row.original.user.name,
      },
      {
        accessorKey: "branch",
        header: "Branch",
        cell: ({ row }) => row.original.branch.name,
      },
    ],
    [],
  );

  const rows = data?.data ?? [];
  const meta = data?.pagination ?? {
    page: 1,
    pageSize: 25,
    totalCount: 0,
    totalPages: 0,
  };

  const handleExportPdf = async () => {
    if (rows.length === 0) return;

    setIsExporting(true);
    try {
      const pdfRows = rows.map(mapToInventoryMovementPdf);

      const summary: InventoryMovementsReportSummary = {
        totalMovements: rows.length,
        totalIncrease: rows.reduce(
          (sum, r) => sum + (r.adjustment > 0 ? r.adjustment : 0),
          0,
        ),
        totalDecrease: rows.reduce(
          (sum, r) => sum + (r.adjustment < 0 ? Math.abs(r.adjustment) : 0),
          0,
        ),
      };

      const tenantName = "Pointverse POS";
      const branchName = appliedFilters.branchId
        ? branches.find((b) => b.id === appliedFilters.branchId)?.name
        : undefined;
      const dateRange = `${formatDatePdf(appliedFilters.from.toISOString())} - ${formatDatePdf(appliedFilters.to.toISOString())}`;

      const blob = await exportInventoryMovementsReportPdf({
        tenantName,
        branchName,
        dateRange,
        summary,
        movements: pdfRows,
      });

      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (error) {
      console.error("Inventory PDF export failed:", error);
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
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Inventory Movements</h2>
            <p className="text-sm text-muted-foreground">
              {meta.totalCount} movements found
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
            keys: ["changeType" as keyof InventoryMovementRow],
          }}
          pagination={{
            rows: meta.totalCount,
            page,
            pageSize,
            totalPages: meta.totalPages,
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
