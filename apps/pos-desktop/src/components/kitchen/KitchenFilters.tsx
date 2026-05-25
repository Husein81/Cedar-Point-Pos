import { OrderStatus } from "@repo/types";
import { Button, cn } from "@repo/ui";

export interface KitchenFilters {
  orderStatus: OrderStatus | "ALL";
}

interface KitchenFiltersProps {
  filters: KitchenFilters;
  onFiltersChange: (filters: KitchenFilters) => void;
}

const ORDER_STATUS_OPTIONS: Array<{
  label: string;
  value: OrderStatus | "ALL";
}> = [
  { label: "All", value: "ALL" },
  { label: "Sent to Kitchen", value: OrderStatus.SENT_TO_KITCHEN },
  { label: "Preparing", value: OrderStatus.IN_PROGRESS },
  { label: "Ready", value: OrderStatus.READY },
  { label: "Confirmed", value: OrderStatus.CONFIRMED },
];

export function KitchenFilters({
  filters,
  onFiltersChange,
}: KitchenFiltersProps) {
  const handleOrderStatusChange = (value: OrderStatus | "ALL") => {
    onFiltersChange({
      ...filters,
      orderStatus: value,
    });
  };

  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
      {ORDER_STATUS_OPTIONS.map((option) => (
        <Button
          key={option.value}
          variant={filters.orderStatus === option.value ? "default" : "ghost"}
          size="sm"
          onClick={() => handleOrderStatusChange(option.value)}
          className={cn(
            "relative",
            filters.orderStatus === option.value && "shadow-sm",
          )}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
