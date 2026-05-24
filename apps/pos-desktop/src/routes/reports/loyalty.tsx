import { ReportsFilterBar, SummaryGrid } from "@/components/reports";
import { getLoyaltyReportColumns } from "@/constants/columns/reportsColumns";
import { useBranches } from "@/hooks/useBranch";
import { useReportPageState } from "@/hooks/useReportPageState";
import {
  useLoyaltySummaryReport,
  useLoyaltyTransactionsReport,
} from "@/hooks/useReports";
import type {
  DateRangePreset,
  LoyaltyTransactionReportRow,
  ReportListParams,
} from "@/types/reports";
import { getDateRangeFromPreset } from "@/utils/reportHelpers";
import { DataTable, Empty } from "@repo/ui";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";

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

  const columns = getLoyaltyReportColumns();

  const rows = data?.data ?? [];
  const pagination = data?.pagination ?? {
    page: 1,
    limit: 10,
    totalCount: 0,
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
            {pagination.totalCount} transactions found
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
              rows: pagination.totalCount,
              page,
              pageSize,
              totalPages: pagination.totalPages,
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
