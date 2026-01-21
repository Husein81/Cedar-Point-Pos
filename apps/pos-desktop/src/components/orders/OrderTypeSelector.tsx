// OrderTypeSelector.tsx
import { useAuthStore } from "@/store/authStore";
import { useOrderStore } from "@/store/orderStore";
import { OrderType } from "@repo/types";
import { Button, cn } from "@repo/ui";

export const OrderTypeSelector = () => {
  const { user } = useAuthStore();
  const { getActiveOrder, setOrderType, setShippingFee } = useOrderStore();
  const order = getActiveOrder();

  const currentType = order?.type;

  const selectType = (type: OrderType) => {
    setOrderType(type);

    // Auto-handle shipping
    if (type !== OrderType.DELIVERY) {
      setShippingFee(0);
    }
  };
  const isRestaurant = user?.tenant?.businessType === "RESTAURANT" || false;

  const orderTypes = isRestaurant
    ? [
        { type: OrderType.DINE_IN, label: "Dine-In" },
        { type: OrderType.TAKEAWAY, label: "Takeaway" },
        { type: OrderType.DELIVERY, label: "Delivery" },
      ]
    : [
        { type: OrderType.RETAIL, label: "Pickup" },
        { type: OrderType.DELIVERY, label: "Delivery" },
      ];

  return (
    <div className="flex gap-1 border-b bg-muted p-1 rounded-xs">
      {orderTypes.map(({ type, label }) => (
        <Button
          key={type}
          size="sm"
          variant="ghost"
          className={cn(
            "flex-1 rounded-xs",
            currentType === type && "bg-primary/15 text-primary",
          )}
          onClick={() => selectType(type)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
};
