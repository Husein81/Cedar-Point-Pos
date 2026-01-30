import { Icon, Shad } from "@repo/ui";
import { useRefundStore } from "@/store/refundStore";
import { format } from "date-fns";
import { useState } from "react";

export const RefundHistoryPanel = () => {
  const { refundHistory, refundHistoryLoading } = useRefundStore();
  const [toggle, setToggle] = useState(false);

  if (refundHistoryLoading) {
    return (
      <div className="px-4 py-3 border-t bg-muted/40">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Icon name="LoaderCircle" className="w-4 h-4 animate-spin" />
          Fetching refund history…
        </div>
      </div>
    );
  }

  return (
    <Shad.Collapsible className="border-t">
      {/* Header */}
      <Shad.CollapsibleTrigger
        onClick={() => setToggle(!toggle)}
        className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon name="RotateCcw" className="w-4 h-4 text-slate-600" />
          <span className="text-sm font-semibold text-slate-800">
            Refund History
          </span>

          <span className="px-2 py-0.5 text-xs rounded-full bg-slate-200 text-slate-700 font-medium">
            {refundHistory.length}
          </span>
        </div>
        <Icon
          name={toggle ? "ChevronUp" : "ChevronDown"}
          className="w-4 h-4 text-slate-600 transition-transform "
        />
      </Shad.CollapsibleTrigger>

      {/* Content */}
      <Shad.CollapsibleContent className="bg-slate-50/50 px-4 py-3 space-y-3">
        {refundHistory.map((refund) => (
          <div
            key={refund.id}
            className="
              rounded-lg border border-slate-200
              bg-background p-3
              shadow-sm
            "
          >
            {/* Top row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon name="Clock" className="w-3.5 h-3.5" />
                  {format(new Date(refund.refundedAt), "MMM d, yyyy • h:mm a")}
                </div>
                {refund.isPartialRefund && (
                  <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 border border-amber-500/30">
                    Partial
                  </span>
                )}
              </div>

              <div className="text-sm font-bold text-indigo-600">
                ${refund.totalAmount.toFixed(2)}
              </div>
            </div>

            {/* Reason */}
            {refund.reason && (
              <div className="mt-2 text-xs text-slate-700 bg-slate-100 border border-slate-200 rounded-md px-2 py-1">
                Reason: {refund.reason}
              </div>
            )}

            {/* Footer */}
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Icon name="PackageMinus" className="w-3.5 h-3.5" />
              {refund.itemCount} item
              {refund.itemCount !== 1 ? "s" : ""} refunded
            </div>
          </div>
        ))}
      </Shad.CollapsibleContent>
    </Shad.Collapsible>
  );
};
