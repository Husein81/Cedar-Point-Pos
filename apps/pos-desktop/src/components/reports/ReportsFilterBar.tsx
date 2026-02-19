import type { DateRangePreset, ReportsFilterState } from "@/types/reports";
import type { Branch } from "@repo/types";
import { Button, DatePicker, Icon, Select, Shad } from "@repo/ui";
import { DATE_PRESETS, ORDER_TYPES, PAYMENT_METHODS } from "./config";

type ReportsFilterBarProps = {
  filters: ReportsFilterState;
  onFiltersChange: (filters: Partial<ReportsFilterState>) => void;
  onApply: () => void;
  onReset: () => void;
  branches: Branch[];
  isLoading?: boolean;
  datePreset: DateRangePreset;
  onDatePresetChange: (preset: DateRangePreset) => void;
  hideOrderType?: boolean;
  hidePaymentMethod?: boolean;
  hideShiftFilter?: boolean;
  showCategory?: boolean;
  categories?: { id: string; name: string }[];
  shifts?: { id: string; label: string }[];
};

export const ReportsFilterBar = ({
  filters,
  onFiltersChange,
  onApply,
  onReset,
  branches,
  isLoading,
  datePreset,
  onDatePresetChange,
  hideOrderType = false,
  hidePaymentMethod = false,
  hideShiftFilter = false,
  showCategory = false,
  categories = [],
  shifts = [],
}: ReportsFilterBarProps) => {
  const showBranchSelector = branches.length > 1;
  const showCustomDateInputs = datePreset === "custom";

  return (
    <Shad.Card className="p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Date Range Preset */}
        <div className="flex items-center gap-2">
          <Icon name="Calendar" className="h-4 w-4 text-muted-foreground" />
          <Select
            value={datePreset}
            onChange={(opt) => onDatePresetChange(opt.value as DateRangePreset)}
            className="w-35"
            options={DATE_PRESETS}
          />
        </div>

        {/* Custom Date Inputs */}
        {showCustomDateInputs && (
          <div className="flex items-center gap-2">
            <DatePicker
              date={filters.from}
              onDateChange={(date) => onFiltersChange({ from: date })}
            />
            <span className="text-muted-foreground">to</span>
            <DatePicker
              date={filters.to}
              onDateChange={(date) => onFiltersChange({ to: date })}
            />
          </div>
        )}

        {/* Branch Selector */}
        {showBranchSelector && (
          <Select
            value={filters.branchId || "all"}
            onChange={(opt) =>
              onFiltersChange({
                branchId:
                  opt.value === "all" ? undefined : (opt.value as string),
              })
            }
            className="w-40"
            options={branches.map((branch) => ({
              value: branch.id,
              label: branch.name,
            }))}
          />
        )}

        {/* Category Selector */}
        {showCategory && (
          <Select
            value={filters.categoryId || "all"}
            onChange={(opt) =>
              onFiltersChange({
                categoryId:
                  opt.value === "all" ? undefined : (opt.value as string),
              })
            }
            className="w-40"
            options={[
              { value: "all", label: "All Categories" },
              ...categories.map((category) => ({
                value: category.id,
                label: category.name,
              })),
            ]}
          />
        )}

        {/* Order Type Selector */}
        {!hideOrderType && (
          <Select
            value={filters.orderType || "all"}
            onChange={(opt) =>
              onFiltersChange({
                orderType:
                  opt.value === "all"
                    ? undefined
                    : (opt.value as ReportsFilterState["orderType"]),
              })
            }
            className="w-37"
            options={ORDER_TYPES}
          />
        )}

        {/* Payment Method Selector */}
        {!hidePaymentMethod && (
          <Select
            value={filters.paymentMethod || "all"}
            onChange={(opt) =>
              onFiltersChange({
                paymentMethod:
                  opt.value === "all"
                    ? undefined
                    : (opt.value as ReportsFilterState["paymentMethod"]),
              })
            }
            className="w-35"
            options={PAYMENT_METHODS}
          />
        )}

        {/* Shift Selector */}
        {!hideShiftFilter && shifts.length > 0 && (
          <Select
            value={filters.shiftId || "all"}
            onChange={(opt) =>
              onFiltersChange({
                shiftId:
                  opt.value === "all" ? undefined : (opt.value as string),
              })
            }
            className="w-40"
            options={[
              { value: "all", label: "All Shifts" },
              ...shifts.map((shift) => ({
                value: shift.id,
                label: shift.label,
              })),
            ]}
          />
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={isLoading}
          >
            <Icon name="RotateCcw" className="h-4 w-4 mr-1" />
            Reset
          </Button>
          <Button size="sm" onClick={onApply} disabled={isLoading}>
            <Icon name="Search" className="h-4 w-4 mr-1" />
            Apply
          </Button>
        </div>
      </div>
    </Shad.Card>
  );
};
