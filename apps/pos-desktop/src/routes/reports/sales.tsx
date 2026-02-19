import { ReportsFilterBar, SummaryGrid } from "@/components/reports";
import { useBranches } from "@/hooks/useBranch";
import { useShifts } from "@/hooks/useShifts";
import { useReportPageState } from "@/hooks/useReportPageState";
import { useReportsSales, useSalesOrdersReport } from "@/hooks/useReports";
import type {
  SalesOrderRowPdf,
  SalesReportSummary,
} from "@/pdf/sales/SalesReportPdf";
import { exportSalesReportPdf } from "@/pdf/utils/exportSalesReportPdf";
import { formatDateTime } from "@/pdf/utils/formatters";
import type {
  DateRangePreset,
  ReportListParams,
  SalesOrderRow,
} from "@/types/reports";
import {
  formatCurrency,
  formatDate,
  getDateRangeFromPreset,
  getStatusVariant,
  getTypeLabel,
} from "@/utils/reportHelpers";
import { Badge, Button, DataTable, Icon } from "@repo/ui";
import { createFileRoute } from "@tanstack/react-router";
import { ColumnDef } from "@tanstack/react-table";
import { useCallback, useMemo } from "react";

export const Route = createFileRoute("/reports/sales")({
  component: SalesReportPage,
});

interface SalesSummaryData {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  bestOrderType: string | null;
}

function SalesReportPage() {
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

  const { data: shiftsData } = useShifts({ limit: 50 });
  const shiftOptions = useMemo(
    () =>
      (shiftsData?.data ?? []).map((s) => ({
        id: s.id,
        label: `${new Date(s.startTime).toLocaleDateString()} (${s.status})`,
      })),
    [shiftsData],
  );

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

  const { data, isLoading, refetch } = useSalesOrdersReport(listParams);

  const { data: fullDatasetSummary, isLoading: isSummaryLoading } =
    useReportsSales(appliedFilters);

  const handleFiltersChange = (updates: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

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

  const handleSearchChange = useCallback(
    (term: string) => {
      setSearchTerm(term);
      setPage(1);
    },
    [setSearchTerm, setPage],
  );

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
    [],
  );

  const salesSummary = useMemo((): SalesSummaryData => {
    if (fullDatasetSummary) {
      return {
        totalRevenue: fullDatasetSummary.totalRevenue,
        totalOrders: fullDatasetSummary.orderCount,
        averageOrderValue: fullDatasetSummary.averageOrderValue,
        bestOrderType: fullDatasetSummary.bestOrderType,
      };
    }

    return {
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      bestOrderType: null,
    };
  }, [fullDatasetSummary]);

  const rows = data?.data ?? [];
  const meta = data?.meta ?? {
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
  };

  const handleExportPdf = async () => {
    if (rows.length === 0) return;

    setIsExporting(true);
    try {
      const pdfRows = rows.map(mapToSalesOrderPdf);

      const summary: SalesReportSummary = {
        totalRevenue: rows.reduce((sum, r) => sum + r.total, 0),
        totalOrders: rows.length,
        averageOrderValue:
          rows.length > 0
            ? rows.reduce((sum, r) => sum + r.total, 0) / rows.length
            : 0,
      };

      const tenantName = "PointVerse POS";
      const branchName = appliedFilters.branchId
        ? branches.find((b) => b.id === appliedFilters.branchId)?.name
        : undefined;
      const dateRange = `${formatDate(appliedFilters.from.toISOString())} - ${formatDate(appliedFilters.to.toISOString())}`;

      const blob = await exportSalesReportPdf({
        tenantName,
        branchName,
        dateRange,
        summary,
        orders: pdfRows,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales-report-${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const summaryItems = [
    {
      title: "Total Revenue",
      value: formatCurrency(salesSummary.totalRevenue),
      icon: "DollarSign",
      subtitle: "Sum of all completed order totals",
    },
    {
      title: "Total Orders",
      value: salesSummary.totalOrders.toLocaleString(),
      icon: "ShoppingCart",
      subtitle: "Number of completed orders",
    },
    {
      title: "Avg Order Value",
      value:
        salesSummary.totalOrders > 0
          ? formatCurrency(salesSummary.averageOrderValue)
          : "-",
      icon: "TrendingUp",
      subtitle: "Revenue per order",
    },
    {
      title: "Best Order Type",
      value: salesSummary.bestOrderType
        ? getTypeLabel(salesSummary.bestOrderType)
        : "-",
      icon: "Award",
      subtitle: "Most frequent type",
    },
  ];

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
        shifts={shiftOptions}
      />

      <SummaryGrid
        items={summaryItems}
        isLoading={isSummaryLoading}
        columns="4"
      />

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
            disabled={rows.length === 0 || isExporting}
            variant="outline"
          >
            <Icon name="FileDown" className="mr-2 h-4 w-4" />
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
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
          }}
        />
      </div>
    </div>
  );
}
