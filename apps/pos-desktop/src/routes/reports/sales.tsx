import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable, Badge, Button } from "@repo/ui";
import { FileDown } from "lucide-react";
import { ReportsFilterBar } from "@/components/reports";
import { useBranches } from "@/hooks/useBranch";
import { useSalesOrdersReport } from "@/hooks/useReports";
import { exportSalesReportPdf } from "@/pdf/utils/exportSalesReportPdf";
import { formatDateTime } from "@/pdf/utils/formatters";
import type {
  SalesOrderRow,
  ReportsFilterState,
  ReportListParams,
  DateRangePreset,
} from "@/types/reports";
import type {
  SalesOrderRowPdf,
  SalesReportSummary,
} from "@/pdf/sales/SalesReportPdf";

export const Route = createFileRoute("/reports/sales")({
  component: SalesReportPage,
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

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const getStatusVariant = (
  status: string
): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "COMPLETED":
    case "PAID":
      return "default";
    case "PENDING":
    case "IN_PROGRESS":
    case "CONFIRMED":
      return "secondary";
    case "CANCELLED":
      return "destructive";
    default:
      return "outline";
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case "DINE_IN":
      return "Dine In";
    case "TAKEAWAY":
      return "Takeaway";
    case "DELIVERY":
      return "Delivery";
    case "RETAIL":
      return "Retail";
    default:
      return type;
  }
};

// ============================================================
// Sales Report Page Component
// ============================================================

function SalesReportPage() {
  // Date preset state
  const [datePreset, setDatePreset] = useState<DateRangePreset>("today");

  // Filter state
  const [filters, setFilters] = useState<ReportsFilterState>(() => ({
    ...getDateRangeFromPreset("today"),
  }));

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState("");

  // Applied filters (only updated on Apply click)
  const [appliedFilters, setAppliedFilters] =
    useState<ReportsFilterState>(filters);

  // Track if data has been fetched
  const [hasFetched, setHasFetched] = useState(false);

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Fetch branches for filter dropdown
  const { data: branches = [] } = useBranches();

  // Mapper function to transform SalesOrderRow to SalesOrderRowPdf
  const mapToSalesOrderPdf = useCallback(
    (row: SalesOrderRow): SalesOrderRowPdf => {
      return {
        orderNumber: row.orderNumber || "-",
        date: formatDateTime(row.completedAt ?? row.createdAt),
        branch: row.branch.name,
        type: getTypeLabel(row.type),
        status: row.status,
        total: row.total,
        paymentMethods:
          row.paymentsSummary.methods.map((m) => m.method).join(", ") || "-",
        cashier: row.cashier?.name || "-",
      };
    },
    []
  );

  // Combined params for query
  const listParams: ReportListParams = useMemo(
    () => ({
      ...appliedFilters,
      search: searchTerm || undefined,
      page,
      pageSize,
    }),
    [appliedFilters, searchTerm, page, pageSize]
  );

  // Fetch sales orders
  const { data, isLoading, refetch } = useSalesOrdersReport(listParams, {
    enabled: hasFetched,
  });

  // Handlers
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

  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  }, []);

  // Table columns
  const columns: ColumnDef<SalesOrderRow>[] = useMemo(
    () => [
      {
        accessorKey: "orderNumber",
        header: "Order #",
        cell: ({ row }) => (
          <span className="font-mono font-medium">
            {row.original.orderNumber || "-"}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.original.completedAt ?? row.original.createdAt)}
          </span>
        ),
      },
      {
        accessorKey: "branch",
        header: "Branch",
        cell: ({ row }) => row.original.branch.name,
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => (
          <Badge variant="outline">{getTypeLabel(row.original.type)}</Badge>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={getStatusVariant(row.original.status)}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: "subtotal",
        header: "Subtotal",
        cell: ({ row }) => formatCurrency(row.original.subtotal),
      },
      {
        accessorKey: "discount",
        header: "Discount",
        cell: ({ row }) => {
          const discount = row.original.discount;
          return discount > 0 ? (
            <span className="text-destructive">
              -{formatCurrency(discount)}
            </span>
          ) : (
            "-"
          );
        },
      },
      {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => (
          <span className="font-semibold">
            {formatCurrency(row.original.total)}
          </span>
        ),
      },
      {
        accessorKey: "paymentsSummary",
        header: "Payment Methods",
        cell: ({ row }) => {
          const methods = row.original.paymentsSummary.methods;
          if (methods.length === 0) return "-";
          return methods.map((m) => m.method).join(", ");
        },
      },
      {
        accessorKey: "cashier",
        header: "Cashier",
        cell: ({ row }) =>
          row.original.cashier?.name || (
            <span className="text-muted-foreground">-</span>
          ),
      },
    ],
    []
  );

  const rows = data?.data ?? [];
  const meta = data?.meta ?? {
    page: 1,
    pageSize: 25,
    totalItems: 0,
    totalPages: 0,
  };

  // Export PDF handler
  const handleExportPdf = useCallback(async () => {
    if (!hasFetched || rows.length === 0) return;

    setIsExporting(true);
    try {
      // Transform rows to PDF format
      const pdfRows = rows.map(mapToSalesOrderPdf);

      // Calculate summary from current page data
      const summary: SalesReportSummary = {
        totalRevenue: rows.reduce((sum, r) => sum + r.total, 0),
        totalOrders: rows.length,
        averageOrderValue:
          rows.length > 0
            ? rows.reduce((sum, r) => sum + r.total, 0) / rows.length
            : 0,
      };

      // Prepare metadata
      const tenantName = "PointVerse POS"; // TODO: get from context/store
      const branchName = appliedFilters.branchId
        ? branches.find((b) => b.id === appliedFilters.branchId)?.name
        : undefined;
      const dateRange = `${formatDate(appliedFilters.from.toISOString())} - ${formatDate(appliedFilters.to.toISOString())}`;

      // Generate PDF
      const blob = await exportSalesReportPdf({
        tenantName,
        branchName,
        dateRange,
        summary,
        orders: pdfRows,
      });

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales-report-${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF export failed:", error);
      // TODO: show toast error
    } finally {
      setIsExporting(false);
    }
  }, [hasFetched, rows, mapToSalesOrderPdf, appliedFilters, branches]);

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
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

      {/* Content */}
      {hasFetched ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Sales Orders</h2>
              <p className="text-sm text-muted-foreground">
                {meta.totalItems} orders found
              </p>
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
              onTermChange: handleSearchChange,
              keys: ["orderNumber" as keyof SalesOrderRow],
            }}
            pagination={{
              rows: meta.totalItems,
              page: page,
              pageSize: pageSize,
              totalPages: meta.totalPages,
              onPageChange: handlePageChange,
              onPageSizeChange: handlePageSizeChange,
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <svg
              className="w-8 h-8 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            Generate Sales Report
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Configure filters above and click Apply to load sales data.
          </p>
        </div>
      )}
    </div>
  );
}
