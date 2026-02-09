// OrderTypeSelector.tsx
import { useEffect, useRef, useState, useCallback } from "react";
import { useOrderStore } from "@/store/orderStore";
import { useModalStore } from "@/store/modalStore";
import { useCustomer, useUpdateCustomer } from "@/hooks/useCustomer";
import { OrderType } from "@repo/types";
import { Button, Icon, Textarea } from "@repo/ui";
import { CustomerSearchList } from "./CustomerSearchList";

/** Small inline form to collect a delivery address */
const DeliveryAddressPrompt = ({
  customerId,
  customerName,
}: {
  customerId: string;
  customerName: string;
}) => {
  const { closeModal } = useModalStore();
  const { setCustomer } = useOrderStore();
  const updateCustomer = useUpdateCustomer();
  const [address, setAddress] = useState("");

  const handleSave = useCallback(async () => {
    const trimmed = address.trim();
    if (!trimmed) return;

    try {
      await updateCustomer.mutateAsync({
        id: customerId,
        data: { address: trimmed },
      });
      // Persist on the local order too
      setCustomer(customerId, customerName, trimmed);
      closeModal();
    } catch (err) {
      console.error("Failed to update address:", err);
    }
  }, [
    address,
    closeModal,
    customerId,
    customerName,
    setCustomer,
    updateCustomer,
  ]);

  return (
    <div className="max-w-sm mx-auto flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{customerName}</span> does
        not have an address on file. Please add one to continue with delivery.
      </p>
      <Textarea
        placeholder="Enter delivery address..."
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className="h-24 resize-none text-sm"
        autoFocus
      />
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={closeModal}>
          Cancel
        </Button>
        <Button
          className="flex-1"
          disabled={!address.trim() || updateCustomer.isPending}
          isSubmitting={updateCustomer.isPending}
          onClick={handleSave}
        >
          <Icon name="MapPin" className="w-4 h-4 mr-1" />
          Save Address
        </Button>
      </div>
    </div>
  );
};

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
