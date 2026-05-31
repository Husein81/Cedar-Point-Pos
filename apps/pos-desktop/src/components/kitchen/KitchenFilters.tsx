import { OrderStatus } from "@repo/types";
import { Button, cn } from "@repo/ui";
import { ORDER_STATUS_OPTIONS } from "./config";

export type KitchenFilters = {
  orderStatus: OrderStatus | "ALL";
};

type Props = {
  filters: KitchenFilters;
  onFiltersChange: (filters: KitchenFilters) => void;
};

export function KitchenFilters({ filters, onFiltersChange }: Props) {
  const handleOrderStatusChange = (value: KitchenFilters) => {
    onFiltersChange({
      ...filters,
      orderStatus: value.orderStatus,
    });
  };

  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
      {ORDER_STATUS_OPTIONS.map((option) => (
        <Button
          key={option.value}
          variant={filters.orderStatus === option.value ? "default" : "ghost"}
          size="sm"
          onClick={() => handleOrderStatusChange({ orderStatus: option.value })}
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
