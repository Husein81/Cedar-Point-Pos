import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useMemo, useEffect } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable, Button } from "@repo/ui";
import { FileDown, Users, UserCheck, Trophy, DollarSign } from "lucide-react";
import { ReportsFilterBar } from "@/components/reports";
import { useBranches } from "@/hooks/useBranch";
import { useCustomersReportList, useCustomersReport } from "@/hooks/useReports";
import { exportCustomersReportPdf } from "@/pdf/utils/exportCustomersReportPdf";
import { formatDateTime } from "@/pdf/utils/formatters";
import type {
  CustomerReportRow,
  ReportsFilterState,
  ReportListParams,
  DateRangePreset,
} from "@/types/reports";
import type {
  CustomerReportRowPdf,
  CustomersReportSummary,
} from "@/pdf/customers/CustomersReportPdf";

export const Route = createFileRoute("/reports/customers")({
  component: CustomersReportPage,
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
  });

// ============================================================
// Customers Summary Types
// ============================================================

interface CustomersSummaryData {
  totalCustomers: number;
  activeCustomers: number;
  topCustomerName: string | null;
  topCustomerRevenue: number;
  averageCustomerSpend: number;
}

// ============================================================
// Customers Summary Cards Component
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

interface CustomersSummaryCardsProps {
  summary: CustomersSummaryData;
  isLoading: boolean;
}

function CustomersSummaryCards({ summary, isLoading }: CustomersSummaryCardsProps) {
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
        title="Total Customers"
        value={summary.totalCustomers.toString()}
        icon={<Users className={iconClassName} />}
        subtitle="All customers for tenant"
      />
      <SummaryCard
        title="Active Customers"
        value={summary.activeCustomers.toString()}
        icon={<UserCheck className={iconClassName} />}
        subtitle="Customers with orders in range"
      />
      <SummaryCard
        title="Top Customer"
        value={summary.topCustomerName || "-"}
        icon={<Trophy className={iconClassName} />}
        subtitle="Highest revenue customer"
      />
      <SummaryCard
        title="Avg. Customer Spend"
        value={formatCurrency(summary.averageCustomerSpend)}
        icon={<DollarSign className={iconClassName} />}
        subtitle="Average per active customer"
      />
    </div>
  );
}

// ============================================================
// Customers Report Page Component
// ============================================================

function CustomersReportPage() {
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

  // Mapper function to transform CustomerReportRow to CustomerReportRowPdf
  const mapToCustomerReportPdf = useCallback(
    (row: CustomerReportRow): CustomerReportRowPdf => {
      return {
        name: row.name,
        email: row.email || "-",
        phone: row.phone || "-",
        ordersCount: row.ordersCount,
        totalSpent: row.totalSpent,
        outstandingDebt: row.outstandingDebt,
        lastOrderDate: row.lastOrderDate ? formatDateTime(row.lastOrderDate) : "-",
      };
    },
    []
  );

  // Combined params for list query
  const listParams: ReportListParams = useMemo(
    () => ({
      ...appliedFilters,
      search: searchTerm || undefined,
      page,
      pageSize,
    }),
    [appliedFilters, searchTerm, page, pageSize]
  );

  // Fetch customers list (paginated for table)
  const { data, isLoading, refetch } = useCustomersReportList(listParams, {
    enabled: hasFetched,
  });

  // Fetch full dataset summary
  const { data: fullDatasetSummary, isLoading: isSummaryLoading } =
    useCustomersReport(appliedFilters, {
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
  const customersSummary = useMemo((): CustomersSummaryData => {
    if (fullDatasetSummary) {
      return {
        totalCustomers: fullDatasetSummary.totalCustomers,
        activeCustomers: fullDatasetSummary.activeCustomers,
        topCustomerName: fullDatasetSummary.topCustomerName,
        topCustomerRevenue: fullDatasetSummary.topCustomerRevenue,
        averageCustomerSpend: fullDatasetSummary.averageCustomerSpend,
      };
    }

    return {
      totalCustomers: 0,
      activeCustomers: 0,
      topCustomerName: null,
      topCustomerRevenue: 0,
      averageCustomerSpend: 0,
    };
  }, [fullDatasetSummary]);

  // Export PDF handler
  const handleExportPdf = useCallback(async () => {
    if (!hasFetched || rows.length === 0) return;

    setIsExporting(true);
    try {
      // Transform rows to PDF format
      const pdfRows = rows.map(mapToCustomerReportPdf);

      const summary: CustomersReportSummary = {
        totalCustomers: customersSummary.totalCustomers,
        activeCustomers: customersSummary.activeCustomers,
        topCustomerName: customersSummary.topCustomerName,
        topCustomerRevenue: customersSummary.topCustomerRevenue,
        averageCustomerSpend: customersSummary.averageCustomerSpend,
      };

      // Prepare metadata
      const tenantName = "PointVerse POS";
      const branchName = appliedFilters.branchId
        ? branches.find((b) => b.id === appliedFilters.branchId)?.name
        : undefined;
      const dateRange = `${formatDate(appliedFilters.from.toISOString())} - ${formatDate(appliedFilters.to.toISOString())}`;

      // Generate PDF
      const blob = await exportCustomersReportPdf({
        tenantName,
        branchName,
        dateRange,
        summary,
        customers: pdfRows,
      });

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `customers-report-${new Date().toISOString().split("T")[0]}.pdf`;
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
    mapToCustomerReportPdf,
    customersSummary,
    appliedFilters,
    branches,
  ]);

  // Table columns definition
  const columns: ColumnDef<CustomerReportRow>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Customer Name",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => row.original.email || "-",
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => row.original.phone || "-",
      },
      {
        accessorKey: "ordersCount",
        header: "Orders",
        cell: ({ row }) => row.original.ordersCount,
      },
      {
        accessorKey: "totalSpent",
        header: "Total Spent",
        cell: ({ row }) => (
          <span className="font-semibold">
            {formatCurrency(row.original.totalSpent)}
          </span>
        ),
      },
      {
        accessorKey: "outstandingDebt",
        header: "Outstanding Debt",
        cell: ({ row }) => {
          const debt = row.original.outstandingDebt;
          return debt > 0 ? (
            <span className="text-destructive font-medium">
              {formatCurrency(debt)}
            </span>
          ) : (
            "-"
          );
        },
      },
      {
        accessorKey: "lastOrderDate",
        header: "Last Order",
        cell: ({ row }) =>
          row.original.lastOrderDate ? formatDate(row.original.lastOrderDate) : "-",
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

      {/* Customers Summary Section */}
      <CustomersSummaryCards summary={customersSummary} isLoading={isSummaryLoading} />

      {/* Customers Table Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Customers</h2>
            <p className="text-sm text-muted-foreground">
              {meta.totalItems} customers found
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
            keys: ["name" as keyof CustomerReportRow],
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
