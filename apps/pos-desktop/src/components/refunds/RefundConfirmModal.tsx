import { Button, Icon, Shad } from "@repo/ui";
import { RefundCartItem } from "@/store/refundStore";

interface RefundConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  items: RefundCartItem[];
  total: number;
  reason: string;
  isProcessing: boolean;
  isFullRefund: boolean;
}

/**
 * Confirmation modal for refund processing
 * Shows warning and summary before executing refund
 */
export const RefundConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  items,
  total,
  reason,
  isProcessing,
  isFullRefund,
}: RefundConfirmModalProps) => {
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

        {/* Refund Summary */}
        <div className="my-4 p-4 bg-muted rounded-lg space-y-3">
          {/* Refund Type Badge */}
          <div className="flex items-center gap-2">
            {isFullRefund ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-destructive/20 text-destructive border border-destructive/30">
                <Icon name="RotateCcw" className="w-3 h-3" />
                Full Refund
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-amber-500/20 text-amber-700 border border-amber-500/30">
                <Icon name="RotateCcw" className="w-3 h-3" />
                Partial Refund
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {items.length} item{items.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Items being refunded */}
          <div>
            <span className="text-xs font-medium text-muted-foreground uppercase">
              Items to Refund
            </span>
            <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.orderItemId}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="truncate flex-1">
                    <span>{item.productName}</span>
                    {item.refundQuantity < item.originalQuantity && (
                      <span className="ml-1 text-xs text-amber-600">
                        (partial: {item.refundQuantity} of{" "}
                        {item.originalQuantity})
                      </span>
                    )}
                    {item.refundQuantity === item.originalQuantity && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        × {item.refundQuantity}
                      </span>
                    )}
                  </div>
                  <span className="font-medium ml-2">
                    ${item.lineTotal.toFixed(2)}
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
              <span className="text-xl font-bold text-destructive">
                ${total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          <Icon name="Info" className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <strong>Important:</strong> This will:
            <ul className="mt-1 ml-4 list-disc text-xs">
              <li>Return ${total.toFixed(2)} to the customer</li>
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
