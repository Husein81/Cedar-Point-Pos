import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useMemo, useEffect } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable, Badge, Button } from "@repo/ui";
import { FileDown, DollarSign, ShoppingCart, TrendingUp, Award } from "lucide-react";
import { ReportsFilterBar } from "@/components/reports";
import { useBranches } from "@/hooks/useBranch";
import { useSalesOrdersReport, useReportsSales } from "@/hooks/useReports";
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
// Sales Summary Types (colocated in this file)
// ============================================================

interface SalesSummaryData {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  bestOrderType: string | null;
}

// ============================================================
// Sales Summary Cards Component (colocated in this file)
// ============================================================

interface SummaryCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  subtitle?: string;
}

/**
 * Individual summary card component for displaying a single metric.
 * Styled consistently with existing UI patterns.
 */
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

interface SalesSummaryCardsProps {
  summary: SalesSummaryData;
  isLoading: boolean;
}

/**
 * Sales Summary Cards Section
 * Displays key business metrics derived from fetched order data.
 * Renders gracefully when no data is available.
 */
function SalesSummaryCards({ summary, isLoading }: SalesSummaryCardsProps) {
  const iconClassName = "h-4 w-4 text-muted-foreground";

  // Handle loading state with skeleton-like placeholders
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-lg border bg-card p-4 shadow-sm animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-8 w-8 bg-muted rounded-md" />
            </div>
            <div className="mt-2 h-8 w-24 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <SummaryCard
        title="Total Revenue"
        value={formatCurrency(summary.totalRevenue)}
        icon={<DollarSign className={iconClassName} />}
        subtitle="Sum of all completed order totals"
      />
      <SummaryCard
        title="Total Orders"
        value={summary.totalOrders.toLocaleString()}
        icon={<ShoppingCart className={iconClassName} />}
        subtitle="Number of completed orders"
      />
      <SummaryCard
        title="Avg Order Value"
        value={
          summary.totalOrders > 0
            ? formatCurrency(summary.averageOrderValue)
            : "-"
        }
        icon={<TrendingUp className={iconClassName} />}
        subtitle="Revenue per order"
      />
      <SummaryCard
        title="Best Order Type"
        value={
          summary.bestOrderType ? getTypeLabel(summary.bestOrderType) : "-"
        }
        icon={<Award className={iconClassName} />}
        subtitle="Most frequent type"
      />
    </div>
  );
}

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
  // FIX #2: Changed default page size from 25 to 10 to match the first dropdown option
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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

  // ============================================================
  // AUTO-LOAD: Fetch data for "Today" on first render
  // This improves UX by showing data immediately without requiring Apply
  // ============================================================
  useEffect(() => {
    // Only trigger auto-load once on initial mount
    if (!hasFetched) {
      setHasFetched(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Fetch sales orders (paginated for table)
  const { data, isLoading, refetch } = useSalesOrdersReport(listParams, {
    enabled: hasFetched,
  });

  // ============================================================
  // FIX #1: Fetch FULL DATASET summary from backend API
  // This ensures summary cards reflect ALL orders matching filters,
  // NOT just the current page of table data.
  // Uses useReportsSales which returns aggregated totals from backend:
  // - totalRevenue (sum of all orders' totals)
  // - orderCount (total number of orders)
  // - averageOrderValue (revenue / count calculated server-side)
  // ============================================================
  const { data: fullDatasetSummary, isLoading: isSummaryLoading } =
    useReportsSales(appliedFilters, { enabled: hasFetched });

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
    pageSize: 10, // FIX #2: Updated default to match new pageSize default
    totalItems: 0,
    totalPages: 0,
  };

  // ============================================================
  // Use FULL DATASET summary from backend API
  // The summary cards now reflect the ENTIRE result set (all pages),
  // NOT just the currently displayed table rows.
  //
  // Data source: useReportsSales returns aggregated totals computed
  // by the backend for all orders matching the applied filters.
  //
  // bestOrderType is now calculated server-side with business-type awareness:
  // - RETAIL tenants: Compares RETAIL and DELIVERY order types
  // - RESTAURANT tenants: Compares DINE_IN, TAKEAWAY, and DELIVERY order types
  // ============================================================
  const salesSummary = useMemo((): SalesSummaryData => {
    // If we have the full dataset summary from the API, use it
    if (fullDatasetSummary) {
      return {
        // All values from backend API, representing full dataset
        totalRevenue: fullDatasetSummary.totalRevenue,
        totalOrders: fullDatasetSummary.orderCount,
        averageOrderValue: fullDatasetSummary.averageOrderValue,
        bestOrderType: fullDatasetSummary.bestOrderType, // Server-side calculation with business-type filtering
      };
    }

    // Fallback: no data yet
    return {
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      bestOrderType: null,
    };
  }, [fullDatasetSummary]);

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

      {/* ============================================================ */}
      {/* Sales Summary Section */}
      {/* Displays key business metrics derived from fetched order data */}
      {/* ============================================================ */}
      {/* FIX #1: Use isSummaryLoading since summary comes from separate useReportsSales API call */}      <SalesSummaryCards summary={salesSummary} isLoading={isSummaryLoading} />

      {/* ============================================================ */}
      {/* Orders Table Section */}
      {/* Full-featured table with search, pagination, and export */}
      {/* ============================================================ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Sales Orders</h2>
            <p className="text-sm text-muted-foreground">
              {meta.totalItems} orders found
            </p>
          </div>
          {/* PDF Export - kept as outline button for visual de-emphasis */}
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
    </div>
  );
}
