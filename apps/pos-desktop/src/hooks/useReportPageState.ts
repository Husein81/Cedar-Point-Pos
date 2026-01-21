import { useState, useCallback } from "react";
import type { ReportsFilterState, DateRangePreset } from "@/types/reports";
import { getDateRangeFromPreset } from "@/utils/reportHelpers";

/**
 * Custom hook for managing report page state
 */
export const useReportPageState = (
  initialPreset: DateRangePreset = "today",
) => {
  const [datePreset, setDatePreset] = useState<DateRangePreset>(initialPreset);
  const [filters, setFilters] = useState<ReportsFilterState>(() =>
    getDateRangeFromPreset(initialPreset),
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedFilters, setAppliedFilters] =
    useState<ReportsFilterState>(filters);
  const [hasFetched, setHasFetched] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleApplyFilters = useCallback((newFilters: ReportsFilterState) => {
    setAppliedFilters(newFilters);
    setPage(1);
    setHasFetched(false);
  }, []);

  const handleResetFilters = useCallback(() => {
    const preset: DateRangePreset = "today";
    setDatePreset(preset);
    setFilters(getDateRangeFromPreset(preset));
    setAppliedFilters(getDateRangeFromPreset(preset));
    setSearchTerm("");
    setPage(1);
    setHasFetched(false);
  }, []);

  return {
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
    hasFetched,
    setHasFetched,
    isExporting,
    setIsExporting,
    handleApplyFilters,
    handleResetFilters,
  };
};
