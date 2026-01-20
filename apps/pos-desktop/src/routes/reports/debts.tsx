import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useMemo, useEffect } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable, Badge, Button } from "@repo/ui";
import { DollarSign, FileText, User, CreditCard, FileDown } from "lucide-react";
import { ReportsFilterBar } from "@/components/reports";
import { useBranches } from "@/hooks/useBranch";
import { useDebtsOrdersList, useReportsDebts } from "@/hooks/useReports";
import { exportDebtsReportPdf } from "@/pdf/utils/exportDebtsReportPdf";
import { formatDateTime } from "@/pdf/utils/formatters";
import type {
  DebtOrderRow,
  ReportsFilterState,
  ReportListParams,
  DateRangePreset,
} from "@/types/reports";
import type {
  DebtsOrderRowPdf,
  DebtsReportSummary,
} from "@/pdf/debts/DebtsReportPdf";

export const Route = createFileRoute("/reports/debts")({
  component: DebtsReportPage,
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
// Debts Summary Types
// ============================================================

interface DebtsSummaryData {
  totalDebts: number;
  unpaidOrders: number;
  topDebtorName: string | null;
  topDebtorAmount: number;
}

// ============================================================
// Debts Summary Cards Component
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

interface DebtsSummaryCardsProps {
  summary: DebtsSummaryData;
  isLoading: boolean;
}

function DebtsSummaryCards({ summary, isLoading }: DebtsSummaryCardsProps) {
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
        title="Total Debts"
        value={formatCurrency(summary.totalDebts)}
        icon={<DollarSign className={iconClassName} />}
        subtitle="Sum of all pending orders"
      />
      <SummaryCard
        title="Unpaid Orders"
        value={summary.unpaidOrders.toString()}
        icon={<FileText className={iconClassName} />}
        subtitle="Number of pending orders"
      />
      <SummaryCard
        title="Top Debtor"
        value={summary.topDebtorName || "-"}
        icon={<User className={iconClassName} />}
        subtitle="Customer with highest debt"
      />
      <SummaryCard
        title="Top Debt Amount"
        value={formatCurrency(summary.topDebtorAmount)}
        icon={<CreditCard className={iconClassName} />}
        subtitle="Amount owed by top debtor"
      />
    </div>
  );
}

// ============================================================
// Debts Report Page Component
// ============================================================

function DebtsReportPage() {
  // Date preset state
  const [datePreset, setDatePreset] = useState<DateRangePreset>("today");

  // Filter state
  const [filters, setFilters] = useState<ReportsFilterState>(() => ({
    ...getDateRangeFromPreset("today"),
  }));

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  // Applied filters (only updated on Apply click)
  const [appliedFilters, setAppliedFilters] = useState<ReportsFilterState>(
    () => ({
      ...getDateRangeFromPreset("today"),
    })
  );

  // Track if we've fetched data (for auto-load on mount)
  const [hasFetched, setHasFetched] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch branches for filter dropdown
  const { data: branches = [] } = useBranches();

  // Mapper function to transform DebtOrderRow to DebtsOrderRowPdf
  const mapToDebtOrderPdf = useCallback(
    (row: DebtOrderRow): DebtsOrderRowPdf => {
      return {
        orderNumber: row.orderNumber || "-",
        date: formatDateTime(row.createdAt),
        branch: row.branch.name,
        type: getTypeLabel(row.type),
        subtotal: row.subtotal,
        discount: row.discount,
        total: row.total,
        customer: row.customer?.name || "-",
        cashier: row.cashier?.name || "-",
      };
    },
    []
  );

  // Combined params for debts orders list query
  const listParams: ReportListParams = useMemo(
    () => ({
      ...appliedFilters,
      search: searchTerm || undefined,
      page,
      pageSize,
    }),
    [appliedFilters, searchTerm, page, pageSize]
  );

  // Fetch debts orders (paginated for table)
  const { data, isLoading, refetch } = useDebtsOrdersList(listParams, {
    enabled: hasFetched,
  });

  // Fetch full dataset summary
  const { data: fullDatasetSummary, isLoading: isSummaryLoading } =
    useReportsDebts(appliedFilters, {
      enabled: hasFetched,
    });

  const rows = data?.data || [];
  const meta = data?.meta || {
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
  };

  // Auto-load on first render
  useEffect(() => {
    setHasFetched(true);
  }, []);

  // Calculate summary from full dataset
  const debtsSummary = useMemo((): DebtsSummaryData => {
    if (fullDatasetSummary) {
      return {
        totalDebts: fullDatasetSummary.totalDebts,
        unpaidOrders: fullDatasetSummary.unpaidOrdersCount,
        topDebtorName: fullDatasetSummary.topDebtorName,
        topDebtorAmount: fullDatasetSummary.topDebtorAmount,
      };
    }

    return {
      totalDebts: 0,
      unpaidOrders: 0,
      topDebtorName: null,
      topDebtorAmount: 0,
    };
  }, [fullDatasetSummary]);

  // Export PDF handler
  const handleExportPdf = useCallback(async () => {
    if (!hasFetched || rows.length === 0) return;

    setIsExporting(true);
    try {
      // Transform rows to PDF format
      const pdfRows = rows.map(mapToDebtOrderPdf);

      const summary: DebtsReportSummary = {
        totalDebts: debtsSummary.totalDebts,
        unpaidOrders: debtsSummary.unpaidOrders,
        topDebtorName: debtsSummary.topDebtorName,
        topDebtorAmount: debtsSummary.topDebtorAmount,
      };

      // Prepare metadata
      const tenantName = "PointVerse POS";
      const branchName = appliedFilters.branchId
        ? branches.find((b) => b.id === appliedFilters.branchId)?.name
        : undefined;
      const dateRange = `${formatDate(appliedFilters.from.toISOString())} - ${formatDate(appliedFilters.to.toISOString())}`;

      // Generate PDF
      const blob = await exportDebtsReportPdf({
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
      a.download = `debts-report-${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF export failed:", error);
    } finally {
      setIsExporting(false);
    }
  }, [
    hasFetched,
    rows,
    mapToDebtOrderPdf,
    debtsSummary,
    appliedFilters,
    branches,
  ]);

  // Table columns definition
  const columns: ColumnDef<DebtOrderRow>[] = useMemo(
    () => [
      {
        accessorKey: "orderNumber",
        header: "Order #",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.orderNumber || "-"}</span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) => formatDate(row.original.createdAt),
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
        accessorKey: "subtotal",
        header: "Subtotal",
        cell: ({ row }) => formatCurrency(row.original.subtotal),
      },
      {
        accessorKey: "discount",
        header: "Discount",
        cell: ({ row }) => formatCurrency(row.original.discount),
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
        accessorKey: "customer",
        header: "Customer",
        cell: ({ row }) => row.original.customer?.name || "-",
      },
      {
        accessorKey: "cashier",
        header: "Cashier",
        cell: ({ row }) => row.original.cashier?.name || "-",
      },
    ],
    []
  );

  // Filter handlers
  const handleFiltersChange = useCallback(
    (newFilters: Partial<ReportsFilterState>) => {
      setFilters((prev) => ({ ...prev, ...newFilters }));
    },
    []
  );

  const handleApply = useCallback(() => {
    setAppliedFilters({ ...filters });
    setPage(1);
    setHasFetched(true);
  }, [filters]);

  const handleReset = useCallback(() => {
    const resetFilters = { ...getDateRangeFromPreset("today") };
    setFilters(resetFilters);
    setAppliedFilters(resetFilters);
    setSearchTerm("");
    setPage(1);
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

  // Pagination handlers
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
    setPage(1);
  }, []);

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

      {/* Debts Summary Section */}
      <DebtsSummaryCards summary={debtsSummary} isLoading={isSummaryLoading} />

      {/* Debts Orders Table Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Pending Orders (Debts)</h2>
            <p className="text-sm text-muted-foreground">
              {meta.totalItems} pending orders found
            </p>
          </div>
          {/* PDF Export */}
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
            keys: ["orderNumber" as keyof DebtOrderRow],
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
