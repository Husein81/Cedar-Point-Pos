import { useState, useCallback } from "react";
import type { ReportsFilterState, DateRangePreset } from "@/dto/reports.dto";
import { getDateRangeFromPreset } from "@/utils/reportHelpers";
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination";

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
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedFilters, setAppliedFilters] =
    useState<ReportsFilterState>(filters);
  const [isExporting, setIsExporting] = useState(false);

  const handleApplyFilters = useCallback((newFilters: ReportsFilterState) => {
    setAppliedFilters(newFilters);
    setPage(1);
  }, []);

  const handleResetFilters = useCallback(() => {
    const preset: DateRangePreset = "today";
    setDatePreset(preset);
    setFilters(getDateRangeFromPreset(preset));
    setAppliedFilters(getDateRangeFromPreset(preset));
    setSearchTerm("");
    setPage(1);
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
    isExporting,
    setIsExporting,
    handleApplyFilters,
    handleResetFilters,
  };
};
