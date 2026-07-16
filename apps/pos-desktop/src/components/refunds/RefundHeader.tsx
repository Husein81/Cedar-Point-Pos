import { useEffect, useState } from "react";
import { Button, DatePicker, Icon, Input, Select } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import { endOfDay, startOfDay, subDays } from "date-fns";
import { useRefundStore } from "@/store/refundStore";

const SEARCH_DEBOUNCE_MS = 300;

type DatePreset = "all" | "today" | "7d" | "30d" | "custom";

const DATE_PRESET_OPTIONS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "custom", label: "Custom range" },
];

const getPresetRange = (
  preset: DatePreset,
): { from: string | null; to: string | null } => {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: startOfDay(now).toISOString(), to: null };
    case "7d":
      return { from: startOfDay(subDays(now, 7)).toISOString(), to: null };
    case "30d":
      return { from: startOfDay(subDays(now, 30)).toISOString(), to: null };
    default:
      return { from: null, to: null };
  }
};

interface RefundHeaderProps {
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const RefundHeader = ({ onRefresh, isRefreshing }: RefundHeaderProps) => {
  const navigate = useNavigate();
  const searchQuery = useRefundStore((s) => s.searchQuery);
  const dateFrom = useRefundStore((s) => s.dateFrom);
  const dateTo = useRefundStore((s) => s.dateTo);
  const setSearchQuery = useRefundStore((s) => s.setSearchQuery);
  const setDateRange = useRefundStore((s) => s.setDateRange);
  const clearFilters = useRefundStore((s) => s.clearFilters);

  const [search, setSearch] = useState(searchQuery);
  const [preset, setPreset] = useState<DatePreset>("all");

  // Debounce the search input so we don't fire a request per keystroke.
  useEffect(() => {
    const timeout = setTimeout(
      () => setSearchQuery(search),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [search, setSearchQuery]);

  const handlePresetChange = (value: DatePreset) => {
    setPreset(value);
    if (value !== "custom") {
      const range = getPresetRange(value);
      setDateRange(range.from, range.to);
    }
  };

  const hasActiveFilters = Boolean(searchQuery || dateFrom || dateTo);

  const handleClear = () => {
    setSearch("");
    setPreset("all");
    clearFilters();
  };

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 bg-background">
      {/* Title & back */}
      <div className="flex items-center gap-3 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: "/" })}
        >
          <Icon name="ArrowLeft" className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Refunds</h1>
          <p className="text-xs text-muted-foreground">
            Find an order, pick the items, process the refund
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative w-64">
          <Icon
            name="Search"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          />
          <Input
            placeholder="Search order # or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Select
          value={preset}
          onChange={(opt) => handlePresetChange(opt.value as DatePreset)}
          options={DATE_PRESET_OPTIONS}
          className="w-36 h-9"
        />

        {preset === "custom" && (
          <>
            <DatePicker
              date={dateFrom ? new Date(dateFrom) : undefined}
              onDateChange={(date) =>
                setDateRange(
                  date ? startOfDay(date).toISOString() : null,
                  dateTo,
                )
              }
            />
            <DatePicker
              date={dateTo ? new Date(dateTo) : undefined}
              onDateChange={(date) =>
                setDateRange(
                  dateFrom,
                  date ? endOfDay(date).toISOString() : null,
                )
              }
            />
          </>
        )}

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-muted-foreground"
          >
            <Icon name="X" className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}

        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <Icon
            name="RefreshCw"
            className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </Button>
      </div>
    </div>
  );
};
