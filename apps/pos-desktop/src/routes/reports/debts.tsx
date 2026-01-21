import { ReportsFilterBar, SummaryGrid } from "@/components/reports";
import { useBranches } from "@/hooks/useBranch";
import { useReportPageState } from "@/hooks/useReportPageState";
import { useDebtsOrdersList, useReportsDebts } from "@/hooks/useReports";
import type {
  DebtsOrderRowPdf,
  DebtsReportSummary,
} from "@/pdf/debts/DebtsReportPdf";
import { exportDebtsReportPdf } from "@/pdf/utils/exportDebtsReportPdf";
import { formatDate, formatDateTime } from "@/pdf/utils/formatters";
import type {
  DateRangePreset,
  DebtOrderRow,
  ReportListParams,
} from "@/types/reports";
import {
  formatCurrency,
  getDateRangeFromPreset,
  getTypeLabel,
} from "@/utils/reportHelpers";
import { Badge, Button, DataTable, Icon } from "@repo/ui";
import { createFileRoute } from "@tanstack/react-router";
import { ColumnDef } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo } from "react";

export const Route = createFileRoute("/reports/debts")({
  component: DebtsReportPage,
});

interface DebtsSummaryData {
  totalDebts: number;
  unpaidOrders: number;
  topDebtorName: string | null;
  topDebtorAmount: number;
}

function DebtsReportPage() {
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
    [],
  );

  // Combined params for debts orders list query
  const listParams: ReportListParams = useMemo(
    () => ({
      ...appliedFilters,
      search: searchTerm || undefined,
      page,
      pageSize,
    }),
    [appliedFilters, searchTerm, page, pageSize],
  );

  // Fetch debts orders (paginated for table)
  const { data, isLoading, refetch } = useDebtsOrdersList(listParams);

  // Fetch full dataset summary
  const { data: fullDatasetSummary, isLoading: isSummaryLoading } =
    useReportsDebts(appliedFilters);

  const rows = data?.data || [];
  const meta = data?.meta || {
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
  };

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
  const handleExportPdf = async () => {
    if (rows.length === 0) return;

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
  };

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

      {/* Debts Summary Section */}
      <SummaryGrid
        items={[
          {
            title: "Total Debts",
            value: formatCurrency(debtsSummary.totalDebts),
            icon: "DollarSign",
            subtitle: "Sum of all pending orders",
          },
          {
            title: "Unpaid Orders",
            value: debtsSummary.unpaidOrders.toString(),
            icon: "FileText",
            subtitle: "Number of pending orders",
          },
          {
            title: "Top Debtor",
            value: debtsSummary.topDebtorName || "-",
            icon: "User",
            subtitle: "Customer with highest debt",
          },
          {
            title: "Top Debt Amount",
            value: formatCurrency(debtsSummary.topDebtorAmount),
            icon: "CreditCard",
            subtitle: "Amount owed by top debtor",
          },
        ]}
        isLoading={isSummaryLoading}
        columns={"4"}
      />

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
            keys: ["orderNumber" as keyof DebtOrderRow],
          }}
          pagination={{
            rows: meta.totalItems,
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
