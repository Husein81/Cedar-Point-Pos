// OrderTypeSelector.tsx
import { useEffect, useRef } from "react";
import { useOrderStore } from "@/store/orderStore";
import { useModalStore } from "@/store/modalStore";
import { OrderType } from "@repo/types";
import { CustomerSearchList } from "./CustomerSearchList";

export const useDeliveryCustomerEnforcement = () => {
  const { getActiveOrder } = useOrderStore();
  const { openModal } = useModalStore();
  const order = getActiveOrder();
  const prevTypeRef = useRef(order?.type);

  const isDelivery = order?.type === OrderType.DELIVERY;
  const hasCustomer = !!order?.customerId;

  useEffect(() => {
    const wasDelivery = prevTypeRef.current === OrderType.DELIVERY;
    prevTypeRef.current = order?.type;

    if (isDelivery && !hasCustomer && !wasDelivery) {
      openModal(
        "Customer Required",
        <div className="max-w-sm mx-auto">
          <CustomerSearchList />
        </div>,
        "Delivery orders require a customer. Search or add one below.",
      );
    }
  }, [isDelivery, hasCustomer, openModal, order?.type]);

  return {
    isDelivery,
    hasCustomer,
    deliveryNeedsCustomer: isDelivery && !hasCustomer,
  };
};
