import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable, Badge, Button } from "@repo/ui";
import { FileDown } from "lucide-react";
import { ReportsFilterBar } from "@/components/reports";
import { useBranches } from "@/hooks/useBranch";
import { useInventoryMovementsReport } from "@/hooks/useReports";
import { exportInventoryMovementsReportPdf } from "@/pdf/utils/exportInventoryMovementsReportPdf";
import { formatDate as formatDatePdf, formatDateTime } from "@/pdf/utils/formatters";
import type {
  InventoryMovementRow,
  ReportsFilterState,
  ReportListParams,
  DateRangePreset,
} from "@/types/reports";
import type {
  InventoryMovementRowPdf,
  InventoryMovementsReportSummary,
} from "@/pdf/inventory/InventoryMovementsReportPdf";

export const Route = createFileRoute("/reports/inventory")({
  component: InventoryReportPage,
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

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const getChangeTypeVariant = (
  type: string
): "default" | "secondary" | "destructive" | "outline" => {
  switch (type) {
    case "SALE":
    case "ORDER_DEDUCTION":
    case "TRANSFER_OUT":
      return "destructive";
    case "REFUND":
    case "TRANSFER_IN":
      return "default";
    case "SET_STOCK":
    case "ADJUST_STOCK":
      return "secondary";
    default:
      return "outline";
  }
};

const formatChangeType = (type: string) =>
  type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

function InventoryReportPage() {
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

  const { data, isLoading, refetch } = useInventoryMovementsReport(listParams, {
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

  const columns: ColumnDef<InventoryMovementRow>[] = useMemo(
    () => [
      {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) => <span className="text-sm">{formatDate(row.original.createdAt)}</span>,
      },
      {
        accessorKey: "product",
        header: "Product",
        cell: ({ row }) => <span className="font-medium">{row.original.product.name}</span>,
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
            <span className={isPositive ? "text-green-600" : "text-destructive"}>
              {isPositive ? "+" : ""}{adj.toFixed(2)}
            </span>
          );
        },
      },
      {
        accessorKey: "reason",
        header: "Reason",
        cell: ({ row }) => row.original.reason || <span className="text-muted-foreground">-</span>,
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
    []
  );

  const rows = data?.data ?? [];
  const meta = data?.meta ?? { page: 1, pageSize: 25, totalItems: 0, totalPages: 0 };

  const handleExportPdf = useCallback(async () => {
    if (!hasFetched || rows.length === 0) return;

    setIsExporting(true);
    try {
      const pdfRows = rows.map(mapToInventoryMovementPdf);

      const summary: InventoryMovementsReportSummary = {
        totalMovements: rows.length,
        totalIncrease: rows.reduce((sum, r) => sum + (r.adjustment > 0 ? r.adjustment : 0), 0),
        totalDecrease: rows.reduce((sum, r) => sum + (r.adjustment < 0 ? Math.abs(r.adjustment) : 0), 0),
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
  }, [hasFetched, rows, mapToInventoryMovementPdf, appliedFilters, branches]);

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

      {hasFetched ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Inventory Movements</h2>
              <p className="text-sm text-muted-foreground">{meta.totalItems} movements found</p>
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
              keys: ["changeType" as keyof InventoryMovementRow],
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
          <h3 className="text-lg font-medium text-foreground mb-2">Generate Inventory Report</h3>
          <p className="text-sm text-muted-foreground max-w-sm">Configure filters above and click Apply to load inventory data.</p>
        </div>
      )}
    </div>
  );
}
