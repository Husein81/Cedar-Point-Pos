import { OrderType } from "@repo/types";
import { Button, cn } from "@repo/ui";

export interface KitchenFilters {
  orderType: OrderType | "ALL";
}

interface KitchenFiltersProps {
  filters: KitchenFilters;
  onFiltersChange: (filters: KitchenFilters) => void;
}

const ORDER_TYPE_OPTIONS: Array<{
  label: string;
  value: OrderType | "ALL";
}> = [
  { label: "All", value: "ALL" },
  { label: "Dine In", value: OrderType.DINE_IN },
  { label: "Delivery", value: OrderType.DELIVERY },
  { label: "Takeaway", value: OrderType.TAKEAWAY },
];

export function KitchenFilters({
  filters,
  onFiltersChange,
}: KitchenFiltersProps) {
  const handleOrderTypeChange = (value: OrderType | "ALL") => {
    onFiltersChange({
      ...filters,
      orderType: value,
    });
  };

  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
      {ORDER_TYPE_OPTIONS.map((option) => (
        <Button
          key={option.value}
          variant={filters.orderType === option.value ? "default" : "ghost"}
          size="sm"
          onClick={() => handleOrderTypeChange(option.value)}
          className={cn(
            "relative",
            filters.orderType === option.value && "shadow-sm",
          )}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

