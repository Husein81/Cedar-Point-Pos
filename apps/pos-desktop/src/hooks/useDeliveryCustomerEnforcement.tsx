import { CustomerSearchList } from "@/components/orders/CustomerSearchList";
import { DeliveryAddressPrompt } from "@/components/orders/DeliveryAddressPrompt";
import { useModalStore } from "@/store/modalStore";
import { useOrderStore } from "@/store/orderStore";
import { OrderType } from "@repo/types";
import { useEffect, useRef } from "react";
import { useCustomer } from "./useCustomer";

export const useDeliveryCustomerEnforcement = () => {
  const { getActiveOrder } = useOrderStore();
  const { openModal } = useModalStore();
  const order = getActiveOrder();
  const prevTypeRef = useRef(order?.type);

  const isDelivery = order?.type === OrderType.DELIVERY;
  const hasCustomer = !!order?.customerId;
  const hasAddress = !!order?.customerAddress;

  // Fetch customer details to check address when a customer is selected
  const { data: customerDetails } = useCustomer(
    isDelivery && hasCustomer ? order!.customerId : null,
  );

  // When switching to delivery and no customer assigned → prompt customer search
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

  // When delivery + customer selected but no address → prompt for address
  useEffect(() => {
    if (!isDelivery || !hasCustomer || hasAddress) return;

    // Wait for customer details to load
    if (!customerDetails) return;

    if (!customerDetails.address) {
      openModal(
        "Delivery Address Required",
        <DeliveryAddressPrompt
          customerId={order!.customerId!}
          customerName={order!.customerName ?? "Customer"}
        />,
        "A delivery address is required to proceed.",
      );
    } else {
      // Customer has address on server — sync it to the local order
      const { setCustomer } = useOrderStore.getState();
      setCustomer(
        order!.customerId!,
        order!.customerName ?? "Customer",
        customerDetails.address,
      );
    }
  }, [
    isDelivery,
    hasCustomer,
    hasAddress,
    customerDetails,
    openModal,
    order?.customerId,
    order?.customerName,
  ]);

  return {
    isDelivery,
    hasCustomer,
    hasAddress,
    deliveryNeedsCustomer: isDelivery && !hasCustomer,
    deliveryNeedsAddress: isDelivery && hasCustomer && !hasAddress,
  };
};
