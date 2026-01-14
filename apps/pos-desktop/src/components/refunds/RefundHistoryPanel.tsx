import { Icon, Shad } from "@repo/ui";
import { useRefundStore } from "@/store/refundStore";
import { format } from "date-fns";

/**
 * Collapsible panel showing refund history for the selected order
 */
export const RefundHistoryPanel = () => {
  const { refundHistory, refundHistoryLoading } = useRefundStore();

  if (refundHistoryLoading) {
    return (
      <div className="px-4 py-2 border-t bg-muted/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon name="LoaderCircle" className="w-4 h-4 animate-spin" />
          Loading refund history...
        </div>
      </div>
    );
  }

  if (refundHistory.length === 0) return null;

  return (
    <Shad.Collapsible className="border-t">
      <Shad.CollapsibleTrigger className="w-full px-4 py-2 flex items-center justify-between bg-orange-50 hover:bg-orange-100 transition-colors">
        <div className="flex items-center gap-2">
          <Icon name="History" className="w-4 h-4 text-orange-600" />
          <span className="text-sm font-medium text-orange-700">
            Previous Refunds ({refundHistory.length})
          </span>
        </div>
        <Icon
          name="ChevronDown"
          className="w-4 h-4 text-orange-600 transition-transform [[data-state=open]>&]:rotate-180"
        />
      </Shad.CollapsibleTrigger>

      <Shad.CollapsibleContent className="px-4 py-2 bg-orange-50/50 space-y-2">
        {refundHistory.map((refund) => (
          <div
            key={refund.id}
            className="p-2 bg-background rounded-md border border-orange-200 text-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {format(new Date(refund.refundedAt), "MMM d, yyyy h:mm a")}
              </span>
              <span className="font-semibold text-orange-700">
                ${refund.totalAmount.toFixed(2)}
              </span>
            </div>
            {refund.reason && (
              <p className="text-xs text-muted-foreground mt-1 italic">
                "{refund.reason}"
              </p>
            )}
            <span className="text-xs text-muted-foreground">
              {refund.itemCount} item{refund.itemCount !== 1 ? "s" : ""}{" "}
              refunded
            </span>
          </div>
        ))}
      </Shad.CollapsibleContent>
    </Shad.Collapsible>
  );
};
