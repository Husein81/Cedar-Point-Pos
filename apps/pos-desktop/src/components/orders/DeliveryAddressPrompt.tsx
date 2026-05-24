import { useUpdateCustomer } from "@/hooks/useCustomer";
import { useModalStore } from "@/store/modalStore";
import { useOrderStore } from "@/store/orderStore";
import { Button, Icon, Textarea } from "@repo/ui";
import { useCallback, useState } from "react";

export const DeliveryAddressPrompt = ({
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
