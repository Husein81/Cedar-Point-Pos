import { useModalStore } from "@/store/modalStore";
import { useOrderStore } from "@/store/orderStore";
import { Button, Icon } from "@repo/ui";

type Props = {
  isConfirming: boolean;
  isFullyPaid: boolean;
  /**
   * Whether the order can be finalised. Owns the "a payment is required unless
   * nothing is due" rule so a fully discounted order stays confirmable.
   */
  canConfirm: boolean;
  handleConfirm: () => void;
  handlePayAndSend: () => void;
  offlineMode?: boolean;
};

export default function PaymentFooterActions({
  isConfirming,
  isFullyPaid,
  canConfirm,
  handleConfirm,
  handlePayAndSend,
  offlineMode = false,
}: Props) {
  const { closeModal } = useModalStore();
  const { getUnsentItems } = useOrderStore();

  const hasUnsentItems = getUnsentItems().length > 0;

  return (
    <div className="flex flex-col gap-2 pt-4 border-t mt-4">
      <div className="flex gap-2">
        <Button
          variant="outline"
          type="button"
          onClick={closeModal}
          disabled={isConfirming}
        >
          Cancel
        </Button>

        {/* When offline, "Pay & Send" is unavailable — kitchen requires connection */}
        {hasUnsentItems && !offlineMode ? (
          <>
            <Button
              variant="outline"
              onClick={handleConfirm}
              disabled={!canConfirm}
              isSubmitting={isConfirming}
              className="flex-1 text-base"
            >
              <Icon name="CreditCard" className="w-5 h-5 mr-2" />
              Pay Only
            </Button>
            <Button
              onClick={handlePayAndSend}
              disabled={!canConfirm}
              isSubmitting={isConfirming}
              className="flex-1 text-base"
            >
              <Icon name="ChefHat" className="w-5 h-5 mr-2" />
              Pay & Send
            </Button>
          </>
        ) : (
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
            isSubmitting={isConfirming}
            className="flex-1 text-base"
          >
            <Icon
              name={isFullyPaid ? "Check" : "Plus"}
              className="w-5 h-5 mr-2"
            />
            {isFullyPaid ? "Complete Order" : "Add Payment"}
          </Button>
        )}
      </div>

      {/* Offline notice */}
      {offlineMode && (
        <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <Icon name="WifiOff" className="w-3.5 h-3.5 shrink-0" />
          Payment will be queued offline and synced when you reconnect.
        </p>
      )}
    </div>
  );
}
