import { Icon, Shad, Skeleton } from "@repo/ui";
import { useXReport } from "@/hooks/useShifts";
import type { ShiftXReportPanelProps } from "@/dto/shift.dto";

const formatCurrency = (value: number) => {
  return `$${value.toFixed(2)}`;
};

const formatDateTime = (date: string) => {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const ShiftXReportPanel = ({ shiftId }: ShiftXReportPanelProps) => {
  const { data: report, isLoading } = useXReport(shiftId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Icon name="FileX" className="h-8 w-8 mx-auto mb-2" />
        <p>No X Report data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="FileText" className="h-5 w-5" />
          <h3 className="text-lg font-semibold">X Report</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          Generated {formatDateTime(report.generatedAt)}
        </span>
      </div>

      {/* Shift Info */}
      <div className="grid grid-cols-2 gap-3">
        <Shad.Card className="p-3">
          <p className="text-xs text-muted-foreground">Start Time</p>
          <p className="text-sm font-medium">
            {formatDateTime(report.startTime)}
          </p>
        </Shad.Card>
        <Shad.Card className="p-3">
          <p className="text-xs text-muted-foreground">Starting Cash</p>
          <p className="text-sm font-semibold">
            {formatCurrency(report.startCash)}
          </p>
        </Shad.Card>
      </div>

      {/* Sales Totals */}
      <div className="grid grid-cols-3 gap-3">
        <Shad.Card className="p-3">
          <p className="text-xs text-muted-foreground">Gross Sales</p>
          <p className="text-sm font-semibold text-green-600">
            {formatCurrency(report.totals.grossSales)}
          </p>
        </Shad.Card>
        <Shad.Card className="p-3">
          <p className="text-xs text-muted-foreground">Refunds</p>
          <p className="text-sm font-semibold text-destructive">
            {formatCurrency(report.totals.totalRefunds)}
          </p>
        </Shad.Card>
        <Shad.Card className="p-3">
          <p className="text-xs text-muted-foreground">Net Sales</p>
          <p className="text-sm font-semibold">
            {formatCurrency(report.totals.netSales)}
          </p>
        </Shad.Card>
      </div>

      {/* Expected Cash */}
      <Shad.Card className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Expected Cash in Drawer</p>
          <p className="text-lg font-bold">
            {formatCurrency(report.expectedCash)}
          </p>
        </div>
      </Shad.Card>

      {/* Orders Summary */}
      {report.orders.totalCount > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">
            Orders ({report.orders.totalCount})
          </h4>
          <div className="flex flex-wrap gap-2">
            {report.orders.byStatus.map((o) => (
              <Shad.Card key={o.status} className="px-3 py-2">
                <span className="text-xs text-muted-foreground">
                  {o.status}
                </span>
                <span className="ml-2 text-sm font-semibold">{o.count}</span>
              </Shad.Card>
            ))}
          </div>
        </div>
      )}

      {/* Payment Summary */}
      {report.paymentSummary.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Payment Breakdown</h4>
          <div className="space-y-1">
            {report.paymentSummary.map((ps) => (
              <div
                key={ps.method}
                className="flex items-center justify-between rounded-md border p-2 text-sm"
              >
                <span className="font-medium">{ps.method}</span>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-green-600">
                    {ps.salesCount} sales ({formatCurrency(ps.salesTotal)})
                  </span>
                  {ps.refundsCount > 0 && (
                    <span className="text-destructive">
                      {ps.refundsCount} refunds (
                      {formatCurrency(ps.refundsTotal)})
                    </span>
                  )}
                  <span className="font-semibold">
                    Net: {formatCurrency(ps.netTotal)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cash Breakdown */}
      {report.cashBreakdown && Object.keys(report.cashBreakdown).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Cash Movements by Type</h4>
          <div className="space-y-1">
            {Object.entries(report.cashBreakdown).map(([type, amount]) => (
              <div
                key={type}
                className="flex items-center justify-between rounded-md border p-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Icon
                    name={
                      type.includes("IN") || type.includes("SALE")
                        ? "ArrowDown"
                        : "ArrowUp"
                    }
                    className={`h-4 w-4 ${
                      type.includes("IN") || type.includes("SALE")
                        ? "text-green-600"
                        : "text-destructive"
                    }`}
                  />
                  <span>{type.replace(/_/g, " ")}</span>
                </div>
                <span className="font-medium">{formatCurrency(amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
