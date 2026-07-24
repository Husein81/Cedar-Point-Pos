import { useState } from "react";
import { Icon, Shad } from "@repo/ui";
import { format } from "date-fns";
import type { RefundHistory } from "@/dto/refund.dto";
import { useBaseCurrency } from "@/hooks/useCurrency";

interface RefundHistoryPanelProps {
  history: RefundHistory[];
}

export const RefundHistoryPanel = ({ history }: RefundHistoryPanelProps) => {
  const [open, setOpen] = useState(false);
  const { format: formatMoney } = useBaseCurrency();

  return (
    <Shad.Collapsible className="rounded-lg border overflow-hidden">
      <Shad.CollapsibleTrigger
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between bg-muted/40 hover:bg-muted/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon name="History" className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Refund History</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground font-medium">
            {history.length}
          </span>
        </div>
        <Icon
          name={open ? "ChevronUp" : "ChevronDown"}
          className="w-4 h-4 text-muted-foreground"
        />
      </Shad.CollapsibleTrigger>

      <Shad.CollapsibleContent className="bg-muted/20 px-4 py-3 space-y-3">
        {history.map((refund) => (
          <div
            key={refund.id}
            className="rounded-lg border bg-background p-3 shadow-sm"
          >
            {/* Date + amount */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon name="Clock" className="w-3.5 h-3.5" />
                  {format(new Date(refund.refundedAt), "MMM d, yyyy • h:mm a")}
                </div>
                {refund.isPartialRefund && (
                  <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                    Partial
                  </span>
                )}
              </div>

              <div className="text-sm font-bold text-destructive tabular-nums">
                -{formatMoney(refund.totalAmount)}
              </div>
            </div>

            {/* Refunded items */}
            {refund.items.length > 0 && (
              <div className="mt-2 space-y-0.5">
                {refund.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-xs text-muted-foreground"
                  >
                    <span className="truncate">
                      {item.quantity} × {item.productName}
                    </span>
                    <span className="tabular-nums ml-2">
                      {formatMoney(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Reason */}
            {refund.reason && (
              <div className="mt-2 text-xs text-muted-foreground bg-muted/40 border rounded-md px-2 py-1">
                Reason: {refund.reason}
              </div>
            )}
          </div>
        ))}
      </Shad.CollapsibleContent>
    </Shad.Collapsible>
  );
};
