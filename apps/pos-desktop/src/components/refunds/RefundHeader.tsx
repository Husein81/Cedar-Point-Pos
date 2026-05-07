import { Button, DatePicker, Icon, Input, Select } from "@repo/ui";
import { useRefundStore } from "@/store/refundStore";
import { OrderStatus } from "@repo/types";
import { useNavigate } from "@tanstack/react-router";

interface RefundHeaderProps {
  onRefresh: () => void;
}

export const RefundHeader = ({ onRefresh }: RefundHeaderProps) => {
  const navigate = useNavigate();
  const {
    searchQuery,
    setSearchQuery,
    filterDateFrom,
    setFilterDateFrom,
    filterDateTo,
    setFilterDateTo,
    filterStatus,
    setFilterStatus,
    clearFilters,
    ordersLoading,
  } = useRefundStore();

  const statusOptions = [
    { label: "All Statuses", value: "all" },
    { label: "Completed", value: OrderStatus.COMPLETED },
  ];

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-background">
      {/* Title & Back */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: "/" })}
        >
          <Icon name="ArrowLeft" className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Refund Station</h1>
          <p className="text-xs text-muted-foreground">
            Process order-based and item-level refunds
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative w-64">
          <Icon
            name="Search"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          />
          <Input
            placeholder="Search order # or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Date From */}
        <DatePicker
          date={filterDateFrom ? new Date(filterDateFrom) : undefined}
          onDateChange={(date) =>
            setFilterDateFrom(date ? date.toISOString() : null)
          }
        />

        {/* Date To */}
        <DatePicker
          date={filterDateTo ? new Date(filterDateTo) : undefined}
          onDateChange={(date) =>
            setFilterDateTo(date ? date.toISOString() : null)
          }
        />

        {/* Status Filter */}
        <Select
          value={filterStatus || ""}
          onChange={(opt) =>
            setFilterStatus((opt.value as OrderStatus) || null)
          }
          options={statusOptions}
          className="w-32 h-9"
        />

        {/* Clear Filters */}
        {(searchQuery || filterDateFrom || filterDateTo || filterStatus) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            <Icon name="X" className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}

        {/* Refresh */}
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={ordersLoading}
        >
          <Icon
            name="RefreshCw"
            className={`w-4 h-4 ${ordersLoading ? "animate-spin" : ""}`}
          />
        </Button>
      </div>
    </div>
  );
};
