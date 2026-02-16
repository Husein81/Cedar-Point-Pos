import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge, DataTable, Empty } from "@repo/ui";
import { SummaryGrid } from "@/components/reports";
import { ReportsFilterBar } from "@/components/reports";
import { useBranches } from "@/hooks/useBranch";
import { useReportPageState } from "@/hooks/useReportPageState";
import {
  useLoyaltySummaryReport,
  useLoyaltyTransactionsReport,
} from "@/hooks/useReports";
import {
  getDateRangeFromPreset,
  formatCurrency,
  formatDate,
} from "@/utils/reportHelpers";
import type {
  DateRangePreset,
  LoyaltyTransactionReportRow,
  ReportListParams,
} from "@/types/reports";

export const Route = createFileRoute("/reports/loyalty")({
  component: LoyaltyReportPage,
});

function LoyaltyReportPage() {
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
  } = useReportPageState("today");

  const { data: branches = [] } = useBranches();

  const listParams: ReportListParams = useMemo(
    () => ({
      ...appliedFilters,
      search: searchTerm || undefined,
      page,
      pageSize,
    }),
    [appliedFilters, searchTerm, page, pageSize],
  );

  // Fetch Summary
  const { data: summaryData, isLoading: isSummaryLoading } =
    useLoyaltySummaryReport(listParams);

  // Fetch Transactions List
  const {
    data,
    isLoading: isListLoading,
    refetch,
  } = useLoyaltyTransactionsReport(listParams);

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

  const columns: ColumnDef<LoyaltyTransactionReportRow>[] = useMemo(
    () => [
      {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-sm">{formatDate(row.original.createdAt)}</span>
        ),
      },
      {
        accessorKey: "customer",
        header: "Customer",
        cell: ({ row }) =>
          row.original.customer?.name || (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => (
          <span className="text-sm capitalize">
            {row.original.type.toLowerCase().replace(/_/g, " ")}
          </span>
        ),
      },
      {
        accessorKey: "direction",
        header: "Direction",
        cell: ({ row }) => {
          const dir = row.original.direction;
          return (
            <Badge variant={dir === "CREDIT" ? "default" : "destructive"}>
              {dir}
            </Badge>
          );
        },
      },
      {
        accessorKey: "points",
        header: "Points",
        cell: ({ row }) => {
          const dir = row.original.direction;
          const pts = row.original.points;
          return (
            <span
              className={`font-semibold ${dir === "CREDIT" ? "text-green-600" : "text-red-600"}`}
            >
              {dir === "CREDIT" ? "+" : "-"}
              {pts.toLocaleString()}
            </span>
          );
        },
      },
      {
        accessorKey: "moneyAmount",
        header: "Money Amount",
        cell: ({ row }) =>
          row.original.moneyAmount != null ? (
            <span>{formatCurrency(row.original.moneyAmount)}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        accessorKey: "balanceAfter",
        header: "Balance After",
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.balanceAfter.toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "order",
        header: "Order / Refund",
        cell: ({ row }) => {
          const { order, refund } = row.original;
          if (order) {
            return (
              <span className="font-mono text-sm">
                {order.orderNumber || order.id.slice(0, 8)}
              </span>
            );
          }
          if (refund) {
            return (
              <span className="font-mono text-sm text-muted-foreground">
                Refund {refund.id.slice(0, 8)}
              </span>
            );
          }
          return <span className="text-muted-foreground">-</span>;
        },
      },
      {
        accessorKey: "actorUser",
        header: "Actor",
        cell: ({ row }) =>
          row.original.actorUser?.name || (
            <span className="text-muted-foreground">System</span>
          ),
      },
      {
        accessorKey: "reason",
        header: "Reason",
        cell: ({ row }) =>
          row.original.reason || (
            <span className="text-muted-foreground">-</span>
          ),
      },
    ],
    [],
  );

  const rows = data?.data ?? [];
  const meta = data?.pagination ?? {
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
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
        hideOrderType
        hidePaymentMethod
      />

      {summaryData && (
        <SummaryGrid
          items={[
            {
              title: "Total Accounts",
              value: summaryData.totalAccounts.toLocaleString(),
              icon: "Users",
            },
            {
              title: "Points in Circulation",
              value: summaryData.totalPointsInCirculation.toLocaleString(),
              icon: "Award",
            },
            {
              title: "Lifetime Earned",
              value: summaryData.totalLifetimeEarned.toLocaleString(),
              icon: "TrendingUp",
            },
            {
              title: "Lifetime Redeemed",
              value: summaryData.totalLifetimeRedeemed.toLocaleString(),
              icon: "ShoppingCart",
            },
          ]}
          columns="4"
        />
      )}

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Loyalty Transactions</h2>
          <p className="text-sm text-muted-foreground">
            {meta.totalItems} transactions found
            {summaryData
              ? ` — ${summaryData.transactionsInPeriod} in selected period`
              : ""}
          </p>
        </div>

        {!isLoading && rows.length === 0 ? (
          <Empty
            title="No Loyalty Transactions"
            description="No loyalty transactions were found for the selected date range."
          />
        ) : (
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
              keys: ["type" as keyof LoyaltyTransactionReportRow],
            }}
            pagination={{
              rows: meta.totalItems,
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
        )}
      </div>
    </div>
  );
}
