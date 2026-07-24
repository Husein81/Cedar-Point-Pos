import { Button, Icon, Shad } from "@repo/ui";
import { useBaseCurrency } from "@/hooks/useCurrency";
import type { RefundLine } from "./config";

interface RefundConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  lines: RefundLine[];
  total: number;
  reason: string | undefined;
  isProcessing: boolean;
  isFullRefund: boolean;
}

/**
 * Confirmation modal for refund processing — shows the impact summary
 * before executing an irreversible refund.
 */
export const RefundConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  lines,
  total,
  reason,
  isProcessing,
  isFullRefund,
}: RefundConfirmModalProps) => {
  const { format: formatMoney } = useBaseCurrency();

  return (
    <Shad.AlertDialog open={isOpen} onOpenChange={onClose}>
      <Shad.AlertDialogContent className="max-w-md">
        <Shad.AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <Icon name="TriangleAlert" className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <Shad.AlertDialogTitle className="text-lg">
                Confirm {isFullRefund ? "Full" : "Partial"} Refund
              </Shad.AlertDialogTitle>
              <Shad.AlertDialogDescription className="text-sm">
                This action cannot be undone
              </Shad.AlertDialogDescription>
            </div>
          </div>
        </Shad.AlertDialogHeader>

        {/* Summary */}
        <div className="my-4 p-4 bg-muted rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <span
              className={
                isFullRefund
                  ? "inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-destructive/20 text-destructive border border-destructive/30"
                  : "inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30"
              }
            >
              <Icon name="RotateCcw" className="w-3 h-3" />
              {isFullRefund ? "Full Refund" : "Partial Refund"}
            </span>
            <span className="text-xs text-muted-foreground">
              {lines.length} item{lines.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Items */}
          <div>
            <span className="text-xs font-medium text-muted-foreground uppercase">
              Items to Refund
            </span>
            <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
              {lines.map((line) => (
                <div
                  key={line.orderItemId}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="truncate flex-1">
                    <span>{line.productName}</span>
                    {line.refundQuantity < line.quantity ? (
                      <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">
                        (partial: {line.refundQuantity} of {line.quantity})
                      </span>
                    ) : (
                      <span className="ml-1 text-xs text-muted-foreground">
                        × {line.refundQuantity}
                      </span>
                    )}
                  </div>
                  <span className="font-medium ml-2 tabular-nums">
                    {formatMoney(line.lineTotal)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Reason */}
          {reason && (
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase">
                Reason
              </span>
              <p className="text-sm mt-1">{reason}</p>
            </div>
          )}

          {/* Total */}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Refund Total</span>
              <span className="text-xl font-bold text-destructive tabular-nums">
                {formatMoney(total)}
              </span>
            </div>
          </div>
        </div>

        {/* Impact note */}
        <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-sm">
          <Icon name="Info" className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <strong>Important:</strong> This will:
            <ul className="mt-1 ml-4 list-disc text-xs">
              <li>Return {formatMoney(total)} to the customer</li>
              <li>Restore inventory for refunded items</li>
              <li>Update order status to reflect the refund</li>
              <li>
                Restore redeemed loyalty points &amp; reverse earned points
              </li>
            </ul>
          </div>
        </div>

        <Shad.AlertDialogFooter className="mt-4">
          <Shad.AlertDialogCancel asChild>
            <Button variant="outline" disabled={isProcessing}>
              Cancel
            </Button>
          </Shad.AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isProcessing}
            isSubmitting={isProcessing}
          >
            <Icon name="RotateCcw" className="w-4 h-4 mr-2" />
            Confirm Refund
          </Button>
        </Shad.AlertDialogFooter>
      </Shad.AlertDialogContent>
    </Shad.AlertDialog>
  );
};
