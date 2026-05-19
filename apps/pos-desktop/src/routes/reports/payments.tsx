import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable, Badge, Button, Icon } from "@repo/ui";
import { SummaryGrid } from "@/components/reports";
import { ReportsFilterBar } from "@/components/reports";
import { useBranches } from "@/hooks/useBranch";
import { useReportPageState } from "@/hooks/useReportPageState";
import {
  usePaymentTransactionsReport,
  usePaymentsReport,
} from "@/hooks/useReports";
import { exportPaymentsTransactionsReportPdf } from "@/pdf/utils/exportPaymentsTransactionsReportPdf";
import {
  formatDate as formatDatePdf,
  formatDateTime,
} from "@/pdf/utils/formatters";
import {
  getDateRangeFromPreset,
  formatCurrency,
  formatDate,
  getMethodVariant,
  getTypeLabel,
} from "@/utils/reportHelpers";
import type {
  DateRangePreset,
  PaymentTransactionRow,
  ReportListParams,
} from "@/types/reports";
import type {
  PaymentTransactionRowPdf,
  PaymentsTransactionsReportSummary,
} from "@/pdf/payments/PaymentsTransactionsReportPdf";

export const Route = createFileRoute("/reports/payments")({
  component: PaymentsReportPage,
});

function PaymentsReportPage() {
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

  const mapToPaymentTransactionPdf = useCallback(
    (row: PaymentTransactionRow): PaymentTransactionRowPdf => {
      return {
        date: formatDateTime(row.paidAt),
        orderNumber: row.order.orderNumber || "-",
        method: row.method,
        amount: row.amount,
        currency: row.currencyCode || "-",
        exchangeRate: row.exchangeRate ? String(row.exchangeRate) : "-",
        branch: row.order.branch.name,
        cashier: row.order.user?.name || "-",
        orderType: getTypeLabel(row.order.type),
        orderStatus: row.order.status,
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

  // Fetch Transactions List
  const {
    data,
    isLoading: isListLoading,
    refetch,
  } = usePaymentTransactionsReport(listParams);

  // Fetch Summary Data
  const { data: summaryData, isLoading: isSummaryLoading } =
    usePaymentsReport(appliedFilters);

  const isLoading = isListLoading || isSummaryLoading;

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

  const columns: ColumnDef<PaymentTransactionRow>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "Payment ID",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground font-mono">
            {row.original.id.slice(0, 8)}...
          </span>
        ),
      },
      {
        accessorKey: "paidAt",
        header: "Paid At",
        cell: ({ row }) => (
          <span className="text-sm">{formatDate(row.original.paidAt)}</span>
        ),
      },
      {
        accessorKey: "order.orderNumber",
        header: "Order #",
        cell: ({ row }) => (
          <span className="font-mono font-medium">
            {row.original.order.orderNumber || "-"}
          </span>
        ),
      },
      {
        accessorKey: "order.branch",
        header: "Branch",
        cell: ({ row }) => row.original.order.branch.name,
      },
      {
        accessorKey: "method",
        header: "Method",
        cell: ({ row }) => (
          <Badge variant={getMethodVariant(row.original.method)}>
            {row.original.method}
          </Badge>
        ),
      },
      {
        accessorKey: "currencyCode",
        header: "Currency",
        cell: ({ row }) => row.original.currencyCode || "USD",
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <span className="font-semibold">
            {formatCurrency(
              row.original.amount,
              row.original.currencyCode || "USD",
            )}
          </span>
        ),
      },
      {
        accessorKey: "order.user",
        header: "Cashier",
        cell: ({ row }) =>
          row.original.order.user?.name || (
            <span className="text-muted-foreground">-</span>
          ), // Fixed: use user.name
      },
    ],
    [],
  );

  const rows = data?.data ?? [];
  const meta = data?.pagination ?? {
    page: 1,
    limit: 25,
    totalCount: 0,
    totalPages: 0,
  };

  const handleExportPdf = async () => {
    if (rows.length === 0 || !summaryData) return;

    setIsExporting(true);
    try {
      const pdfRows = rows.map(mapToPaymentTransactionPdf);

      // Use backend summary data for PDF too
      const byMethod = summaryData.paymentBreakdown.map((p) => ({
        method: p.method,
        amount: p.totalAmount,
        count: p.transactionCount,
      }));

      const summary: PaymentsTransactionsReportSummary = {
        totalTransactions: summaryData.paymentsCount,
        totalAmount: summaryData.totalAmount,
        byMethod,
      };

      const tenantName = "CedarPoint POS";
      const branchName = appliedFilters.branchId
        ? branches.find((b) => b.id === appliedFilters.branchId)?.name
        : undefined;
      const dateRange = `${formatDatePdf(appliedFilters.from.toISOString())} - ${formatDatePdf(appliedFilters.to.toISOString())}`;

      const blob = await exportPaymentsTransactionsReportPdf({
        tenantName,
        branchName,
        dateRange,
        summary,
        transactions: pdfRows,
      });

      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (error) {
      console.error("Payments PDF export failed:", error);
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

      {summaryData && (
        <SummaryGrid
          items={[
            {
              title: "Total Payments Amount",
              value: formatCurrency(summaryData.totalAmount),
              icon: "DollarSign",
            },
            {
              title: "Payments Count",
              value: summaryData.paymentsCount.toString(),
              icon: "Activity",
            },
            {
              title: "Most Used Payment Method",
              value: summaryData.mostUsedMethod || "-",
              icon: "CreditCard",
            },
          ]}
          columns="3"
        />
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Payment Transactions</h2>
            <p className="text-sm text-muted-foreground">
              {meta.totalCount} transactions found
            </p>
          </div>
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
            onTermChange: (t) => {
              setSearchTerm(t);
              setPage(1);
            },
            keys: ["method" as keyof PaymentTransactionRow],
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
