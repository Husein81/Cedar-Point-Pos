// OrderTypeSelector.tsx
import { useAuthStore } from "@/store/authStore";
import { useKeypadStore } from "@/store/keypadStore";
import { useOrderStore } from "@/store/orderStore";
import { OrderType } from "@repo/types";
import { Button, cn } from "@repo/ui";
import { useSearch } from "@tanstack/react-router";
import { useEffect } from "react";

export const OrderTypeSelector = () => {
  const { user } = useAuthStore();
  const { switchContext } = useKeypadStore();
  const { getActiveOrder, setOrderType, setShippingFee } = useOrderStore();
  const order = getActiveOrder();
  const search = useSearch({ from: "/orders/" });

  useEffect(() => {
    // If order type is set in URL (e.g. from tables page), use it
    if (search.orderType) {
      const typeFromUrl = search.orderType.toUpperCase() as OrderType;
      setOrderType(typeFromUrl);
      if (typeFromUrl === OrderType.DELIVERY) {
        switchContext("SHIPPING");
      }
    }
  }, [search.orderType, setOrderType, switchContext]);

  const isRestaurant = user?.tenant?.businessType === "RESTAURANT" || false;

  const currentType = order?.type
    ? order.type
    : isRestaurant
      ? "DINE_IN"
      : "RETAIL";

  const selectType = (type: OrderType) => {
    setOrderType(type);

    // Auto-handle shipping
    if (type !== OrderType.DELIVERY) {
      setShippingFee(0);
    }

    if (type === OrderType.DELIVERY) {
      switchContext("SHIPPING");
    }
  };

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
    <div className="flex gap-1 border-b bg-muted p-1">
      {orderTypes.map(({ type, label }) => (
        <Button
          key={type}
          size="sm"
          variant="ghost"
          className={cn(
            "flex-1",
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
