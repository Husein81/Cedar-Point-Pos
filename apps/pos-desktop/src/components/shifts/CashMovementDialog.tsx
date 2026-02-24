import { useState } from "react";
import { Button, Icon, Input, Shad } from "@repo/ui";
import { useCreateCashMovement } from "@/hooks/useShifts";
import type { CashMovementDialogProps } from "@/dto/shift.dto";
import { toast } from "sonner";

export const CashMovementDialog = ({
  isOpen,
  onClose,
  shiftId,
}: CashMovementDialogProps) => {
  const createMovementMutation = useCreateCashMovement();
  const [type, setType] = useState<"CASH_IN" | "CASH_OUT">("CASH_IN");
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    try {
      await createMovementMutation.mutateAsync({
        shiftId,
        data: {
          type,
          amount: parsedAmount,
          reason: reason || undefined,
          idempotencyKey: crypto.randomUUID(),
        },
      });
      toast.success(`Cash ${type === "CASH_IN" ? "in" : "out"} recorded`);
      resetAndClose();
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Failed to record cash movement";
      toast.error(message);
    }
  };

  const resetAndClose = () => {
    setType("CASH_IN");
    setAmount("");
    setReason("");
    onClose();
  };

  return (
    <Shad.Dialog open={isOpen} onOpenChange={resetAndClose}>
      <Shad.DialogContent className="max-w-md">
        <Shad.DialogHeader>
          <Shad.DialogTitle className="flex items-center gap-2">
            <Icon name="ArrowLeftRight" className="h-5 w-5" />
            Cash Movement
          </Shad.DialogTitle>
          <Shad.DialogDescription>
            Record a manual cash-in or cash-out for this shift.
          </Shad.DialogDescription>
        </Shad.DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <div className="flex gap-2">
              <Button
                variant={type === "CASH_IN" ? "default" : "outline"}
                size="sm"
                onClick={() => setType("CASH_IN")}
              >
                <Icon name="ArrowDown" className="h-4 w-4 mr-1" />
                Cash In
              </Button>
              <Button
                variant={type === "CASH_OUT" ? "default" : "outline"}
                size="sm"
                onClick={() => setType("CASH_OUT")}
              >
                <Icon name="ArrowUp" className="h-4 w-4 mr-1" />
                Cash Out
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Amount</label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Reason (optional)</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for cash movement..."
            />
          </div>
        </div>

        <Shad.DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            isSubmitting={createMovementMutation.isPending}
          >
            <Icon name="Check" className="h-4 w-4 mr-1" />
            Record
          </Button>
        </Shad.DialogFooter>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
};
