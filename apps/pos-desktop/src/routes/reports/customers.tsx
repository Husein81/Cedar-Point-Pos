import { ReportsFilterBar, SummaryGrid } from "@/components/reports";
import { useBranches } from "@/hooks/useBranch";
import { useReportPageState } from "@/hooks/useReportPageState";
import { useCustomersReport, useCustomersReportList } from "@/hooks/useReports";
import type {
  CustomerReportRowPdf,
  CustomersReportSummary,
} from "@/pdf/customers/CustomersReportPdf";
import { exportCustomersReportPdf } from "@/pdf/utils/exportCustomersReportPdf";
import { formatDateTime } from "@/pdf/utils/formatters";
import type {
  CustomerReportRow,
  DateRangePreset,
  ReportListParams,
} from "@/types/reports";
import {
  formatCurrency,
  formatDate,
  getDateRangeFromPreset,
} from "@/utils/reportHelpers";
import { Button, DataTable, Icon } from "@repo/ui";
import { createFileRoute } from "@tanstack/react-router";
import { ColumnDef } from "@tanstack/react-table";
import { useCallback, useMemo } from "react";

export const Route = createFileRoute("/reports/customers")({
  component: CustomersReportPage,
});

interface CustomersSummaryData {
  totalCustomers: number;
  activeCustomers: number;
  topCustomerName: string | null;
  topCustomerRevenue: number;
  averageCustomerSpend: number;
}

function CustomersReportPage() {
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
        lastOrderDate: row.lastOrderDate
          ? formatDateTime(row.lastOrderDate)
          : "-",
      };
    },
    [],
  );

  // Combined params for list query
  const listParams: ReportListParams = useMemo(
    () => ({
      ...appliedFilters,
      search: searchTerm || undefined,
      page,
      pageSize,
    }),
    [appliedFilters, searchTerm, page, pageSize],
  );

  // Fetch customers list (paginated for table)
  const { data, isLoading, refetch } = useCustomersReportList(listParams);

  // Fetch full dataset summary
  const { data: fullDatasetSummary, isLoading: isSummaryLoading } =
    useCustomersReport(appliedFilters);

  const rows = data?.data || [];
  const meta = data?.pagination || {
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0,
  };

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
  const handleExportPdf = async () => {
    if (rows.length === 0) return;

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
      const tenantName = "CedarPoint POS";
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
  };

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
          row.original.lastOrderDate
            ? formatDate(row.original.lastOrderDate)
            : "-",
      },
    ],
    [],
  );

  // Filter handlers
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
    setPage(1);
  };

  const handleReset = () => {
    const resetFilters = { ...getDateRangeFromPreset("today") };
    setFilters(resetFilters);
    setAppliedFilters(resetFilters);
    setSearchTerm("");
    setPage(1);
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
        isLoading={isLoading}
        datePreset={datePreset}
        onDatePresetChange={handleDatePresetChange}
      />

      {/* Customers Summary Section */}
      <SummaryGrid
        items={[
          {
            title: "Total Customers",
            value: customersSummary.totalCustomers.toString(),
            icon: "Users",
            subtitle: "All customers for tenant",
          },
          {
            title: "Active Customers",
            value: customersSummary.activeCustomers.toString(),
            icon: "UserCheck",
            subtitle: "Customers with orders in range",
          },
          {
            title: "Top Customer",
            value: customersSummary.topCustomerName || "-",
            icon: "Trophy",
            subtitle: "Highest revenue customer",
          },
          {
            title: "Avg. Customer Spend",
            value: formatCurrency(customersSummary.averageCustomerSpend),
            icon: "DollarSign",
            subtitle: "Average per active customer",
          },
        ]}
        isLoading={isSummaryLoading}
        columns={"4"}
      />

      {/* Customers Table Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Customers</h2>
            <p className="text-sm text-muted-foreground">
              {meta.totalCount} customers found
            </p>
          </div>
          {/* PDF Export */}
          <Button
            onClick={handleExportPdf}
            disabled={rows.length === 0 || isExporting}
            variant="outline"
            isSubmitting={isExporting}
          >
            <Icon name="FileDown" className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          onRefetch={() => refetch()}
          search={{
            term: searchTerm,
            onTermChange: (term) => {
              setSearchTerm(term);
              setPage(1);
            },
            keys: ["name" as keyof CustomerReportRow],
          }}
          pagination={{
            rows: meta.totalCount,
            page: page,
            pageSize: pageSize,
            totalPages: meta.totalPages,
            onPageChange: setPage,
            onPageSizeChange: (size) => {
              setPageSize(size);
              setPage(1);
            },
          }}
        />
      </div>
    </div>
  );
}
