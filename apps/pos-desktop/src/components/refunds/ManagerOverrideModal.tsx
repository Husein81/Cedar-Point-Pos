import { Button, Icon, Shad, Textarea } from "@repo/ui";
import { useState } from "react";
import type { RefundWarning } from "@/dto/refund.dto";

interface ManagerOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (reason: string) => void;
  warnings: RefundWarning[];
  refundTotal: number;
  isProcessing?: boolean;
}

export const ManagerOverrideModal = ({
  isOpen,
  onClose,
  onApprove,
  warnings,
  refundTotal,
  isProcessing = false,
}: ManagerOverrideModalProps) => {
  const [reason, setReason] = useState("");

  const handleApprove = () => {
    if (reason.trim()) {
      onApprove(reason);
    }
  };

  const managerRequiredWarnings = warnings.filter(
    (w) => w.severity === "MANAGER_REQUIRED"
  );

  return (
    <Shad.Dialog open={isOpen} onOpenChange={onClose}>
      <Shad.DialogContent className="sm:max-w-md">
        <Shad.DialogHeader>
          <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-orange-100 grid place-items-center">
            <Icon name="ShieldAlert" className="h-6 w-6 text-orange-600" />
          </div>
          <Shad.DialogTitle className="text-center">
            Manager Override Required
          </Shad.DialogTitle>
          <Shad.DialogDescription className="text-center">
            This refund requires manager approval to proceed.
          </Shad.DialogDescription>
        </Shad.DialogHeader>

        <div className="space-y-4">
          {/* Warning List */}
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 space-y-2">
            <p className="text-sm font-semibold text-orange-800">
              Reasons requiring approval:
            </p>
            <ul className="space-y-1">
              {managerRequiredWarnings.map((warning) => (
                <li
                  key={warning.code}
                  className="text-sm text-orange-700 flex items-start gap-2"
                >
                  <Icon
                    name="AlertTriangle"
                    className="h-4 w-4 mt-0.5 shrink-0"
                  />
                  <span>{warning.message}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Refund Amount */}
          <div className="rounded-lg border bg-muted/50 p-3 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Refund Amount</span>
            <span className="text-lg font-bold text-destructive">
              ${refundTotal.toFixed(2)}
            </span>
          </div>

          {/* Override Reason */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Override Reason <span className="text-destructive">*</span>
            </label>
            <Textarea
              placeholder="Enter reason for override (required)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-20 resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This will be logged for audit purposes.
            </p>
          </div>
        </div>

        <Shad.DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleApprove}
            disabled={!reason.trim() || isProcessing}
          >
            {isProcessing ? (
              <>
                <Icon name="Loader2" className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Icon name="ShieldCheck" className="h-4 w-4 mr-2" />
                Approve Override
              </>
            )}
          </Button>
        </Shad.DialogFooter>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
};
