import { useModalStore } from "@/store/modalStore";
import { useOrderStore } from "@/store/orderStore";
import { Button, Icon } from "@repo/ui";
import { PaymentEntry } from ".";

type Props = {
  isConfirming: boolean;
  isFullyPaid: boolean;
  payments: PaymentEntry[];
  handleConfirm: () => void;
  handlePayAndSend: () => void;
};

export default function PaymentFooterActions({
  isConfirming,
  isFullyPaid,
  payments,
  handleConfirm,
  handlePayAndSend,
}: Props) {
  const { closeModal } = useModalStore();
  const { getUnsentItems } = useOrderStore();

  const hasUnsentItems = getUnsentItems().length > 0;

  return (
    <div className="flex pt-4 gap-2 border-t mt-4">
      <Button
        variant="outline"
        type="button"
        onClick={closeModal}
        disabled={isConfirming}
      >
        Cancel
      </Button>

      {hasUnsentItems ? (
        <>
          <Button
            variant="outline"
            onClick={handleConfirm}
            disabled={!isFullyPaid || payments.length === 0 || isConfirming}
            isSubmitting={isConfirming}
            className="flex-1 text-base"
          >
            <Icon name="CreditCard" className="w-5 h-5 mr-2" />
            Pay Only
          </Button>
          <Button
            onClick={handlePayAndSend}
            disabled={!isFullyPaid || payments.length === 0 || isConfirming}
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
          disabled={!isFullyPaid || payments.length === 0 || isConfirming}
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
  );
}
