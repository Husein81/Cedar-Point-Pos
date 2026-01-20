import { Button, Shad } from "@repo/ui";
import { Calendar, RotateCcw, Search } from "lucide-react";
import type { DateRangePreset, ReportsFilterState } from "@/types/reports";
import type { Branch } from "@repo/types";

interface ReportsFilterBarProps {
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
    showCategory?: boolean;
    categories?: { id: string; name: string }[];
}

const DATE_PRESETS: { value: DateRangePreset; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "this_week", label: "This Week" },
    { value: "this_month", label: "This Month" },
    { value: "custom", label: "Custom" },
];

const ORDER_TYPES = [
    { value: "all", label: "All Order Types" },
    { value: "DINE_IN", label: "Dine In" },
    { value: "TAKEAWAY", label: "Takeaway" },
    { value: "DELIVERY", label: "Delivery" },
];

const PAYMENT_METHODS = [
    { value: "all", label: "All Payments" },
    { value: "CASH", label: "Cash" },
    { value: "CARD", label: "Card" },
    { value: "MIXED", label: "Mixed" },
];

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
    showCategory = false,
    categories = [],
}: ReportsFilterBarProps) => {
    const showBranchSelector = branches.length > 1;
    const showCustomDateInputs = datePreset === "custom";

    const formatDateForInput = (date: Date) => {
        return date.toISOString().split("T")[0];
    };

    const handleCustomDateChange = (field: "from" | "to", value: string) => {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            if (field === "from") {
                date.setHours(0, 0, 0, 0);
            } else {
                date.setHours(23, 59, 59, 999);
            }
            onFiltersChange({ [field]: date });
        }
    };

    return (
        <Shad.Card className="p-4">
            <div className="flex flex-wrap items-center gap-3">
                {/* Date Range Preset */}
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Shad.Select
                        value={datePreset}
                        onValueChange={(value: string) => onDatePresetChange(value as DateRangePreset)}
                    >
                        <Shad.SelectTrigger className="w-[140px]">
                            <Shad.SelectValue placeholder="Select period" />
                        </Shad.SelectTrigger>
                        <Shad.SelectContent>
                            {DATE_PRESETS.map((preset) => (
                                <Shad.SelectItem key={preset.value} value={preset.value}>
                                    {preset.label}
                                </Shad.SelectItem>
                            ))}
                        </Shad.SelectContent>
                    </Shad.Select>
                </div>

                {/* Custom Date Inputs */}
                {showCustomDateInputs && (
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={formatDateForInput(filters.from)}
                            onChange={(e) => handleCustomDateChange("from", e.target.value)}
                            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                        <span className="text-muted-foreground">to</span>
                        <input
                            type="date"
                            value={formatDateForInput(filters.to)}
                            onChange={(e) => handleCustomDateChange("to", e.target.value)}
                            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>
                )}

                {/* Branch Selector */}
                {showBranchSelector && (
                    <Shad.Select
                        value={filters.branchId || "all"}
                        onValueChange={(value: string) =>
                            onFiltersChange({ branchId: value === "all" ? undefined : value })
                        }
                    >
                        <Shad.SelectTrigger className="w-[160px]">
                            <Shad.SelectValue placeholder="All Branches" />
                        </Shad.SelectTrigger>
                        <Shad.SelectContent>
                            <Shad.SelectItem value="all">All Branches</Shad.SelectItem>
                            {branches.map((branch) => (
                                <Shad.SelectItem key={branch.id} value={branch.id}>
                                    {branch.name}
                                </Shad.SelectItem>
                            ))}
                        </Shad.SelectContent>
                    </Shad.Select>
                )}

                {/* Category Selector */}
                {showCategory && (
                    <Shad.Select
                        value={filters.categoryId || "all"}
                        onValueChange={(value: string) =>
                            onFiltersChange({ categoryId: value === "all" ? undefined : value })
                        }
                    >
                        <Shad.SelectTrigger className="w-[160px]">
                            <Shad.SelectValue placeholder="All Categories" />
                        </Shad.SelectTrigger>
                        <Shad.SelectContent>
                            <Shad.SelectItem value="all">All Categories</Shad.SelectItem>
                            {categories.map((category) => (
                                <Shad.SelectItem key={category.id} value={category.id}>
                                    {category.name}
                                </Shad.SelectItem>
                            ))}
                        </Shad.SelectContent>
                    </Shad.Select>
                )}

                {/* Order Type Selector */}
                {!hideOrderType && (
                    <Shad.Select
                        value={filters.orderType || "all"}
                        onValueChange={(value: string) =>
                            onFiltersChange({
                                orderType: value === "all" ? undefined : (value as ReportsFilterState["orderType"]),
                            })
                        }
                    >
                        <Shad.SelectTrigger className="w-[150px]">
                            <Shad.SelectValue placeholder="All Order Types" />
                        </Shad.SelectTrigger>
                        <Shad.SelectContent>
                            {ORDER_TYPES.map((type) => (
                                <Shad.SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                </Shad.SelectItem>
                            ))}
                        </Shad.SelectContent>
                    </Shad.Select>
                )}

                {/* Payment Method Selector */}
                {!hidePaymentMethod && (
                    <Shad.Select
                        value={filters.paymentMethod || "all"}
                        onValueChange={(value: string) =>
                            onFiltersChange({
                                paymentMethod: value === "all" ? undefined : (value as ReportsFilterState["paymentMethod"]),
                            })
                        }
                    >
                        <Shad.SelectTrigger className="w-[140px]">
                            <Shad.SelectValue placeholder="All Payments" />
                        </Shad.SelectTrigger>
                        <Shad.SelectContent>
                            {PAYMENT_METHODS.map((method) => (
                                <Shad.SelectItem key={method.value} value={method.value}>
                                    {method.label}
                                </Shad.SelectItem>
                            ))}
                        </Shad.SelectContent>
                    </Shad.Select>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 ml-auto">
                    <Button variant="outline" size="sm" onClick={onReset} disabled={isLoading}>
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Reset
                    </Button>
                    <Button size="sm" onClick={onApply} disabled={isLoading}>
                        <Search className="h-4 w-4 mr-1" />
                        Apply
                    </Button>
                </div>
            </div>
        </Shad.Card>
    );
};
